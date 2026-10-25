# Phase Report: 03 — Workflow review

## Metadata
- **Agent:** codex-founder-b-review (independent Codex review agent)
- **Founder version:** b
- **Phase:** 03 — workflow-review
- **Status:** Completed
- **Date (UTC):** 2026-10-25
- **Task / issue:** Founder B secure photo backend review
- **Branch / commit:** codex/founder-b-phase-2; baseline 5be324e220528d6d6fcef070c177c42dde6be040, reviewed uncommitted Phase 03 additions

## Objective and scope
- **Goal:** Independently review secure photo processing, publication and retrieval boundaries.
- **In scope:** Photo SQL grants, definer functions, tenant/actor checks, quota/cap serialization, pending/public state, image decoder, HTTP handlers and Storage compensation.
- **Out of scope:** Frontend; implementation edits; hosted deployment; proving complete application security.

## Work performed
- Read AGENTS.md and existing architecture contract; inspected migration 202610250003_photos.sql, src/lib/photos/{image,service,handler}.ts, photo route adapters, supabase/tests/photos.sql and tests/photo-image.test.ts.
- Verified service-only begin/finish/abort grants, auth.role checks, membership checks, actor-scoped advisory quota lock and item locks for cap/state transitions. User publication requires explicit reviewed=true. Client writes to derivative bucket remain denied; previous raw staging insert policy is removed.
- Verified multipart byte bounds, strict one-file shape, signature/decoder validation, metadata stripping, random immutable paths, bounded download and hash/length checks.
- Raised two findings, both corrected and re-inspected: (1) public content must not inherit staff preview privileges during a state-change race; downloader now uses anonymous authorization for public content; (2) photo_verified must coalesce nullable SQL predicates to false; function now fails closed, with a SQL regression scenario.
- Reviewed compensation: abort only removes processing rows; service removes object only after successful abort. A lost finish response leaves committed pending data intact. Interrupted/failed cleanup requires operator reconciliation.
- **Files created or modified:** Only this review report.
- **Decisions made:** Accepted explicitly scoped server-only service-role processor as a new documented exception to Phase 0's earlier user-scoped assumption. Ordinary inventory/claim handlers remain caller-scoped. No original upload bytes are stored.

## Validation and results
- **Commands / checks run:** `npx tsx --test tests/photo-image.test.ts` in repository root: 7 tests passed, 0 failed, 0 skipped. Covered supported conversion, EXIF orientation/stripping, spoofed/malformed types, byte/pixel bounds, resizing, animation rejection and trailing payload removal.
- **Tests not run:** SQL, HTTP, Storage and race tests not executed by this reviewer; parent owns integrated local-stack execution. Reading their test sources is not a passing test claim.
- **Deliverables:** This independent report; review feedback sent to parent. No remaining blocking finding in the reviewed code after corrections.

## Thoughts and reflections
- **What worked well:** Separate processing and publication states keep unreviewed bytes inaccessible; immutable paths and digest verification make content trust explicit.
- **What was difficult or surprising:** Staff legitimately have broader private-preview rights; forwarding those rights on public URLs could defeat the intended second authorization check during state changes.
- **Trade-offs and alternatives considered:** Anonymous downloads on public URLs preserve current public Storage RLS, while staff preview remains a separate route. Best-effort cleanup preserves safety but cannot ensure every interrupted operation is reconciled.
- **What I would improve next:** Implement and exercise documented stale-processing/orphan reconciliation before unattended public operation; include interrupted upload/revoked membership failure injection in integration coverage.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Parent/integration owner must run real HTTP/Storage and concurrent-cap/quota checks; do not label SQL-only fixtures as end-to-end Storage validation. Frontend must request staff preview URLs for pending photos and explicit review before publication.
- **Dependencies / assumptions:** Service-role key remains server-only in ignored local configuration; trusted processor is the only derivative writer; hosting supports native sharp.
- **Risks / integration concerns:** Service-role access is a deliberate capability expansion requiring disclosure. Best-effort abort/remove can leave inaccessible objects or processing reservations after process/network failure; manual cleanup remains necessary. Decode happens before reservation, so quota bounds accepted processing reservations rather than all malformed decode attempts.
- **Questions / requested decisions:** None blocking this review; hosted credentials and deployment permissions remain parent-managed prerequisites.

## Follow-up and handoff
- **Remaining work:** Parent's real-stack validation, documented operational cleanup and hosted deployment remain outside this review's executed checks.
- **Recommended next steps:** Run full integration suite, confirm public URLs reject pending/returned/unpublished items even with staff cookies, and retain a regression test for both resolved findings.
- **Relevant references:** docs/phase-0/architecture-contract.md; supabase/migrations/202610250003_photos.sql; supabase/tests/photos.sql; src/lib/photos/; tests/photo-image.test.ts.

## 2026-10-25 addendum — Platform payload cap and final scripts

- Re-inspected the final decoder, multipart parser, download bounds and photo migration: accepted image input/output, integrity metadata and the derivative bucket now consistently cap bytes at **4 MiB**; multipart overhead is capped separately at **16 KiB**. Pixel cap stays 20 megapixels.
- Parent supplied the platform decision: Vercel Functions have a 4.5 MB request/response limit, verified by the parent against official documentation. The 4 MiB application cap plus bounded overhead leaves headroom. This reviewer checked code consistency; did not independently deploy to Vercel or test its platform payload limit.
- Read scripts/configure-photo-worker.mjs and scripts/smoke-photos.mjs. The helper refuses hosted targets, requires an existing local configuration, preserves existing credentials, uses the CLI's local service key without logging it, and writes the ignored local file with owner-only permissions. The real HTTP smoke source covers pending/public/staff gates, decode and EXIF behavior, hash tampering, missing processor configuration, concurrent cap, activity pagination and claim/return public revocation. Local fixture cleanup is scoped to newly created organizations/users and their objects.
- No new blocking concern found. Parent reports real HTTP success, but those execution results belong to the parent; this reviewer has not independently executed SQL, Storage or full HTTP smoke checks.
- Re-ran `npx tsx --test tests/photo-image.test.ts` after the cap change: **7 passed, 0 failed, 0 skipped**. Existing cleanup/operator caveats above remain.
