import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  outputFileTracingIncludes: {
    '/api/v1/organizations/*/search': [
      './src/lib/search/local-worker.mjs', './src/lib/search/model-manifest.json', './models/all-MiniLM-L6-v2/**/*',
      './node_modules/@huggingface/transformers/dist/transformers.node.mjs',
      './node_modules/@huggingface/transformers/package.json',
       './node_modules/onnxruntime-node/dist/**/*', './node_modules/onnxruntime-node/package.json',
      `./node_modules/onnxruntime-node/bin/napi-v6/${process.platform}/${process.arch}/*`,
      './node_modules/onnxruntime-common/**/*', './node_modules/sharp/**/*', './node_modules/@img/**/*',
      './node_modules/detect-libc/**/*', './node_modules/semver/**/*',
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default nextConfig;
