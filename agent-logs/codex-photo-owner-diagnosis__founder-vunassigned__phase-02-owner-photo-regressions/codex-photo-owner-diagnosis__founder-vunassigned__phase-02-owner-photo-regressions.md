# Phase Report: 02 — Owner photo regressions

## Metadata
- **Agent:** codex-photo-owner-diagnosis (Codex subagent)
- **Founder version:** unassigned; not supplied
- **Phase:** 02 — Owner photo regressions
- **Status:** Completed
- **Date (UTC):** 2026-10-31
- **Task / issue:** Website-owner JPEG upload reports resource unavailable after issue #49
- **Branch / commit:** codex/issue-49-compress-images, based on main 80624a7

## Objective and scope
- **Goal:** Prove the owner upload authorization failure and verify its SQL repair without weakening existing access controls.
- **In scope:** A new rollback-only owner-photo SQL/RLS suite, database-suite registration, and disposable local PostgreSQL reproduction.
- **Out of scope:** Hosted database changes, real accounts/images, migration implementation and browser-test implementation (owned by other agents).

## Work performed
- Added `supabase/tests/owner-photos.sql` with two confirmed fictional owners who have no memberships, one published and one hidden fictional school, ordinary own-school staff, foreign-school staff and a claimant.
- Tested both owners through reservation, immutable scoped path, required Storage metadata, finalization, private listing/preview/Storage reads, explicit review publication and public visibility rules.
- Kept the processor JWT subject empty to prove authorization uses `p_actor`, rather than the processor's `auth.uid()`.
- Tested service-only function grants, forged role/actor attempts, caller role checks, claimant/foreign-school denials, mismatched item/creator, missing Storage, idempotency, owner revocation at finish, authorized abort cleanup, three-photo cap and twenty-attempt actor quota.
- Registered the suite in `scripts/test-database.mjs` so Foundation CI runs it with the existing rollback-only suites.
- **Files created or modified:** The new SQL suite, database runner and this report only.
- **Decisions made:** Use native PostgreSQL 15 in a small disposable container with no published ports. Existing Auth/Storage bootstrap interfaces plus `auth.role()`, Storage metadata and service-role grants model database behavior; they do not represent real GoTrue/PostgREST/Storage HTTP validation.

## Validation and results
- **Commands / checks run:** `node --check scripts/test-database.mjs` and `git diff --check` passed.
- No PostgreSQL executable or existing database/container/image was installed. The existing managed Docker daemon was reachable with additional network permission; no Docker installation or daemon reconfiguration was performed. Read the runtime Docker guidance and pulled `postgres:15-alpine`.
- Installed repository migrations through 008 and seed into disposable `lostlink-owner-photo-pg`. Running the new suite against those original functions failed at the first membership-free owner `photo_begin` with `NOT_FOUND`, after preceding ACL/role/staff-denial checks passed.
- Applied `202610310009_owner_photo_uploads.sql` unchanged. The new suite passed all 59 assertions, including both owner begin/finish/private-preview/publication flows.
- All seven SQL suites passed: foundation, backend, photos, owner-photos, overseer, platform-admin and school-admin. Each suite rolled back its own fixtures.
- Reapplied migration 009 and reran the owner suite: 59 assertions passed.
- Applied the repeatable administration setup twice to the existing schema and reran the owner suite: 59 assertions passed.
- Created a separate fresh disposable database with only foundation/backend/photo/overseer migrations, applied the full administration setup twice, and ran the owner suite: 59 assertions passed. This verifies the SQL Editor artifact supports fresh and repeated owner setup.
- Stopped the owned `--rm` container after validation; both disposable databases and their fixture data were removed. No hosted database was contacted.
- **Tests not run:** Real local Supabase HTTP/browser/Storage bytes or hosted acceptance. The browser agent and Foundation CI own those checks.
- **Deliverables:** Regression suite, runner registration, before/after PostgreSQL evidence and fresh/repeat setup evidence. Temporary logs are `/tmp/lostlink-owner-photo-*.log`.

## Thoughts and reflections
- **What worked well:** Native PostgreSQL reproduced the exact pre-decoder `NOT_FOUND` and established that changing both processor authorization predicates fixes membership-free owners while retaining SQL/RLS boundaries.
- **What was difficult or surprising:** The shell sandbox requires additional network permission even for the existing local Docker socket. The minimal bootstrap needs the provider's auth-role function, Storage metadata column and service-role table privileges to represent the interfaces used by real migrations.
- **Trade-offs and alternatives considered:** A small PostgreSQL image avoided the full Supabase stack's disk cost. Explicit SQL assertions exercise database behavior but do not substitute for actual Storage objects or browser persistence checks.
- **What I would improve next:** Keep complete membership-free owner upload/browser coverage alongside ordinary staff uploads.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Root owns migration 009 and the repeatable administration SQL. Independent review verified their matching definitions. Browser agent owns the genuine small/oversized JPEG journeys for both owners.
- **Dependencies / assumptions:** Photo processor calls remain service-role-only; the handler passes a verified actor UUID. Client-upload code cannot set arbitrary processor identity.
- **Risks / integration concerns:** A source deployment alone cannot update already-installed hosted SQL functions. Apply the reviewed migration through the intended project's SQL Editor before claiming live resolution.
- **Questions / requested decisions:** Founder version remains unassigned. No real account or uploaded-image data was inspected.

## Follow-up and handoff
- **Remaining work:** Root commits the shared repair, obtains fresh Foundation CI including the real owner browser journeys, and delivers the hosted SQL repair to the user where account access is unavailable.
- **Recommended next steps:** Keep the new suite in the normal database runner; preserve both processor guards and service-only ACLs. Do not add artificial memberships to work around owner authorization.
- **Relevant references:** Phase 01 diagnosis report; migration 009; `supabase/tests/owner-photos.sql`; `scripts/test-database.mjs`; `tools/admin-browser-test.py`.
