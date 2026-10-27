# Phase Report: 01 — Auth redirect repair

## Metadata
- **Agent:** codex-auth-redirect (Codex)
- **Founder version:** unassigned
- **Phase:** 01 — Auth redirect repair
- **Status:** Blocked
- **Date (UTC):** 2026-10-27
- **Task / issue:** Fix iPhone email confirmation redirect to localhost reported by task owner.
- **Branch / commit:** work checkout; delivery through existing codex/founder-b-phase-7; main baseline 476232fba87127b7b9a5ee6c3e11ffbf498e6255.

## Objective and scope
- **Goal:** Return email confirmation to the public LostLink application.
- **In scope:** Hosted URL diagnosis, narrow management repair, public redirect regression diagnostic, tests and recovery instructions.
- **Out of scope:** Database/schema changes, account deletion or password changes, email delivery changes and unrelated release work.

## Work performed
- Read repository/coordination/upstream signup instructions and installed Next.js environment guide. Synchronized the clean checkout to current main by fast-forward; fetched the existing delivery branch and verified its head is an ancestor. No new remote branch was created.
- Read cloud environment runtime/network guidance and inspected current environment readiness: no configured Supabase management secret or outbound identity. Browser control tools are not available in this session.
- Probed hosted Auth with intentionally invalid tokens and manual redirects, without creating accounts, sending email, consuming a real token or following redirects. Both requested callback variants redirected to localhost. An empty same-origin application sign-in POST returned the correct public origin.
- Retained the existing sign-up code: it already sends the deployed origin in emailRedirectTo. The defect is hosted URL selection. Explicitly documented the callback query allowlist requirement.
- Added an idempotent management helper that reads current configuration, patches only site_url/uri_allow_list, preserves existing redirects and verifies readback. It never prints full management responses or provider error bodies. Added a public diagnostic for the fallback URL and callbacks with/without next.
- Added eight regression cases and included them in Foundation's existing test:release command.
- Requested either a dashboard update or secure SUPABASE_ACCESS_TOKEN binding; no credential values were requested in chat.
- **Files created or modified:** scripts/auth-redirects.mjs; tests/auth-redirects.test.mjs; package.json; README.md; .env.example; docs/README.md; docs/coordination/auth-email-redirects.md; docs/coordination/current-state.md; docs/coordination/task-board.csv; agent-logs/README.md; this report.
- **Decisions made:** Keep local Supabase's localhost settings intact. Repair the hosted provider rather than changing a working application origin or bypassing confirmation. Restrict the new wildcard to the exact callback query on the public origin.

## Validation and results
- **Commands / checks run:** npm ci passed; npm run lint passed; npm run typecheck passed; npm test passed 47/47; npm run test:release passed 14/14 (including eight new cases); git diff --check passed.
- **Live diagnosis:** npm run auth:check -- https://lost-link-beta.vercel.app ldhwtrxhmaanfcgmtsbp exited 1 as expected: all three cases returned HTTP 303 to http://localhost:3000/.
- **Repair attempt:** npm run auth:configure -- https://lost-link-beta.vercel.app ldhwtrxhmaanfcgmtsbp exited 1 before network mutation with the explicit missing SUPABASE_ACCESS_TOKEN message. No hosted configuration changed.
- **Tests not run:** No real-user email/PKCE confirmation, hosted account-status inspection or live repair/readback without authorized provider access. No app build, Docker/database or browser suite rerun: the runtime application and schema were unchanged.
- **Deliverables:** Repair script, regression checks, exact dashboard/CLI instructions and repository coordination evidence. Publication reference to be appended after delivery.

## Thoughts and reflections
- **What worked well:** Public invalid-token redirects isolated the hosted setting without accessing personal emails or creating test accounts.
- **What was difficult or surprising:** Both bare and query callbacks fell back to localhost despite correct application-origin configuration. Existing general public smoke checks do not exercise this separate hosted setting.
- **Trade-offs and alternatives considered:** A callback cookie or custom token-hash email template would add application/provider changes without repairing the incorrect fallback Site URL. Updating hosted URL configuration directly is the appropriate fix.
- **What I would improve next:** Run auth:check as a deployment check whenever the production origin or Auth URL settings change, then complete a fresh same-browser registration on the iPhone.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Registration/Phase 7 maintainers should include the query-bearing callback in hosted redirect configuration; the local TOML and deployed NEXT_PUBLIC_SITE_URL do not synchronize hosted Auth settings.
- **Dependencies / assumptions:** The intended origin/project are the ones already documented in this repository and observed in public checks. The existing PKCE flow requires the original registration browser.
- **Risks / integration concerns:** Existing emails may already have confirmed the account before redirect failure. Do not delete/recreate it or infer account status from the browser error. The repair preserves other redirect entries and Auth/email settings.
- **Questions / requested decisions:** Founder version was not assigned, so unassigned is recorded as the required open metadata question. The live fix needs the task owner's dashboard update or secure Supabase management access.

## Follow-up and handoff
- **Remaining work:** Apply the hosted URL settings; rerun auth:check until all three cases pass; test a fresh iPhone email confirmation and account/claim destination.
- **Recommended next steps:** Follow docs/coordination/auth-email-redirects.md. Try signing in to the previously used account first; request a fresh link only if needed. Keep provider credentials in secure environment settings.
- **Relevant references:** README.md signup setup; docs/phase-7/hosted-access.md; existing issue-27 signup implementation report; docs/coordination/auth-email-redirects.md.

## Publication addendum — 2026-10-27 UTC

Published implementation commit `a7174082cfe3e944b87f930b7d208c6cd8555996`
by fast-forward push to the existing `codex/founder-b-phase-7` branch and opened
[draft PR #29](https://github.com/AI-In-Bussiness/Lost-Link/pull/29) against main.
The PR explicitly records that merging source does not update hosted Auth URL
configuration. No merge, production repair or real-account confirmation is
claimed. Provider access/dashboard update remains the only blocker to applying
and checking the live URL fix; independent PR/CI review remains separate.
