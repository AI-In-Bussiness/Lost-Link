# Phase 01 — Staff identification API

This phase records the initial service integration. The local YOLOX implementation replaced its external model calls in [phase 02](../codex-identify-endpoint__founder-vunassigned__phase-02-local-model-packaging/codex-identify-endpoint__founder-vunassigned__phase-02-local-model-packaging.md) for [issue 58](https://github.com/AI-In-Bussiness/Lost-Link/issues/58).

## Metadata

- **Agent** `codex-identify-endpoint`
- **Founder version** `unassigned`
- **Phase** 01 — Staff identification API
- **Status** Completed
- **Date (UTC)** 2026-11-19
- **Task** [LostLink issue 54](https://github.com/AI-In-Bussiness/Lost-Link/issues/54)
- **Branch and base** `work`, based on `a5e4306`

## Objective and scope

Add a school-scoped endpoint for identifying a found item from a photo. The staff interface uses the result as a draft for the existing inventory and photo workflows.

## Work performed

- Added `POST /api/v1/organizations/:orgSlug/staff/items/identify` through `src/app/api/v1/organizations/[orgSlug]/staff/items/identify/route.ts` using the Node runtime.
- Extended `src/lib/photos/handler.ts` to verify request origin and staff access before checking provider configuration and reading the upload. The shared photo decoder validates bytes and strips metadata before the provider receives the image. The existing response headers and error format apply to identification responses.
- Coordinated the payload shape, error codes and cancellation signal with the staff interface and provider contributors.

## Validation and results

- `npm run typecheck`, scoped ESLint, and `git diff --check` passed.
- `node --import tsx --test tests/body-streams.test.ts tests/photo-image.test.ts` passed. This invocation avoids the `tsx` CLI's sandbox-restricted IPC socket.
- A local harness exercised the real POST route, photo sanitizer, and provider with simulated Supabase and OpenAI responses. Fourteen cases passed, covering origin denial, anonymous and claimant denial, foreign-school denial, unconfigured service, invalid form and image inputs, staff and owner success, 512-pixel WebP conversion with EXIF removed, and provider failure mapping.
- Live OpenAI responses and hosted staff intake were outside this phase's validation. The integrator owns persisted application checks.

## Thoughts and reflections

- Reusing the photo handler applies the established school and platform-owner roles to the new endpoint and avoids a second multipart parser.
- The photo upload quota reserves an existing item attachment. Identification runs before item creation, so the reservation is specific to the subsequent upload. Identification uses staff access, bounded request and image sizes, and the configured provider's request limits.
- A dedicated server-side provider is responsible for the suggestion schema and timeout. This keeps model-specific behavior out of the photo handler.

## Cross-agent and cross-phase comments

- The staff interface can submit a prepared photo in the `file` field and use the returned `title`, `category`, `color`, and `publicDescription` as editable intake values.
- Server deployments require `OPENAI_API_KEY` for automatic identification. The endpoint returns a manual-entry message when the provider is unconfigured or unavailable.
- The Founder version for this assignment remains open. No schema migration was required for the endpoint.

## Follow-up and handoff

- The integrator owns combined validation and PR delivery. No endpoint implementation work remains in this phase.
- The endpoint and provider integration uses [the existing photo processing conventions](../../src/lib/photos/handler.ts) and the normal staff workspace.
