import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installModelAssets } from '../scripts/download-search-model.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'lostlink-model-download-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const body = Buffer.from('Pinned model bytes for download and integrity regressions.');
  const manifest = { repository: 'test/model', revision: 'a'.repeat(40), files: [{ path: 'onnx/model_quantized.onnx', bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') }] };
  await mkdir(join(root, 'src/lib/search'), { recursive: true });
  await mkdir(join(root, 'docs/phase-4'), { recursive: true });
  await writeFile(join(root, 'src/lib/search/model-manifest.json'), JSON.stringify(manifest));
  await writeFile(join(root, 'docs/phase-4/LICENSE-MINILM.txt'), 'test license');
  await writeFile(join(root, 'docs/phase-4/THIRD-PARTY-NOTICES.md'), 'test notices');
  const destination = join(root, 'models/all-MiniLM-L6-v2', manifest.files[0].path);
  const cached = join(root, '.next/cache/lostlink-model', manifest.revision, manifest.files[0].path);
  const options = { root, log: () => {}, waitBeforeRetry: async () => {} };
  return { root, body, manifest, destination, cached, options };
}

test('retries transient status and refreshes CDN redirects before publishing verified model/cache', async t => {
  const f = await fixture(t), urls = [], waits = [];
  await installModelAssets({ ...f.options, waitBeforeRetry: async ms => waits.push(ms), fetcher: async (url, init) => {
    urls.push(new URL(url));
    assert.ok(init.signal);
    assert.equal(init.cache, 'no-store');
    return urls.length === 1 ? new Response('temporary', { status: 503 }) : urls.length === 2 ? new Response('expired redirect', { status: 403 }) : new Response(f.body);
  } });
  assert.equal(urls.length, 3);
  assert.equal(urls[0].search, '');
  for (const url of urls) assert.equal(url.pathname, `/test/model/resolve/${f.manifest.revision}/onnx/model_quantized.onnx`);
  assert.equal(urls[1].searchParams.get('download'), 'true');
  assert.notEqual(urls[1].searchParams.get('lostlink_retry'), urls[2].searchParams.get('lostlink_retry'));
  assert.deepEqual(waits, [500, 1000]);
  assert.deepEqual(await readFile(f.destination), f.body);
  assert.deepEqual(await readFile(f.cached), f.body);
  assert.equal(await readFile(join(f.root, 'models/all-MiniLM-L6-v2/LICENSE'), 'utf8'), 'test license');
  assert.equal(await readFile(join(f.root, 'models/all-MiniLM-L6-v2/NOTICE.md'), 'utf8'), 'test notices');
});

test('a restored build cache installs the model with no network request', async t => {
  const f = await fixture(t);
  await installModelAssets({ ...f.options, fetcher: async () => new Response(f.body) });
  await rm(join(f.root, 'models'), { recursive: true });
  await installModelAssets({ ...f.options, fetcher: async () => { assert.fail('Verified build cache must avoid the network'); } });
  assert.deepEqual(await readFile(f.destination), f.body);
});

test('corrupt cached bytes cannot replace a pinned asset', async t => {
  const f = await fixture(t);
  await mkdir(join(f.cached, '..'), { recursive: true });
  await writeFile(f.cached, Buffer.alloc(f.body.length));
  let requests = 0;
  await installModelAssets({ ...f.options, fetcher: async () => { requests++; return new Response(f.body); } });
  assert.equal(requests, 1);
  assert.deepEqual(await readFile(f.destination), f.body);
  assert.deepEqual(await readFile(f.cached), f.body);
});

test('valid existing runtime files populate the reusable cache without downloading', async t => {
  const f = await fixture(t);
  await mkdir(join(f.destination, '..'), { recursive: true });
  await writeFile(f.destination, f.body);
  await installModelAssets({ ...f.options, fetcher: async () => { assert.fail('Existing verified asset must not download'); } });
  assert.deepEqual(await readFile(f.cached), f.body);
});

test('bad checksum, truncation and oversize exhaust bounded retries and never publish partial files', async t => {
  for (const kind of ['checksum', 'truncated', 'oversize']) {
    const f = await fixture(t);
    const invalid = kind === 'checksum' ? Buffer.alloc(f.body.length) : kind === 'truncated' ? f.body.subarray(0, -1) : Buffer.concat([f.body, Buffer.from('x')]);
    let requests = 0;
    await assert.rejects(installModelAssets({ ...f.options, fetcher: async () => { requests++; return new Response(invalid); } }), /attempt 3\/3/);
    assert.equal(requests, 3);
    await assert.rejects(stat(f.destination), { code: 'ENOENT' });
    await assert.rejects(stat(f.cached), { code: 'ENOENT' });
    assert.ok((await readdir(f.root, { recursive: true })).every(path => !path.endsWith('.partial')));
  }
});

test('an interrupted stream retries into a clean temporary file', async t => {
  const f = await fixture(t);
  let requests = 0;
  await installModelAssets({ ...f.options, fetcher: async () => {
    requests++;
    if (requests > 1) return new Response(f.body);
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(f.body.subarray(0, 5)); controller.error(new Error('SENSITIVE_SENTINEL')); } }));
  } });
  assert.equal(requests, 2);
  assert.deepEqual(await readFile(f.destination), f.body);
  assert.ok((await readdir(f.root, { recursive: true })).every(path => !path.endsWith('.partial')));
});

test('rate limits have bounded backoff and actionable status/file diagnostics', async t => {
  const f = await fixture(t), waits = [], logs = [];
  let requests = 0;
  await assert.rejects(installModelAssets({ ...f.options, log: text => logs.push(text), waitBeforeRetry: async ms => waits.push(ms), fetcher: async () => {
    requests++; return new Response('SENSITIVE_SENTINEL', { status: 429, headers: { 'retry-after': '3600' } });
  } }), /model_quantized\.onnx failed \(HTTP 429; attempt 3\/3\)/);
  assert.equal(requests, 3);
  assert.deepEqual(waits, [30000, 30000]);
  assert.ok(!logs.join().includes('SENSITIVE_SENTINEL'));
});

test('permanent errors fail immediately and response bodies are not logged', async t => {
  const f = await fixture(t);
  let requests = 0;
  await assert.rejects(installModelAssets({ ...f.options, fetcher: async () => { requests++; return new Response('SENSITIVE_SENTINEL', { status: 404 }); } }), error => error.message.includes('HTTP 404') && !error.message.includes('SENSITIVE_SENTINEL'));
  assert.equal(requests, 1);
});

test('timeouts and network errors retry without disclosing raw signed URLs or errors', async t => {
  const f = await fixture(t), logs = [];
  let requests = 0;
  await installModelAssets({ ...f.options, log: text => logs.push(text), fetcher: async () => {
    requests++;
    if (requests === 1) throw new DOMException('SENSITIVE_SENTINEL', 'TimeoutError');
    if (requests === 2) throw new TypeError('https://cdn.example/?token=SENSITIVE_SENTINEL');
    return new Response(f.body);
  } });
  assert.equal(requests, 3);
  assert.ok(!logs.join().includes('SENSITIVE_SENTINEL'));
});

test('verify-only neither downloads nor installs from cache', async t => {
  const f = await fixture(t);
  await installModelAssets({ ...f.options, fetcher: async () => new Response(f.body) });
  await installModelAssets({ ...f.options, verifyOnly: true, fetcher: async () => { assert.fail('Verify-only must not download'); } });
  await rm(join(f.root, 'models'), { recursive: true });
  await assert.rejects(installModelAssets({ ...f.options, verifyOnly: true, fetcher: async () => { assert.fail('Verify-only must not download'); } }), /Missing or invalid pinned model/);
  await assert.rejects(stat(f.destination), { code: 'ENOENT' });
});

test('a cache write failure does not invalidate an already verified runtime asset', async t => {
  const f = await fixture(t), logs = [];
  await writeFile(join(f.root, '.next'), 'not a cache directory');
  await installModelAssets({ ...f.options, log: text => logs.push(text), fetcher: async () => new Response(f.body) });
  assert.deepEqual(await readFile(f.destination), f.body);
  assert.ok(logs.some(text => text.startsWith('Could not cache')));
});
