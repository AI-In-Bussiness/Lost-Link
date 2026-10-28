# Phase Report: 09 — Password reset

## Metadata
- **Agent:** codex-founder-b (Codex)
- **Founder version:** B
- **Phase:** 09 — Password reset
- **Status:** Completed (implementation and local verification; PR review/hosted acceptance separate)
- **Date (UTC):** 2026-10-28
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/41
- **Branch / commit:** Existing `codex/founder-b-phase-7`, fast-forwarded to current main `e8b4e97` before changes.

## Objective and scope
- **Goal:** Let every account type reset a forgotten LostLink password from sign-in.
- **In scope:** Email recovery request, PKCE callback, verified new-password form, validation, permissions preservation, documentation and real local browser/mail regression checks.
- **Out of scope:** Hosted provider configuration, real founders' credentials, owner bootstrap, school-role changes and unrelated Phase 7 release gates.

## Work performed
- Added the sign-in recovery link and accessible request/new-password/success/error screens.
- Requested real Supabase password recovery emails without enrolling unknown users. Preserved safe claim/admin continuations and isolated per-request PKCE verifier slots.
- Added a per-address one-minute HttpOnly browser cooldown after reproducing the local Auth provider replacing the pending recovery challenge on a throttled repeat. The marker stores only an address hash and expiry; provider-side throttling remains authoritative.
- Recognized the successful SDK recovery result in the existing callback. Bound a 15-minute HttpOnly form grant to the user, exact session and intended destination; independently verify the user against Auth on page and mutation requests.
- Kept same-origin POST checks, strict bounded URL-encoded fields, CSP, no-store responses and server-only session cookies. New-password input cannot change identity, email, metadata or roles.
- Added unit regressions and a local-only real Auth/mail/Chromium suite for claimant, staff, school-admin and website-owner accounts. The runner compares membership/ownership records before and after and cleans only its random fixtures.
- **Files created or modified:** `src/app/{forgot-password,reset-password}/`, corresponding `api/auth` routes, `src/app/auth/callback/route.ts`, `src/app/sign-in/page.tsx`, `src/lib/auth/recovery*.ts`, tests/browser runner, CI, password reset guide, README and coordination records.
- **Decisions made:** Reuse the existing allowlisted callback and public-key user client; no SQL migration, service-role runtime operation or new environment secret. Retain the authenticated recovery session on success and clear its form grant.

## Validation and results
- **Commands / checks run:** `npm run lint`, `npm run typecheck`, `npm test` (75 cases) and `npm run build -- --webpack` pass. `npm run test:password-reset` passes both real browser suites (all four roles) with actual local recovery emails, old-password rejection, new-password sign-in, membership/ownership record equality, no unknown-user enrollment, safe redirects, body/CSRF/role-injection rejection, normal-session and wrong-browser denial, immediate repeat-email recovery, consumed callback/re-submit denial, HttpOnly cookies, no-store and axe at 320/390/768/1440px. A credential-free hosted invalid-token probe also returns 303 to the exact canonical callback with admin continuation/recovery/flow ID preserved; it sends no email or valid token.
- **Initial failures and resolution:** Corrected browser tests to wait for client navigation and target alerts inside `main`, excluding Next's route announcer. A real `bad_code_verifier` failure after a throttled `/recover` repeat exposed the provider challenge replacement; reproduced without the repeat to isolate it, then added the cooldown and verified the original email remains usable after the retry. Temporary safe error-code diagnostics were removed before publication.
- **Final-source regression check:** Rebuilt production and reran all 75 unit cases after the final strict cooldown-marker parser change; also passed `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser PersistedWorkflow.test_document_security_and_exposed_file_boundaries`, including both new auth endpoints' cross-origin denials. `git diff --cached --check` passes.
- **Tests not run:** Hosted real-user recovery/email delivery; no provider dashboard credentials are available. Unrelated search/model/SQL suites are unchanged and existing full CI remains required.
- **Deliverables:** `docs/password-reset.md` and issue #41 implementation/tests.

## Thoughts and reflections
- **What worked well:** Existing PKCE callback and isolated flow verifiers support password recovery without adding a browser Supabase client or weakening cookie/CSP controls.
- **What was difficult or surprising:** The installed Auth SDK returns `redirectType` at runtime but omits it from the public exchange return type; an explicit property guard handles it without trusting a query flag. Next's route announcer also has `role=alert`, so browser assertions must target the main content. The provider's throttled recovery retry can still replace the challenge; verifier-slot isolation alone could not solve that specific case.
- **Trade-offs and alternatives considered:** A password reset must update the existing user rather than create new accounts or rerun ownership SQL. Recovery form authorization uses the existing verified session token to authenticate a short-lived form grant, avoiding a separate deployment secret or database mutation. This is application flow enforcement; Supabase independently authorizes the current user's password update.
- **What I would improve next:** Hosted email delivery acceptance remains necessary; provider-side SMTP, anti-abuse and session policy belong to the operator configuration.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A's interface and hidden initial confirmation-resend controls are preserved. Only the requested password-reset link is added to sign-in. Existing signup/resend behavior must continue passing CI.
- **Dependencies / assumptions:** Existing confirmed accounts, email delivery, correct canonical origin and callback query allowlist. Default/limited SMTP can prevent real recipients receiving messages despite source correctness.
- **Risks / integration concerns:** The existing callback now routes successful recovery exchanges to the password form; non-recovery exchanges preserve their original destination. The feature does not promise that already issued access tokens are immediately revoked.
- **Questions / requested decisions:** None needed to implement issue #41.

## Follow-up and handoff
- **Remaining work:** PR integration/review and real hosted email/password-reset acceptance. Exact-head CI status is available in the delivery PR; a local pass is not a claim of hosted email delivery.
- **Recommended next steps:** After integration/deployment, use **Forgot your password?** on the canonical site with a real account and open its newest email in the requesting browser. No account SQL rerun is needed.
- **Relevant references:** `docs/password-reset.md`, `docs/administration.md`, `docs/coordination/auth-email-redirects.md`, issue #41.
