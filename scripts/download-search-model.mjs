// Public pinned assets only. Node 24 --use-env-proxy preserves managed proxy/CA settings.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, open, copyFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const attempts = 3;

class DownloadFailure extends Error {
  constructor(reason, retryable = true, retryAfter = 0) {
    super(reason);
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

async function verified(path, entry) {
  return readFile(path).then(bytes => bytes.length === entry.bytes && createHash('sha256').update(bytes).digest('hex') === entry.sha256, () => false);
}

async function atomicCopy(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.partial`;
  try {
    await copyFile(source, temporary);
    await rename(temporary, destination);
  } finally { await rm(temporary, { force: true }); }
}

async function download(entry, manifest, destination, { fetcher, waitBeforeRetry, log }) {
  await mkdir(dirname(destination), { recursive: true });
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const temporary = `${destination}.${randomUUID()}.partial`;
    try {
      const url = new URL(`https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${entry.path}`);
      if (attempt > 1) {
        // Refresh an expired CDN redirect rather than retrying its signed URL.
        url.searchParams.set('download', 'true');
        url.searchParams.set('lostlink_retry', randomUUID());
      }
      const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(120_000) });
      if (!response.ok) {
        await response.body?.cancel();
        const retryable = [403, 408, 425, 429].includes(response.status) || response.status >= 500;
        const seconds = Number(response.headers.get('retry-after'));
        throw new DownloadFailure(`HTTP ${response.status}`, retryable, Number.isFinite(seconds) ? Math.min(30_000, Math.max(0, seconds * 1000)) : 0);
      }
      if (!response.body) throw new DownloadFailure('empty response body');
      const file = await open(temporary, 'wx');
      const digest = createHash('sha256');
      let size = 0;
      try {
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > entry.bytes) throw new DownloadFailure('asset exceeds pinned size');
          digest.update(chunk);
          await file.writeFile(chunk);
        }
      } finally { await file.close(); }
      if (size !== entry.bytes || digest.digest('hex') !== entry.sha256) throw new DownloadFailure('asset size/checksum mismatch');
      await rename(temporary, destination);
      return;
    } catch (error) {
      // Never print upstream URLs, signed query strings, response bodies or raw errors.
      const reason = error instanceof DownloadFailure ? error.message : 'request or file transfer failed';
      const retryable = error instanceof DownloadFailure ? error.retryable : ['AbortError', 'TimeoutError'].includes(error.name) || !error.code || String(error.code).startsWith('UND_ERR');
      if (!retryable || attempt === attempts) throw new Error(`Model asset ${entry.path} failed (${reason}; attempt ${attempt}/${attempts}).`);
      log(`Retrying ${entry.path} after ${reason} (${attempt + 1}/${attempts}).`);
      await waitBeforeRetry(Math.max(500 * 2 ** (attempt - 1), error.retryAfter || 0));
    } finally { await rm(temporary, { force: true }); }
  }
}

export async function installModelAssets({ root = projectRoot, verifyOnly = false, fetcher = fetch, waitBeforeRetry = pause, log = console.log } = {}) {
  const manifest = JSON.parse(await readFile(join(root, 'src/lib/search/model-manifest.json'), 'utf8'));
  const modelRoot = join(root, 'models/all-MiniLM-L6-v2');
  // Vercel restores .next/cache between Next.js builds; runtime inference stays offline.
  const cacheRoot = join(root, '.next/cache/lostlink-model', manifest.revision);
  for (const entry of manifest.files) {
    const destination = join(modelRoot, entry.path);
    const cached = join(cacheRoot, entry.path);
    if (await verified(destination, entry)) {
      log(`Verified ${entry.path}`);
    } else {
      if (verifyOnly) throw new Error(`Missing or invalid pinned model: ${entry.path}`);
      if (await verified(cached, entry)) {
        await atomicCopy(cached, destination);
        log(`Restored and verified ${entry.path} from build cache`);
      } else {
        await download(entry, manifest, destination, { fetcher, waitBeforeRetry, log });
        log(`Downloaded and verified ${entry.path}`);
      }
    }
    if (!verifyOnly && !(await verified(cached, entry))) {
      // A cache-write failure must not discard an already verified runtime asset.
      try { await atomicCopy(destination, cached); }
      catch { log(`Could not cache ${entry.path}; the verified model asset is installed.`); }
    }
  }
  if (!verifyOnly) {
    await copyFile(join(root, 'docs/phase-4/LICENSE-MINILM.txt'), join(modelRoot, 'LICENSE'));
    await copyFile(join(root, 'docs/phase-4/THIRD-PARTY-NOTICES.md'), join(modelRoot, 'NOTICE.md'));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await installModelAssets({ verifyOnly: process.argv.includes('--verify-only') }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
