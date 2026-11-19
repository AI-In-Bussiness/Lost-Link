# Phase Report — 02 Local photo identification

## Metadata

- **Agent** `codex-issue-54-provider` (Codex)
- **Founder version** `unassigned`
- **Phase** 02 Local photo identification
- **Status** Completed
- **Date (UTC)** 2026-11-19
- **Task** [Issue #54](https://github.com/AI-In-Bussiness/Lost-Link/issues/54) and [sub-issue #58](https://github.com/AI-In-Bussiness/Lost-Link/issues/58)
- **Branch / commit** `work`, integrated baseline `a5e4306`

## Objective and scope

- **Goal** Suggest a public found-item draft from a staff photo using local inference with no API fees.
- **In scope** Server inference, field generation, setup guidance, and provider regression tests.
- **Out of scope** Endpoint authorization, model delivery, staff form, and publishing are owned by parallel implementation phases.

## Work performed

- Used the pinned Apache-2.0 YOLOX Nano release with ONNX Runtime on the application server CPU.
- Verified the release graph expects planar BGR pixels with 114 padding and returns 3,549 rows of class and box predictions.
- Added a single, timeout-bounded worker that verifies the model checksum before startup and handles caller cancellation. Disabled native runtime telemetry before starting either local inference worker.
- Generate the title, existing API category, and plain-text description from the strongest supported detection. The color estimate uses pixels inside its bounding box and returns `unknown` when ambiguous.
- **Files created or modified** `src/lib/photos/identify.ts`, `src/lib/photos/item-draft.ts`, `src/lib/photos/local-worker.mjs`, `src/lib/search/embeddings.ts`, `tests/item-identification.test.ts`, `.env.example`, and `DEVELOPMENT.md`.
- **Decisions made** Enable identification when pinned weights are installed. Retain manual intake and a server environment switch for disabling suggestions. Use a 0.35 confidence threshold and allow only relevant object classes.

## Validation and results

- `node --import tsx tests/item-identification.test.ts` passed all three regressions for planar preprocessing, color within the region, confidence and unsupported-class filtering.
- `./node_modules/.bin/tsc --noEmit`, scoped `eslint`, and `git diff --check` passed.
- Actual model smoke passed bottle, suitcase, umbrella, and clock photos and rejected an unsupported dog/bicycle/truck photo. Verified the disabled setting, concurrent request fallback, and pre-aborted request. Native worker startup stopped emitting its telemetry warning after the guard was set.
- **Tests not run** Photo accuracy on a representative school inventory dataset. The public test examples exercise the full model path and include COCO training examples.
- **Deliverables** Offline inference worker, editable draft fields, setup guidance, and preprocessing/postprocessing regressions.

## Thoughts and reflections

- **What worked well** The actual weights scored clear supported examples substantially above the rejection threshold and allowed unsupported scenes to fall back to manual entry.
- **What was difficult or surprising** The release tag's demo uses RGB normalization while the pinned ONNX asset produced reliable results with raw BGR preprocessing from the current upstream demo. Verified both forms against the actual graph.
- **Trade-offs and alternatives considered** A compact detector fits the deployment and provides an object region for color estimation. The class list excludes some common items, including keys, and the model can miss small or hard-to-see objects.
- **What I would improve next** Evaluate on centered, single-item photos of belongings that staff most often record.

## Cross-agent and cross-phase comments

- **For endpoint integration** `identifyItem(photo, request.signal)` accepts a sanitized image. Status 422 indicates no supported detection, and 502/503 leave manual intake available.
- **Dependencies / assumptions** Build includes the local worker, pinned model and manifest, and native ONNX Runtime files. The app process starts from the project or traced runtime root.
- **Risks / integration concerns** Multi-item scenes can yield a different item than staff intend. The staff photo guidance and editable draft support correction before saving.
- **Questions / requested decisions** The task supplies no Founder version. The directory records that metadata as unassigned.

## Follow-up and handoff

- **Remaining work** Integrated deployment and issue closure are tracked by the parent task.
- **Recommended next steps** Run the bundled inference and staff intake acceptance workflows against the complete change.
- **Relevant references** [Development and operations](../../DEVELOPMENT.md), [YOLOX release](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0), [upstream ONNX demo](https://github.com/Megvii-BaseDetection/YOLOX/blob/main/demo/ONNXRuntime/onnx_inference.py).
