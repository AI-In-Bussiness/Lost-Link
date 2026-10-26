import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import manifest from './model-manifest.json' with { type: 'json' };

// No runtime download or remote inference, even if a library default changes.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useFSCache = false;
globalThis.fetch = async () => { throw new Error('Network disabled in local inference worker'); };
let extractor;
async function load() {
  for (const file of manifest.files) {
    const bytes = await readFile(join(workerData.modelDir, file.path));
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256)
      throw new Error('Local model integrity check failed');
  }
  return pipeline('feature-extraction', workerData.modelDir, {
    local_files_only: true, dtype: 'q8', device: 'cpu',
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
}
parentPort.on('message', async (input) => {
  try {
    extractor ??= await load();
    const vectors = [];
    for (let start = 0; start < input.length; start += 4) {
      const result = await extractor(input.slice(start, start + 4), {
        pooling: 'mean', normalize: true, truncation: true, max_length: 256,
      });
      vectors.push(...result.tolist());
    }
    parentPort.postMessage({ vectors });
  } catch { parentPort.postMessage({ error: true }); }
});
