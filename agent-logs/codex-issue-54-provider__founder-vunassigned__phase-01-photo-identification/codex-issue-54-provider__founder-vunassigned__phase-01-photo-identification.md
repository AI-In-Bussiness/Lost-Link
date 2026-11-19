# Phase Report — 01 Photo identification provider

**Superseded 2026-11-19.** Sub-issue #58 requires inference without API costs.
The implementation was replaced before publication by the
[local CPU provider](../codex-issue-54-provider__founder-vunassigned__phase-02-local-photo-identification/codex-issue-54-provider__founder-vunassigned__phase-02-local-photo-identification.md).

## Metadata

- **Agent** `codex-issue-54-provider` (Codex)
- **Founder version** `unassigned`
- **Phase** 01 Photo identification
- **Status** Completed
- **Date (UTC)** 2026-11-19
- **Task** [Issue #54](https://github.com/AI-In-Bussiness/Lost-Link/issues/54)
- **Branch / commit** `work`, integrated baseline `a5e4306`

## Objective and scope

- **Goal** Generate a valid public found-item draft from an authorized staff photo.
- **In scope** Inference request, response validation, configuration, and provider regression tests.
- **Out of scope** Staff authorization, persistence, and the staff form are owned by parallel implementation phases.

## Work performed

- Integrated the OpenAI Responses API with a 512-pixel upper bound, metadata-free WebP input, disabled response storage, and a 15-second limit that respects request cancellation.
- Reused the create-item validators for title, category, color, and public description. The draft also satisfies the staff form's minimum text lengths.
- Handled missing credentials, no recognized item, provider refusals, invalid drafts, and upstream errors with recoverable responses.
- **Files created or modified** `src/lib/photos/identify.ts`, `tests/item-identification.test.ts`, `.env.example`, and `DEVELOPMENT.md`.
- **Decisions made** Use the image-capable `gpt-4o-mini` default and permit a server environment model override. Staff select the photo before inference and can review the generated draft before saving.

## Validation and results

- `node --import tsx tests/item-identification.test.ts` passed both regression tests, covering outbound request shape and metadata stripping, schema rejection, and refusal handling.
- An additional five-case provider smoke passed using synthetic fixtures and stubbed fetch, including absent configuration, explicit no-item responses, incomplete responses, upstream 429 handling, and request cancellation.
- `./node_modules/.bin/tsc --noEmit`, scoped `eslint`, and `git diff --check` passed. The `tsx` CLI could not bind its Unix socket in this sandbox. Node's tsx import hook ran the same TypeScript tests directly.
- **Tests not run** The live OpenAI call requires a configured API key. The workspace had no key binding.
- **Deliverables** Server provider, setup instructions, and regression tests.

## Thoughts and reflections

- **What worked well** Shared create-item field validation keeps the generated data compatible with the existing intake API.
- **What was difficult or surprising** The Node test runner needs the `react-server` package condition to import the same server-only entry point Next.js uses. A test-scoped resolve hook applies that condition to the marker package.
- **Trade-offs and alternatives considered** The provider sends a downsized image to reduce transmitted data, which can reduce recognition of fine details. Intake asks the model to describe broad visible features, and staff can add details during review.
- **What I would improve next** Verify a configured deployment with a synthetic found-item photograph and check that a clear suggestion reaches the editable intake form.

## Cross-agent and cross-phase comments

- **For endpoint integration** `identifyItem(photo, request.signal)` expects a sanitized WebP. `isItemIdentificationConfigured()` can check the runtime key before decoding. `ItemIdentificationError` supplies the HTTP status and safe error code.
- **Dependencies / assumptions** A hosted instance needs a server-side OpenAI API key with access to an image-input model that supports Structured Outputs.
- **Risks / integration concerns** Staff may need to enter details manually when an image is unclear or the provider is unavailable. The user-facing intake and privacy notice explain when the photo is sent to OpenAI.
- **Questions / requested decisions** The task supplies no Founder version. The directory records that metadata as unassigned.

## Follow-up and handoff

- **Remaining work** Integrated endpoint and staff workflow verification. Live inference validation requires provider credentials.
- **Recommended next steps** Run the integrated checks with the existing staff intake acceptance flow and use a configured host for a live provider check.
- **Relevant references** [Development and operations](../../DEVELOPMENT.md), [Issue #54](https://github.com/AI-In-Bussiness/Lost-Link/issues/54).
