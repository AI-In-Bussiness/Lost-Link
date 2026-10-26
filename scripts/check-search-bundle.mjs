// Exercise only files Next.js traced for the deployed search route, in an isolated directory.
import { readFile, mkdtemp, mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const trace = join(root, '.next/server/app/api/v1/organizations/[orgSlug]/search/route.js.nft.json');
const files = JSON.parse(await readFile(trace, 'utf8')).files;
const temporary = await mkdtemp(join(tmpdir(), 'lostlink-search-bundle-'));
try {
  for (const file of files) {
    const source = resolve(dirname(trace), file);
    const rel = relative(root, source);
    if (rel.startsWith('..')) throw new Error('Trace leaves repository');
    const target = join(temporary, rel);
    await mkdir(dirname(target), {recursive: true});
    await cp(source, target, {recursive:true, dereference:true});
  }
  await writeFile(join(temporary, 'smoke.mjs'), `
    import { Worker } from 'node:worker_threads';
    import { join } from 'node:path';
    const worker = new Worker(join(process.cwd(), 'src/lib/search/local-worker.mjs'), {workerData:{modelDir:join(process.cwd(),'models/all-MiniLM-L6-v2')}});
    const timer=setTimeout(()=>{worker.terminate();process.exit(1);},15000);
    worker.once('error',()=>{clearTimeout(timer);process.exit(1);});
    worker.once('message',async result=>{
      clearTimeout(timer);
      await worker.terminate();
      process.exit(result.vectors?.length===2 && result.vectors.every(v=>v.length===384) ? 0 : 1);
    });
    worker.postMessage(['rucksack','Black athletic backpack']);
  `);
  const result = spawnSync(process.execPath, ['smoke.mjs'], {cwd:temporary, stdio:'inherit', timeout:20000});
  if (result.status !== 0) throw new Error('Traced local inference bundle failed');
  console.log('Traced search bundle runs local CPU embeddings without runtime network.');
} finally { await rm(temporary, {recursive:true, force:true}); }
