# Phase Report: 01 — Owner upload browser coverage

## Metadata
- **Agent:** codex-owner-upload-browser (Codex subagent)
- **Founder version:** unassigned; not supplied, retained as an open attribution question.
- **Phase:** 01 — Owner upload browser coverage
- **Status:** Completed
- **Date (UTC):** 2026-10-31
- **Task / issue:** Website-owner JPEG upload failure reported after issue #49.
- **Branch / commit:** codex/issue-49-compress-images, based on main 80624a7.

## Objective and scope
- **Goal:** Prevent a website owner without a school membership from reaching an untested photo-upload authorization failure.
- **In scope:** Existing owner browser acceptance and its temporary fixture runner.
- **Out of scope:** SQL implementation, hosted migrations, real user accounts and production changes.

## Work performed
- Read repository instructions, coordination guidance, current state, repository map, relevant Next client guide and nearby owner/photo acceptance code.
- Added an isolated published school to the existing temporary local fixtures. Asserted that neither website owner has any school membership before or after the journey.
- Added valid small and oversized JPEG fixtures with Sharp, stored only in the runner's owner-readable temporary directory. Both originals remain below the browser source limit; the larger image exceeds 4 MiB.
- Added a persisted browser journey for both owner accounts: create a listing, upload JPEG through the production UI, require HTTP201, decode the private preview, deny anonymous and foreign-school access, confirm publication, reload and decode the public WebP.
- Added runner assertions for two distinct owner creators, exactly one processing reservation per owner, bounded processed metadata and actual Storage length/hash integrity.
- Extended cleanup only to the new runner-owned fixture school and temporary files.
- **Files created or modified:** tools/admin-browser-test.py; scripts/test-admin.mjs; this report.
- **Decisions made:** Keep the owner JPEG scenario independent of existing review/deletion fixture order. Exercise both unchanged-small-file and automatic-compression paths using real JPEG bytes.

## Validation and results
- **Commands / checks run:** python -m py_compile tools/admin-browser-test.py; node --check scripts/test-admin.mjs; node node_modules/eslint/bin/eslint.js scripts/test-admin.mjs; git diff --check. All passed.
- **Commands / checks run:** Executed the exact Sharp fixture encoders and decoded both outputs. The small fixture was a 2,106-byte 554×554 JPEG; a sample large fixture was a 12,611,575-byte 2400×1800 JPEG. Both meet the intended size conditions.
- **Tests not run:** Full npm run test:admin requires a matched local Supabase Auth/database/Storage stack, which is unavailable in this workspace. No persisted runtime pass is claimed by this report; parent and Foundation CI own execution.
- **Deliverables:** Meaningful persisted owner-upload regression and fixture/storage assertions in the existing acceptance runner.

## Thoughts and reflections
- **What worked well:** Existing owner fixtures explicitly omit school memberships, so the new test covers the reported role mismatch directly.
- **What was difficult or surprising:** Existing owner checks exercised listing, activity and claim review but never the service-role photo reservation/finalization pair.
- **Trade-offs and alternatives considered:** Kept image generation in the Node fixture runner, where Sharp is already installed, avoiding committed binary assets or a Python imaging dependency.
- **What I would improve next:** Retain this journey alongside ordinary staff upload acceptance and require its CI result for future photo authorization changes.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Parent owns migration009/setup and another agent owns SQL regressions. This browser test expects both photo_begin and photo_finish to recognize the verified actor's platform ownership.
- **Dependencies / assumptions:** Existing production app, local Supabase fixture runner, Sharp and Chromium. Owner access must not be implemented by silently adding memberships.
- **Risks / integration concerns:** A source deploy alone does not update hosted database functions. The new SQL migration must be applied to the hosted database before declaring the user's live upload repaired.
- **Questions / requested decisions:** Founder version remains unassigned; no authorization decision is pending for these scoped tests.

## Follow-up and handoff
- **Remaining work:** Parent should collect the exact-head Foundation result for the real persisted owner upload journey and apply or hand off the hosted SQL migration.
- **Recommended next steps:** Include both assigned files and this report in the shared PR; preserve ordinary staff and cross-school SQL/browser coverage.
- **Relevant references:** src/lib/photos/handler.ts; supabase/migrations/202610250003_photos.sql; tools/live-browser-test.py; issue #49 follow-up.
