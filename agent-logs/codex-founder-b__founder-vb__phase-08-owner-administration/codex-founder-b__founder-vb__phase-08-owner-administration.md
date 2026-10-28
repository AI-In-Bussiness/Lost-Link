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
