# Phase Report: 02 — Registration recovery

## Metadata
- **Agent:** codex-auth-redirect (Codex)
- **Founder version:** unassigned
- **Phase:** 02 — Registration recovery
- **Status:** Completed (implementation and local Auth verification; CI/deployment pending)
- **Date (UTC):** 2026-10-27
- **Task / issue:** Registration still fails for the original email; add a confirmation resend button.
- **Branch / commit:** work checkout; existing codex/founder-b-phase-7 and PR #29; baseline fb4eb186c79366f9fbee4c55d5aaee02387826f3, containing current main 476232f.

## Objective and scope
- **Goal:** Recover from the original lost redirect and give existing users a working confirmation/sign-in email action.
- **In scope:** Duplicate-account authentication, confirmation recovery UI/POST, bounded same-origin validation, safe provider errors, PKCE cookies/callbacks and relevant tests.
- **Out of scope:** Account deletion, password reset/rotation, membership assignment, schema changes or bypassing confirmation.

## Work performed
- Refreshed main/source branch, preserved existing changes, reread coordination and installed Next.js route/cookie guides, and recorded ownership on the board.
- Asked for the exact failure. The owner clarified that signup was repeated with the original address, no new email arrived, and the old link could no longer sign in. The first verification may already have confirmed that account before redirecting to localhost; no real account status is assumed.
- Added duplicate signup sign-in only when the supplied original credentials authenticate. Failed authentication returns the same generic response and never changes a password or reveals account existence.
- Added a resend form to the waiting screen and a dedicated recovery page linked from signup/sign-in. Remembered email is held in an HttpOnly, HTTPS-secure, SameSite=Lax cookie for one hour, never in a redirect URL; passwords are not retained. Unconfirmed sign-in now has a specific recovery message.
- Added a same-origin, bounded-form, no-store recovery POST. Used signInWithOtp with shouldCreateUser:false: existing pending accounts receive confirmation; confirmed accounts receive a fresh sign-in link; unknown addresses cannot be enrolled. Responses preserve account privacy and distinguish validation/provider throttling/unavailability.
- Real Auth testing found that the pinned server's /resend endpoint explicitly emits implicit links, which cannot complete the app's server code exchange. Confirmed against upstream v2.186.0 resend.go and used the supported PKCE /otp flow instead. No custom hosted email template is required.
- Enabled the pinned SDK's appendPkceFlowIdToRedirects option, validated the callback flow ID, and exchanged the matching verifier. This protects earlier email links when a subsequent resend is throttled. Older callbacks without flow IDs remain supported.
- Extended the existing full Auth smoke and browser keyboard/accessibility suites, including wrong-password duplicate rejection, pending-account recovery, resend validation/CSRF, throttled retry, actual mail verification, original password preservation, unknown-account denial and continuation paths.
- **Files created or modified:** src/app/api/auth/resend-confirmation/route.ts; src/app/resend-confirmation/{page,form}.tsx; src/lib/auth/confirmation.ts; src/lib/auth/security.ts; src/lib/supabase/server.ts; signup/sign-in/callback routes/pages; tests/auth-security.test.ts; scripts/smoke-auth.mjs; tools/live-browser-test.py; README.md; coordination guide/state/board; report index and this report.
- **Decisions made:** Use existing-account email-link recovery to support both pending and already confirmed users without privileged keys, password changes or additional enrollment. Preserve other Phase 1 account/tenant boundaries.

## Validation and results
- **Commands / checks run:** npm run lint passed; npm run typecheck passed; npm test passed 51/51; npm run test:release passed 14/14; node --check scripts/smoke-auth.mjs and Python AST parsing passed; git diff --check passed. Direct Next production builds passed, including the final Auth-lab build with local test configuration.
- **Real Auth lab:** node /tmp/lostlink-auth-resend-lab.mjs passed against disposable Auth v2.186.0, PostgreSQL 15 and Mailpit containers plus the actual Next production server. It verifies a real signup email confirmed before the callback is followed, confirmed duplicate signup with correct password, wrong-password privacy, a one-time original callback, pending-login recovery, remembered email, POST validation/CSRF, real pending and confirmed email-link exchanges/session cookies, original-password sign-in after recovery, a throttled request preserving the preceding link, and generic unknown-address/safe-next responses. Fixtures, local credentials and containers are cleaned up in finally. Application REST is unavailable in this isolated lab; account-page Auth is real, but no membership/RLS claim is made.
- **Hosted diagnostic:** Fresh invalid-token request using next plus sb_flow_id returned HTTP 303 to the correct public callback with both parameters preserved. No real confirmation token was used or email sent.
- **Tests not run:** Full local Supabase database/live/browser suites: full PostgreSQL image extraction hit the documented vfs disk limit and was canceled; temporary space recovered. Chromium is not installed. The committed extended suites run in Foundation CI. The isolated lab avoids the large image with standard PostgreSQL and verifies Auth only. The model-download prebuild was not needed for this Auth change; direct Next build passed without a local model download.
- **Deliverables:** Working email-recovery implementation, focused unit/CI regressions, updated setup/recovery guidance and this report; remote CI/deployment evidence to be appended if available.

## Thoughts and reflections
- **What worked well:** Testing real mail, browser-verifier cookies and actual Auth endpoints caught an incompatibility that URL-only and mocked tests would miss.
- **What was difficult or surprising:** The installed client supports PKCE arguments for resend, but the pinned Auth server ignores them and produces implicit links. The supported OTP endpoint handles confirmation for existing pending accounts and preserves their original passwords; both behaviors were tested against real Auth.
- **Trade-offs and alternatives considered:** A custom token-hash email template would require another provider change; an implicit-token browser bridge would add unnecessary session-handling code. Existing-account PKCE email links solve the recovery need with the current callback and provider defaults.
- **What I would improve next:** Complete exact-head CI and verify the deployed recovery button with a fresh email in the same Safari browser. A user's real account status remains private and uninspected.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Preserve the exact-origin /auth/callback?next=** allowlist entry; it also covers the trailing flow identifier. Do not replace recovery with auth.resend until the supported Auth version produces compatible PKCE links.
- **Dependencies / assumptions:** Hosted email-link sign-in and email delivery must be enabled; email-provider throttling remains authoritative. The already configured callback wildcard accepts the extra flow parameter, verified publicly.
- **Risks / integration concerns:** Recovery can send a sign-in email to confirmed users, intentionally resolving the reported repeated-signup case. It never creates an unknown account or modifies a password. Appending flow IDs uses an explicit option on the existing pinned SDK; callback validation and real server tests cover it.
- **Questions / requested decisions:** Founder version remains an unassigned metadata question. No additional user information or provider credentials are needed for implementation.

## Follow-up and handoff
- **Remaining work:** Review exact-head CI, deploy through the PR/main workflow, and check production recovery rendering and an actual same-browser email sign-in.
- **Recommended next steps:** Use the original password to sign in now if the first email already confirmed the account. After deployment, use Resend confirmation email for a fresh confirmation/sign-in link; never reuse a consumed old link.
- **Relevant references:** PR #29; docs/coordination/auth-email-redirects.md; Phase 01 redirect report; upstream Supabase Auth v2.186.0 internal/api/resend.go, otp.go and magic_link.go.
