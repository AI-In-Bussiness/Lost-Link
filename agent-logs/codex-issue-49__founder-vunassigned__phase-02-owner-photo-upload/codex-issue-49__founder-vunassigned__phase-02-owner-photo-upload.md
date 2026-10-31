# Phase Report: 02 — Owner photo upload

## Metadata
- **Agent:** codex-issue-49 (Codex)
- **Founder version:** unassigned; not supplied
- **Phase:** 02 — Owner photo upload
- **Status:** Completed
- **Date (UTC):** 2026-10-31
- **Task / issue:** User reported JPEG upload failure after issue #49; confirmed website-owner account
- **Branch / commit:** codex/issue-49-compress-images; based on main80624a7

## Objective and scope
- **Goal:** Repair owner upload failure before image processing and provide the hosted SQL repair.
- **In scope:** Trusted processor database authorization, forward/repeatable setup, SQL and real owner JPEG browser regressions, operator instructions.
- **Out of scope:** Account provisioning, artificial memberships, altered image validation or unrelated administration.

## Work performed
- Traced UI NOT_FOUND wording through HTTP photo guard and service-role photo_begin/photo_finish RPCs.
- Confirmed both RPCs still required explicit school membership while HTTP and private read/publication recognize website owners.
- Added migration009 to recognize platform_admins for verified p_actor in both functions. All other body logic and service-only execution remain unchanged.
- Included identical definitions in repeatable administration setup; documented standalone SQL Editor application and retry.
- Delegated native PostgreSQL regression ownership to codex-photo-owner-diagnosis and both-owner JPEG browser acceptance to codex-owner-upload-browser.
- Added both membership-free owners, small/oversized JPEG, private preview/publication/refresh, Storage hash/creator/length and quota-reservation assertions.
- Independent source/security review found no actionable issues and confirmed exact body/setup parity.
- **Files created or modified:** migration009; setup/administration.sql; owner-photos.sql; scripts/test-database.mjs; scripts/test-admin.mjs; tools/admin-browser-test.py; administration/current-state/board documentation; contributor reports.
- **Decisions made:** Authorize the verified p_actor explicitly. Processor auth.uid() represents service role and cannot identify the owner. Existing owner accounts retain their independent website role.

## Validation and results
- **Commands / checks run:** npm run lint; npm run typecheck; npm test (76 pass); git diff --check; JS/Python syntax checks; exact original-function and repeatable-setup comparisons.
- Native disposable PostgreSQL15 reproduced NOT_FOUND at the first owner reservation on old functions; migration009 makes the same owner suite pass.
- All seven SQL/RLS suites pass: foundation, backend, photos, owner-photos, overseer, platform-admin, school-admin. The SQL agent report records repeat/fresh setup checks and harness boundaries.
- **Tests not run:** No hosted account/database request was made. Full real Auth/Storage/owner JPEG browser execution runs through PR Foundation CI; those results must be checked on the delivered head.
- **Deliverables:** Standalone transaction-safe repeatable migration, shared setup, regression suites, documentation and independent review.

## Thoughts and reflections
- **What worked well:** Exact error mapping identified an authorization rejection before decoding; same-role SQL reproduction made the defect concrete.
- **What was difficult or surprising:** Earlier compression acceptance used ordinary staff and missed owner intake even though owner read/review was tested.
- **Trade-offs and alternatives considered:** Creating memberships would hide the inconsistency. The database guard must match owner semantics without allowing browser access to processor RPCs.
- **What I would improve next:** Keep full owner upload lifecycle as an enforced CI scenario and verify the user's hosted retry after SQL installation.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Preserve p_actor derivation from auth.getUser(), service-only grants, item/creator/school checks, caps/quota and Storage integrity.
- **Dependencies / assumptions:** Existing administration setup supplies platform_admins; existing server processor credentials remain configured.
- **Risks / integration concerns:** Hosted SQL application is separate from source merge/deployment. No hosted database tools or credential bindings are available in this workspace.
- **Questions / requested decisions:** Founder version remains unassigned. User was given the tested standalone SQL and asked whether their existing owner JPEG succeeds after applying it.

## Follow-up and handoff
- **Remaining work:** Final-head CI, PR integration, and hosted SQL application/retry by the authorized project operator.
- **Recommended next steps:** Run migration009 in the intended Supabase SQL Editor, retry the same JPEG, then review/publish normally.
- **Relevant references:** docs/administration.md; standalone migration009; SQL/browser/review contributor reports; original issue #49 and PR #50.
