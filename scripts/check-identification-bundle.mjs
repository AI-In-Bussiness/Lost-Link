// Exercise the local worker with only files Next.js traced for identification.
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const app = join(root, '.next/server/app');
const trace = join(app, 'api/v1/organizations/[orgSlug]/staff/items/identify/route.js.nft.json');
const { files } = JSON.parse(await readFile(trace, 'utf8'));
for (const entry of await readdir(app, { recursive: true })) {
  const routeTrace = join(app, entry);
  if (routeTrace === trace || !entry.endsWith('route.js.nft.json')) continue;
  const otherFiles = JSON.parse(await readFile(routeTrace, 'utf8')).files;
  if (otherFiles.some((path) => /[/\\](?:yolox-nano[/\\]|photos[/\\]local-worker\.mjs$)/.test(path))) {
    throw new Error(`Item identification assets were traced into ${entry}.`);
  }
}
const temporary = await mkdtemp(join(tmpdir(), 'lostlink-identification-bundle-'));

try {
  for (const file of files) {
    const source = resolve(dirname(trace), file);
    const localPath = relative(root, source);
    if (isAbsolute(localPath) || localPath === '..' || localPath.startsWith(`..${sep}`)) {
      throw new Error('Identification trace leaves the repository.');
    }
    const destination = join(temporary, localPath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, dereference: true });
  }

  await writeFile(join(temporary, 'smoke.mjs'), `
    import assert from 'node:assert/strict';
    import { stat } from 'node:fs/promises';
    import { join } from 'node:path';
    import { once } from 'node:events';
    import { Worker } from 'node:worker_threads';
    import model from './src/lib/photos/model-manifest.json' with { type: 'json' };

    const modelPath = join(process.cwd(), 'models/yolox-nano', model.path);
    assert.equal((await stat(modelPath)).size, model.bytes);
    await stat(join(process.cwd(), 'models/yolox-nano/LICENSE'));
    const worker = new Worker(new URL('./src/lib/photos/local-worker.mjs', import.meta.url), { workerData: { modelPath } });
    try {
      const result = once(worker, 'message', { signal: AbortSignal.timeout(15_000) });
      worker.postMessage(new Float32Array(3 * 416 * 416).fill(114));
      const [boxes] = await result;
      assert.ok(boxes instanceof Float32Array);
      assert.equal(boxes.length, 3549 * 85);
      assert.ok(boxes.every(Number.isFinite));
    } finally {
      await worker.terminate();
    }
  `);

  const result = spawnSync(process.execPath, ['smoke.mjs'], {
    cwd: temporary, stdio: 'inherit', timeout: 20_000,
    env: { ...process.env, ORT_DISABLE_TELEMETRY: '1' },
  });
  if (result.status !== 0) throw new Error('Traced identification worker or model failed.');
  console.log('Traced item identification bundle runs the pinned YOLOX model locally.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
