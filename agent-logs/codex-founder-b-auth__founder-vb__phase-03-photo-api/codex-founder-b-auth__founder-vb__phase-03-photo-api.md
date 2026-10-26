# Phase Report: 03 — photo-api

## Metadata
- **Agent:** codex-founder-b-auth (Codex implementation agent)
- **Founder version:** B, supplied in task; normalized to lowercase b in path
- **Phase:** 03 — photo-api
- **Status:** Completed
- **Date (UTC):** 2026-10-25
- **Task / issue:** Founder B Phase 3 photo HTTP APIs and staff activity
- **Branch / commit:** codex/founder-b-phase-3; base commit 5be324e220528d6d6fcef070c177c42dde6be040

## Objective and scope
- **Goal:** Implement safe staff photo ingress/review/publication, state-aware image delivery and tenant-scoped audit activity reads.
- **In scope:** New photo/activity route adapters and narrow photo service/handler modules.
- **Out of scope:** UI, image decoder implementation, SQL migrations, semantic matching, hosted deployment and ordinary app CRUD changes.

## Work performed
- Read repository AGENTS.md, README, upstream API report and Phase 2 integration notes; inspected installed Next.js route-handler guide before using async route parameters.
- Coordinated exact photo_begin/finish/abort/publish/metadata/list RPC contracts with the security agent.
- Added staff photo GET/POST, explicit reviewed:true publication POST, staff content GET, public content GET and staff activity GET routes.
- Bounded multipart bytes before parsing: 5 MiB file plus 16 KiB framing overhead; accepts exactly one file field, ignores filename and MIME as authority, and delegates actual decoding/re-encoding to the parent's sanitizeImage.
- Added narrow server-only service-role processor: only photo lifecycle RPCs and immutable sanitized WebP Storage upload/cleanup. Ordinary CRUD, metadata and reads continue to use caller-scoped authorization.
- Verified user identity and live organization membership before private operations; database RPCs independently recheck actor/tenant and quota/cap.
- Public content always downloads as anon after public-only metadata authorization, preventing a staff preview policy from broadening a public URL during a return/publication race. Staff previews use user-scoped Storage RLS.
- Downloads enforce stream byte limits/timeouts and verify stored hash/length before returning inline image/webp with no-store and nosniff.
- Cleanup first aborts an unfinished photo reservation, then removes the immutable object only on successful abort. A lost finish response cannot trigger deletion of a committed pending photo.
- Activity uses explicit RLS-filtered fields, organization filter and versioned opaque UUID pagination.
- **Files created or modified:** src/lib/photos/service.ts; src/lib/photos/handler.ts; new src/app/api/v1 photo and staff/activity route.ts files; this report.
- **Decisions made:** Require the service-role key only for processing, never as an anonymous-key fallback. Keep public/staff reads functioning without that processor key. Do not expose storage paths, hashes or signed URLs through HTTP DTOs.

## Validation and results
- **Commands / checks run:** npm test — 18 tests passed, including the parent's image suite; npm run typecheck — passed; npm run lint — passed; git diff --check — passed.
- **Tests not run:** This agent did not run full live photo upload/review/return integration; the parent owns that suite and running application. No hosted credentials or deployed verification performed.
- **Deliverables:** New route adapters, service/handler and this report.

## Thoughts and reflections
- **What worked well:** SQL independently authorizes each step, making the privileged exception narrow and inspectable.
- **What was difficult or surprising:** Forwarding a staff cookie to a public Storage read would permit a state-change race through the preview policy even after initially correct public metadata checks. Anonymous Storage delivery closes that path.
- **Trade-offs and alternatives considered:** Storage SDK download normally buffers the entire response; a bounded fetch adapter caps streaming bytes before the SDK materializes a Blob. No signed URLs are used because they weaken state-dependent visibility.
- **What I would improve next:** Add operational cleanup for stale processing reservations and unreachable immutable objects after process termination; request handlers provide best-effort normal-path cleanup only.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A must show explicit human photo review before sending reviewed:true. Original input is never persisted. Staff-list photo URLs point to private review routes; public DTO URLs come from SQL public projections.
- **Dependencies / assumptions:** Parent-owned src/lib/photos/image.ts must retain safe bounded decode and metadata stripping; security-owned SQL must retain private bucket, service-only processing grants and public/staff read policies.
- **Risks / integration concerns:** Service-role key is sensitive and belongs in server-only environment settings. Missing processor configuration returns503 while reads remain available. Hard process termination can leave hidden processing records/objects; do not count documentation as scheduled cleanup.
- **Questions / requested decisions:** Parent verifies live HTTP flow, concurrent caps, quotas and missing-key behavior; founders still own real-user retention policy approval.

## Follow-up and handoff
- **Remaining work:** Parent integration suite and independent review; operational cleanup scheduling remains outside this assigned HTTP scope.
- **Recommended next steps:** Build the app with migrated local services and processor configuration, upload/review/publish a fictional photo, verify anonymous delivery, then reserve/return and assert public URL denial even with staff cookies.
- **Relevant references:** AGENTS.md; docs/phase-0/security-privacy.md; docs/phase-2/integration-notes.md; supabase/migrations/202610250003_photos.sql; prior phase02 api-adapters report.

## Addendum — 2026-10-25, reserve before decoding

Moved sanitizeImage from the handler into the processor's compensated try block after processing configuration and photo_begin succeed. Authenticated upload attempts therefore consume the database reservation quota before expensive decoding; decoder failures abort the hidden record and keep their quota event. Missing processing credentials and exhausted quota fail before decoding. HTTP body/file-size validation still precedes processing. Parent requested this resource-abuse improvement before live integration. Validation rerun below is limited to unit/static checks; parent retains live-suite ownership.

Addendum validation: npm test passed18; npm run typecheck passed; npm run lint passed; git diff --check passed. No full HTTP runtime claim made by this agent.

## Addendum — 2026-10-25, hosting-compatible photo size

Reduced handler/service input and verified download caps to 4 MiB; multipart framing remains limited to an additional16 KiB. Parent confirmed Vercel's function request/response ceiling is4.5MB, so a5MiB photo could not reliably traverse the intended hosted route. Parent-owned image limits and security-owned SQL/bucket metadata constraints are being aligned to the same4MiB bound. No other behavior changed.

Hosting-cap addendum validation: npm run typecheck, npm run lint and git diff --check passed. Parent owns updated image-unit and live HTTP boundary tests.
