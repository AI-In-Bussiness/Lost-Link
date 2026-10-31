# Phase Report: 01 — Staff claim review

## Metadata
- **Agent:** codex-issue-46 (Codex)
- **Founder version:** unassigned; the task did not identify a Founder version.
- **Phase:** 01 — Staff claim review
- **Status:** Completed (implementation and local checks; persisted CI pending)
- **Date (UTC):** 2026-10-30
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/46
- **Branch / commit:** reused `codex/convert-plan-markdown`, based on main `441fe6f015acb587cc66d8b79a72678981e138c5`.

## Objective and scope
- **Goal:** Make the staff queue's Review action load private claim details for authorized reviewers.
- **In scope:** Photo/activity HTTP authorization used by item loading; persisted browser regression coverage; coordination and this report.
- **Out of scope:** Database migrations, public visibility, claim lifecycle changes, owner photo-upload SQL permissions, hosted account/configuration changes.

## Work performed
- Traced queue Review links through `staffView`, `getStaffClaim`, and `getStaffItem`.
- Identified inconsistent authorization: migration 007 permits website owners through `private.is_staff`; `staffContext` in the photo/activity handler still required a school membership. The required photo and activity requests caused an otherwise valid claim review to fail with 404.
- Added an authenticated, current-user `platform_admins` lookup when a school membership does not grant access. Membership/owner lookup failures remain 503, unrelated accounts remain 404, and anonymous callers remain 401. Public photo handling still passes `p_staff=false`.
- Added a published, synthetic review school with ordinary staff but no owner memberships to the existing local acceptance harness. Its browser case clicks actual Review links as owner/staff, reloads, checks private evidence, checks denial for claimant/foreign-school/anonymous callers, and completes owner approval and physical return. Fixture cleanup removes only records under the harness's random school slugs.
- Updated the existing persisted staff journey to click the dashboard Review link instead of jumping directly to its URL.
- **Files created or modified:** `src/lib/photos/handler.ts`; `scripts/test-admin.mjs`; `tools/admin-browser-test.py`; `tools/live-browser-test.py`; `docs/coordination/current-state.md`; `docs/coordination/task-board.csv`; this report.
- **Decisions made:** Preserve the existing review contract and use the same verified owner table used elsewhere in the application. No new client-side role authority or database permission is introduced.

## Validation and results
- **Commands / checks run:** `npm run lint`, `npm run typecheck`, `npm test` (75/75), `npm run test:release` (21/21), `npm run test:mocks` (14/14), `npm run typecheck --prefix tools/phase2`, `npm exec -- next build --webpack`, `node --check scripts/test-admin.mjs`, Python compile checks, and `git diff --check` pass.
- Executed the actual original and modified `staffContext` function bodies with isolated synthetic Supabase responses in a temporary diagnostic script. Original owner-without-membership returns 404; modified owner/staff/admin succeed; unrelated/revoked/anonymous callers and lookup failures retain their denial/error behavior. This is an isolated function check, not real Auth/RLS/browser evidence.
- **Tests not run:** Local `test:admin`, persisted browser suite and database suites could not start: the official Supabase PostgreSQL image extraction exhausted the workspace disk quota. Stopped the new local setup; existing CI runs the real Auth/database/browser workflows. The direct webpack compilation skips the unrelated model download prebuild; CI retains the normal build and model checks.
- **Deliverables:** Focused source fix, regression scenarios, coordination entries and this report. PR checks must supply full persisted acceptance before merge/closure.

## Thoughts and reflections
- **What worked well:** Tracing all dependent requests exposed the permission mismatch without altering valid queue links or weakening privacy checks.
- **What was difficult or surprising:** The claim and item RPCs already allow owners; a separate photo guard blocked the whole page even for an item without photographs. The older browser journey covered ordinary staff via direct URLs and missed this owner path.
- **Trade-offs and alternatives considered:** Avoided suppressing failed photo/activity requests in the interface because doing so would hide authorization errors. Kept ordinary staff on the existing membership path; owner access is checked only when needed.
- **What I would improve next:** Centralize shared staff/owner authorization in a separately scoped follow-up if further drift appears.

## Cross-agent and cross-phase comments
- **For agents on other phases:** The review page requires both photo and activity reads. Owner-only tests that stop at `/staff/items` do not validate this flow.
- **Dependencies / assumptions:** Existing migrations through 007 and the established two-level role policy. No migration is required by this repair.
- **Risks / integration concerns:** The processor's `photo_begin`/`photo_finish` SQL still has its own membership policy; owner uploads without membership are outside this claim-review repair.
- **Questions / requested decisions:** Founder version remains unassigned metadata; no runtime decision is blocked by it.

## Follow-up and handoff
- **Remaining work:** Run the PR's Foundation and interface checks, inspect the real owner/staff browser regression results, merge and confirm issue closure.
- **Recommended next steps:** Merge only after required checks pass; preserve existing source branch history and confirm production deployment independently before claiming hosted verification.
- **Relevant references:** Issue #46; `AGENTS.md`; `docs/coordination/integration.md`; `supabase/migrations/202610290007_school_admin_scope.sql`; existing `test:admin` and persisted browser CI steps.
