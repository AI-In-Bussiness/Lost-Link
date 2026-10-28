# Phase Report: 08 — Owner administration extension

## Metadata
- **Agent:** codex-founder-b (Codex)
- **Founder version:** B
- **Phase:** 08 — owner-administration (owner-requested extension after the original Phase 0–7 roadmap)
- **Status:** Completed (implementation); hosted assignment/deployment blocked on operator access
- **Date (UTC):** 2026-10-28
- **Task / issue:** Owner requests two website admin accounts with school/settings management.
- **Branch / commit:** reused codex/founder-b-phase-7 from current main 1522d81

## Objective and scope
- **Goal:** Give two individual accounts a website-owner role and a secure website administration area.
- **In scope:** School creation/publication/settings, scoped staff assignment/removal, audit, dynamic public directory, operator bootstrap and tests.
- **Out of scope:** Password sharing/reset, automatic ownership on signup, provider keys/billing/code editor, destructive school/account deletion, hosted mutations without access.

## Work performed
- Added a separate owner table, self-read RLS, owner-checked transactional RPC and immutable client audit. Existing school admin remains school-scoped.
- Added server-rendered `/admin` with normal sign-in, owner links, strict bounded same-origin form writes and version conflicts. Browser errors preserve inputs and focus the message.
- Added school settings for name, time zone, public email and collection instructions; slugs remain permanent. Hidden schools retain staff workflows and stored records.
- Added a live database directory, including published schools and the current user's hidden staff schools. Homepage excludes hidden schools; no environment update is needed for a new published school. School search shows contact information and approved claims use collection instructions.
- Added an operator-only, idempotent same-pair bootstrap for exactly two existing confirmed accounts, preserving individual passwords. Provided CLI and personal SQL artifact outside Git; actual owner emails are not committed.
- **Files created or modified:** src/app/admin; src/app/api/admin; src/lib/admin; account/auth/proxy navigation; public directory route/interface; new migration and SQL tests; bootstrap/test scripts; CI; docs/administration.md and coordination.
- **Decisions made:** No service-role key in admin web routes; authorization is checked through the user-scoped client and again in the database. Owners assign explicit school memberships to see private school workflows. No public role picker for website ownership.

## Validation and results
- **Commands / checks run:** All 67 unit tests, lint, root/UI typechecks, UI formatting and production build pass. All five actual local database suites pass, including bootstrap, nonowner denial, direct-write denial, stale versions, membership revocation, second-owner equivalence, public directory, claimant collection/private-note boundary and audit immutability.
- `npm run test:admin`: real local Auth/database/browser owner creation/settings/publication/staff assignment/removal, both owners, stale-form input retention, anonymous/claimant/school-admin denial and cross-origin/malformed requests pass. Axe reports zero violations, with no overflow at 320/390/768/1440. Screenshots inspected at phone/desktop widths.
- Existing production browser document-security and policy/navigation scenarios pass via `npm run test:browser -- PersistedWorkflow.test_document_security_and_exposed_file_boundaries PersistedWorkflow.test_policy_pages_and_public_navigation`.
- **Tests not run:** Existing full email/signup/claim workflow locally: the persistent local Auth service predates current configuration and reports signup disabled. It was not restarted or reconfigured. CI retains the full suite against its fresh configured stack. Hosted owner account creation/assignment, deployment and browser verification were not performed; the runtime has no hosted provider credentials.
- **Deliverables:** Reviewable implementation, new migration, administration guide, temporary personalized one-time SQL file and this report.

## Thoughts and reflections
- **What worked well:** Reusing existing Auth, school memberships, notebook controls and claim projections keeps the owner extension small and preserves privacy boundaries. The real browser journey verifies owner-2 concurrency and hidden-school staff continuity.
- **What was difficult or surprising:** The previous directory depended on two configured slugs. Creating schools would have appeared successful while leaving them undiscoverable without a database-backed directory. Hidden-school visibility must differ for public visitors and assigned staff.
- **Trade-offs and alternatives considered:** Operator-only initial ownership is safer than a user-editable role or shared password. The overview loads the small school/member directory and latest 100 audit events; larger deployments need pagination. Hiding retains history instead of destructive deletion.
- **What I would improve next:** Independently review the owner permission surface; verify both actual accounts and deploy/migrate through the accepted release process.

## Cross-agent and cross-phase comments
- **For agents on other phases:** The new directory API is authoritative; the previous slug list is navigation context only. School admins still cannot manage other schools. Do not seed actual founder emails, passwords or owner rows into migrations.
- **Dependencies / assumptions:** Apply migration 202610290005 before deploying this application; initial owners must have confirmed Auth accounts. PostgREST schema reload is included. Exact canonical origin and email callback configuration remain required.
- **Risks / integration concerns:** Admin directory size is intentionally suitable for the current small deployment. Future API/service consumers must use the safe directory, not raw organization tables. This feature does not complete the existing Phase 7 release/rollback/independent acceptance requirements.
- **Questions / requested decisions:** The owner provided both addresses privately. Hosted activation requires operator access, not another product decision.

## Follow-up and handoff
- **Remaining work:** Remote exact-head CI/review/merge; hosted migration and bootstrap of the confirmed founder accounts; verify live `/admin` for both people and deny ordinary accounts.
- **Recommended next steps:** Review the PR, use docs/administration.md and the personalized SQL artifact in the intended project, then sign in individually. Record deployment acceptance separately.
- **Relevant references:** docs/administration.md; pending migration; OWNER-ADMIN coordination row; original Phase 7 evidence.

## Main integration addendum — 2026-10-28 UTC

Main advanced to 7730ff6 during delivery, integrating the separately requested demo
school names and their old-row display compatibility. Merged that history without
conflicts and applied the same display helper to the new directory endpoint, so
new-directory visitors retain the approved labels even while the name migration
is pending. Custom school names remain unchanged. The owner migration remains
ordered after the school-name migration. Existing reports and school/account IDs
are preserved. Final combined validation and PR checks follow.

Final combined local checks pass: 70 unit tests, all five database suites, lint,
root/UI typechecks, formatting, production build and both real owner-browser
scenarios (including ordinary and school-admin HTTP denial). Existing security/
policy browser probes also passed before the school-label-only main integration.

## CI focus repair — 2026-10-28 UTC

The first exact-source Foundation pair had one complete pass and one failure in
the owner's stale-form focus assertion. The error and retained input were correct,
but the animation-frame focus callback was unreliable while another owner tab
was active. Replaced it with a React effect after the alert is committed. Kept the
same browser assertion; no timeout increase or assertion removal. Rerun the
production browser checks and remote checks on the corrected head.

## PR #40 owner-only review response — 2026-10-28 UTC

- **Request:** [Review comment](https://github.com/AI-In-Bussiness/Lost-Link/pull/40#issuecomment-6476784242): “The admin should be only for website owner, not school admin”.
- **Change:** `/admin` was already owner-gated. Removed the school-admin assignment
  option and raw school-admin labels from the new owner screen/account page. New
  assignments must be staff in both strict form validation and the database RPC.
  Only securely bootstrapped website owners receive admin controls; existing
  school-admin rows retain their previous scoped staff permissions.
- **Migration:** Added forward migration 202610290006 instead of changing the
  original setup already offered to the owner. It moves the original implementation
  into private schema, revokes client execution, and wraps it with owner-only,
  staff-assignment-only validation. Neither school staff nor legacy school admins
  can bypass the wrapper or perform any owner action.
- **Validation:** 70 unit tests, all five actual database suites, lint/typecheck,
  production build and both real owner-browser scenarios pass. Browser fixtures
  now include an actual legacy school-admin membership and verify denial of
  `/admin`, all owner POST actions and admin navigation. Existing owner workflows,
  four-width checks, axe, stale-form preservation and scoped staff access pass.
- **Setup artifact:** Refreshed the private SQL handoff to support fresh and earlier
  PR40 setups. Tested fresh install, repeat install and current-schema use with
  synthetic confirmed accounts in rolled-back/disposable local databases; no real
  founder accounts or hosted configuration were changed.
- **Reflection/handoff:** Preserve legacy memberships to avoid disrupting school
  work; reserve the visible admin designation and administrative controls for
  website owners. Apply pending migration 006 even if setup 005 was already run.
  Remote checks and independent review remain tied to the updated PR head.

## Final two-level scope — 2026-10-28 UTC

- **Clarified scope:** The task owner wants school-admin accounts limited to their
  assigned school, with both founders having full access across every school.
  This supersedes the intermediate staff-only assignment change after the PR comment.
- **Implementation:** Restored school staff/admin assignment. `/admin` remains
  website-owner-only. Added a separate school settings page and scoped RPC for
  school admins, with strict route/payload school binding, member management,
  current versions, audit and last-admin protection. Shared server form handling
  preserves the exact-origin, session and bounded-field checks for both endpoints.
- **Full website access:** Website owners satisfy the existing school staff/RLS
  helper and receive every school workspace in server-verified navigation. No
  individual school memberships are needed. School users retain scoped access.
- **Files/contract:** Forward migration 007, school settings page/API, shared
  fields/handler, role navigation, privacy disclosure, scoped SQL/browser tests,
  administration guide and private setup artifact. Earlier migrations stay intact.
- **Validation:** 70 unit cases, six actual local SQL suites, lint/root/UI
  typechecks/format, production build and three real Auth/database/browser
  scenarios pass. They cover school settings persistence, role assignment,
  cross-school IDs/routes, ordinary-staff denial, owner escalation denial,
  last-school-admin protection, owner all-school access, owner-only `/admin`,
  audit, refresh, stale form retention, four widths and axe.
- **Reflection/handoff:** Separate URLs and database authorization make the two
  administrator scopes explicit. A forward migration preserves installations
  that already used earlier setup files. Apply pending 005/006/007 and bootstrap
  the two confirmed founders; hosted activation and independent review remain.

## Accessible SQL handoff — 2026-10-28 UTC

The task owner could not open the temporary local SQL link on iPhone. Added
`supabase/setup/administration.sql` for a persistent GitHub source link, with the
three reviewed migration bodies and conditional installation of each missing
stage. It installs the final two-level schema without creating users, granting
owners or changing passwords. The owner grant stays a separate query supplied
privately/in chat, with actual addresses excluded from Git. Updated the guide.
Validation: fresh install, repeat install and upgrade from initial owner setup
in disposable local databases; no hosted access or application behavior changed.
