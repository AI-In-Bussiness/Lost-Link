# Phase 02 — Local model packaging

## Metadata

- **Agent** `codex-identify-endpoint`
- **Founder version** `unassigned`
- **Phase** 02 — Local model packaging
- **Status** Completed
- **Date (UTC)** 2026-11-19
- **Task** [Issue 58, solve with no API costs](https://github.com/AI-In-Bussiness/Lost-Link/issues/58), part of [issue 54](https://github.com/AI-In-Bussiness/Lost-Link/issues/54)
- **Branch and base** `work`, based on `a5e4306`

## Objective and scope

Install and verify the public model at build time. Make the identification route self-contained for local inference in deployment. The provider and browser integration were separate agent assignments.

## Work performed

- Evaluated closed-category MobileNet, zero-shot CLIP, and caption-generating Florence and SmolVLM models for artifact size, class coverage, and licensing. The team selected YOLOX Nano for its small model, localized object detections, and Apache 2.0 license.
- Pinned the official 3,659,407-byte YOLOX Nano ONNX file from release `0.1.1rc0` and its SHA-256 in `src/lib/photos/model-manifest.json`. Added the upstream license to `docs/third-party/YOLOX-LICENSE.txt` and ship it alongside the model.
- Added `scripts/download-identification-model.mjs` using the existing installer for bounded reads, digest verification, atomic writes, retries, and build-cache recovery. Added the download to `prebuild` and declared a direct dependency on the already locked `onnxruntime-node` version.
- Added identification route tracing and `scripts/check-identification-bundle.mjs`. The CI check copies the precise Next.js trace to a temporary directory and runs the native worker there with its bundled model. It verifies the expected result shape and finite values.
- Moved the provider dependency into the identification route and invoked it through the shared photo handler after authorization. The bundle check also verifies that the model and worker assets stay out of other route traces.
- Detected default native ONNX Runtime telemetry during bundle testing and informed the app integrator and provider contributors to disable it before worker initialization. The isolated bundle check disables it before starting Node.

## Validation and results

- A clean-room run downloaded the official GitHub release binary, verified its digest and size, copied the license, and restored the binary from build cache. `npm run model:download:identification -- --verify-only` passed.
- `node --test --test-isolation=none tests/model-download.test.mjs` passed all 11 existing download regressions. `npm run lint`, `npm ls onnxruntime-node`, and `git diff --check` passed. An unrelated optional Tailwind WASM tarball was missing from the offline package cache during an npm dry run.
- `node node_modules/next/dist/bin/next build --webpack && npm run check:identification:bundle` passed after isolating the route dependency. The identification trace contained 428 files and 91,741,852 bytes uncompressed. The other photo and activity traces omitted YOLOX and its worker.
- The direct webpack invocation skipped the existing MiniLM prebuild fetch because the external Hugging Face download was unavailable in this workspace. The identification model was installed and its isolated trace test ran successfully.
- A 12-case run of the real POST handler and YOLOX with simulated Supabase roles passed. It checked same-origin and role denials, disabled configuration, invalid bodies, actual bottle suggestions for staff, school admins and website owners, unsupported-image fallback, response headers, and absence of external requests.

## Thoughts and reflections

- YOLOX's localized boxes let the draft estimate the item's color inside the object region. Its label vocabulary covers some common belongings and keeps manual entry necessary for unsupported or uncertain items.
- A build-time download keeps the binary and external asset requests out of request processing. The worker independently verifies the model digest before loading it.

## Cross-agent and cross-phase comments

- The provider and installer share the manifest and `models/yolox-nano/yolox_nano.onnx` path. The existing route still checks configuration after authorizing staff and before decoding the request body.
- The worker accepts `Float32Array` pixels for a 416×416 input and emits 3,549 predictions with 85 values each, which the bundle check validates.
- Developer and hosted deployments use `npm run model:download:identification` or the `npm run build` prebuild hook. No inference credential is required.
- Founder version remains open. Hosted application verification is owned by the integrator.

## Follow-up and handoff

- The integrator owns persisted staff-workspace validation and PR delivery. Packaging and trace verification are complete.
- Model and license source [YOLOX release 0.1.1rc0](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0) and [upstream license](https://github.com/Megvii-BaseDetection/YOLOX/blob/0.1.1rc0/LICENSE).
