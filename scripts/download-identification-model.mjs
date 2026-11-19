import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPinnedModelFiles } from './download-search-model.mjs';
import model from '../src/lib/photos/model-manifest.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
const modelRoot = join(root, 'models/yolox-nano');
const verifyOnly = process.argv.includes('--verify-only');

try {
  await installPinnedModelFiles({
    files: [model],
    modelRoot,
    cacheRoot: join(root, '.next/cache/lostlink-model', model.sha256),
    assetUrl: () => new URL(model.source),
    verifyOnly,
  });
  if (!verifyOnly) await copyFile(join(root, 'docs/third-party/YOLOX-LICENSE.txt'), join(modelRoot, 'LICENSE'));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
