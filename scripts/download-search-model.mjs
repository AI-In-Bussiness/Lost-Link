// One-time public asset download. Node 24 --use-env-proxy preserves managed proxy/CA settings.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, open, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'src/lib/search/model-manifest.json'), 'utf8'));
for (const entry of manifest.files) {
  const path = join(root, 'models/all-MiniLM-L6-v2', entry.path);
  const valid = await readFile(path).then(bytes => bytes.length === entry.bytes && createHash('sha256').update(bytes).digest('hex') === entry.sha256, () => false);
  if (valid) { console.log(`Verified ${entry.path}`); continue; }
  if (process.argv.includes('--verify-only')) throw new Error(`Missing or invalid pinned model: ${entry.path}`);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.partial`;
  try {
    const response = await fetch(`https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${entry.path}`, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) throw new Error('Model asset download failed');
    const file = await open(temporary, 'wx');
    const digest = createHash('sha256');
    let size = 0;
    try {
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > entry.bytes) throw new Error('Model exceeds pinned size');
        digest.update(chunk);
        await file.writeFile(chunk);
      }
    } finally { await file.close(); }
    if (size !== entry.bytes || digest.digest('hex') !== entry.sha256) throw new Error('Model checksum mismatch');
    await rename(temporary, path);
    console.log(`Downloaded and verified ${entry.path}`);
  } finally { await rm(temporary, { force: true }); }
}

await copyFile(join(root, 'docs/phase-4/LICENSE-MINILM.txt'), join(root, 'models/all-MiniLM-L6-v2/LICENSE'));
await copyFile(join(root, 'docs/phase-4/THIRD-PARTY-NOTICES.md'), join(root, 'models/all-MiniLM-L6-v2/NOTICE.md'));
