# Phase Report: 03 — secure-photos

## Metadata
- **Agent:** codex-founder-b-security (Codex SQL/security implementation agent)
- **Founder version:** B, supplied by task owner; normalized to lowercase b in path
- **Phase:** 03 — secure-photos
- **Status:** Completed
- **Date (UTC):** 2026-10-25
- **Task / issue:** Founder B Phase 3 secure photo pipeline database contract
- **Branch / commit:** codex/founder-b-phase-3; baseline 5be324e; this report accompanies the uncommitted Phase 3 deliverables

## Objective and scope
- **Goal:** Provide tenant-safe photo reservation, processing finalization, review/publication and delivery authorization without permitting client storage writes.
- **In scope:** New migration, new rolled-back SQL integration suite, own report; coordination with HTTP/image implementation agents.
- **Out of scope:** Image decoder/HTTP handlers, frontend integration, semantic matching, retention scheduler, membership management and hosted deployment.

## Work performed
- Read root AGENTS.md and relevant Phase 2 implementation/review/aggregate reports and contracts before implementation.
- Added processing state and protected integrity metadata (`sha256`, `byte_size`, `content_type`, `processed_at`) plus review metadata. Demoted legacy published records to pending; no legacy production photos are seeded.
- Added service-only `photo_begin`, `photo_finish`, `photo_abort`. Both execute grants and `auth.role()` protect the processor boundary. Begin derives immutable object paths, serializes per-actor 20/hour reservation quota (aborts retain quota consumption), checks current membership and locks the item for the three-photo cap. Finish verifies membership, availability, object presence, provider MIME/size metadata and supplied hash/size before marking pending. Abort handles unfinished reservation cleanup without requiring a revoked user's membership.
- Added caller-scoped `photo_publish`, `photo_metadata`, `photo_list`. Review requires explicit true, live staff membership and verified processed metadata. Public access requires published organization, available item and published verified photo. Staff retain private preview for pending/published derivatives.
- Changed private bucket policies to permit only sanitized verified previews and public approved reads. Removed legacy client staging INSERT permission; clients cannot bypass sanitization/quota through another bucket. No client writes to item-public were added.
- Added published safe content URLs/alt text to backend item DTOs, and verified-only filtering to the compatibility public listing RPC. Public alt comes only from the safe item title.
- **Files created or modified:** `supabase/migrations/202610250003_photos.sql`; `supabase/tests/photos.sql`; this report.
- **Decisions made:** The Phase 0/2 statement that normal request handlers never use a service credential gains one narrow, explicit exception: a server-only image processor may reserve/finalize/abort and upload re-encoded derivatives with a service-role key after independently authenticating the actor. Ordinary inventory/claim handlers remain user-scoped. Service secrets remain server-only and must never reach browser bundles, logs or DTOs. Image bytes are verified by the trusted decoder, not by pretending PostgreSQL can read storage blobs.

## Validation and results
- **Commands / checks run:** `docker exec -i supabase_db_lost-link psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/202610250003_photos.sql` succeeded against the existing local Supabase; no reset. Exact `CREATE OR REPLACE` helper/public-compatibility updates were applied after the NULL hardening adjustment. `docker exec -i supabase_db_lost-link psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/photos.sql` passed 40 checks; fixtures rolled back. `git diff --check` passed.
- **Tests not run:** This agent did not execute image-file HTTP tests or production build; parent owns decoder/HTTP validation. No hosted deployment or remote CI is claimed. SQL tests exercise role/JWT claims and actual Storage table policies; they do not claim to decode real image files or independently prove concurrent uploads.
- **Deliverables:** Migration, SQL test suite and this report. Function interfaces communicated to the auth agent before implementation and applied live for parent HTTP tests.

## Thoughts and reflections
- **What worked well:** Reserving before upload lets the database serialize cap/quota checks while bytes remain outside database transactions. Checking authorization again at finalization handles membership revocation during processing. Private bucket policy checks re-evaluate item/organization visibility instead of relying on long-lived signed links.
- **What was difficult or surprising:** SQL three-valued logic can make `IF NOT verified(...)` unsafe if incomplete metadata produces NULL. The verified helper now explicitly coalesces to false; a regression test covers partial legacy metadata with null MIME type. Existing Phase 1 fixtures assumed raw staging inserts and metadata-free published photos, so parent adjusted those tests to the stronger boundary rather than leaving a compatibility hole.
- **Trade-offs and alternatives considered:** Used an isolated processor service credential rather than opening sanitized bucket writes to authenticated staff. Kept objects in a private bucket and mediated reads rather than exposing public bucket URLs that outlive item status. No original images are stored by the new route contract.
- **What I would improve next:** Add operational cleanup for crashed processing reservations/orphaned sanitized objects and a monitored scheduled job, with explicit safe operator ownership. Validate concurrency and real decoder metadata stripping through parent HTTP tests before claiming the entire photo pipeline complete.

## Cross-agent and cross-phase comments
- **For agents on other phases:** HTTP processor must authenticate using the normal session, pass only that user's ID as p_actor, re-encode to WebP before upload, calculate SHA-256 and size from output bytes, use immutable upload without upsert, and call finish. On failure, require abort success before deleting the object; a lost finish response can leave an already-pending valid record that must not be deleted by unconditional cleanup. Public/staff content routes use user/anonymous Storage downloads, not service downloads, after metadata authorization; no signed URLs needed.
- **Dependencies / assumptions:** Supabase Auth role claims and Storage metadata (`mimetype`, `size`) are trusted provider interfaces. Existing migrations 001/002 are applied. The processor's broad service key is confined to a server-only module and transport; SQL cannot protect against compromise of that privileged key.
- **Risks / integration concerns:** Metadata reservation and Storage upload cannot be one transaction. Ordinary route errors can abort, but a process crash can leave an unfinished reservation consuming one of three slots and a sanitized orphan; no scheduler is claimed. Retain failed-upload audit reservations for hourly quota so repeated aborts cannot reset abuse limits. Direct staging uploads are intentionally no longer supported.
- **Questions / requested decisions:** None blocking the assigned database work. Founder/integrator still owns previously documented cross-founder DTO/state reconciliation and hosted rollout approval.

## Follow-up and handoff
- **Remaining work:** Parent image/HTTP validation, combined test/build verification, local migration history registration and operational cleanup follow-up.
- **Recommended next steps:** Parent runs actual image upload/review/download tests, validates provider metadata against finish requirements, records migration 202610250003 after final agreement, and reconciles UI contracts before a real-user launch.
- **Relevant references:** AGENTS.md; docs/phase-0/security-privacy.md; docs/phase-0/architecture-contract.md; docs/phase-2/README.md; agent-logs/codex-founder-b-security__founder-vb__phase-02-transactional-backend/; parent and auth Phase 3 reports when written.

## 2026-10-25 addendum — Vercel body compatibility

Parent verified the official [Vercel function limits](https://vercel.com/docs/functions/limitations): both request and response bodies are limited to 4.5 MB. The photo pipeline now intentionally narrows Phase 0's proposed 5 MiB maximum to **4 MiB (4,194,304 bytes)** for upload and derivative delivery. SQL byte constraints, verified metadata predicate, finish input bounds and the private item-public bucket limit use this narrower value. The 20-megapixel decoder cap, three-photo item cap and 20 reservations/hour actor quota remain unchanged.

Applied the exact local constraint/helper/finish/bucket delta in a transaction, with no database reset or data removal. Reran the original 40 SQL checks successfully, then added one focused regression asserting a 4,194,305-byte finish is rejected. Final `photos.sql` now passes **41 checks** against actual local Supabase; fixtures roll back. Parent/auth agents own the matching decoder/body-limit changes and combined HTTP validation. This is a concrete hosting compatibility decision, not an unexplained change to the shared maximum.
