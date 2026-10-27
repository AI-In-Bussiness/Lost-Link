# Phase Report: 01 — Website sign-up

## Metadata
- **Agent:** codex-issue-27 (Codex)
- **Founder version:** unassigned
- **Phase:** 01 — Website sign-up
- **Status:** Completed
- **Date (UTC):** 2026-10-27
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/27
- **Branch / commit:** codex/convert-plan-markdown; baseline 567ad420f62f6b7c8e6c0580dc9994dc8a89928e

## Objective and scope
- **Goal:** Let website visitors register and confirm an ordinary claimant account.
- **In scope:** Registration page/POST, confirmation callback, sign-in navigation, local Auth settings, focused tests and setup guidance.
- **Out of scope:** Membership administration, schema changes, hosted credentials/configuration and unrelated release issues.

## Work performed
- Read installed Next.js 16.4.3 route-handler, page/searchParams and cookie guides before writing application code.
- Added `/sign-up`, `/api/auth/sign-up` and `/auth/callback`, reusing the SSR client and existing bounded-form/origin/redirect helpers. Registration accepts only email/password/next; passwords remain POST-only and raw provider errors never enter the UI or redirect.
- Required 12–256-character passwords; retained email confirmation in local Supabase config. Confirmation exchanges a browser-bound PKCE code for session cookies. Projects with confirmation disabled can return their immediate session through the same safe redirect.
- Added generic duplicate-account messaging, retryable provider/throttling errors, expired/missing/replayed-code recovery, no-store responses and a callback-specific no-referrer header.
- Added sign-in/registration links that preserve a validated claim destination. Extended live navigation to recognize the registration route.
- Replaced the obsolete disabled-signup smoke assertion with real HTTP account creation, local email verification, session cookies, unconfirmed-login rejection, staff denial and role-escalation denial. Added validation unit tests and browser keyboard/accessibility coverage for registration.
- **Files created or modified:** src/app/sign-up/page.tsx; src/app/api/auth/sign-up/route.ts; src/app/auth/callback/route.ts; src/app/sign-in/page.tsx; src/lib/auth/security.ts; src/interface/app.ts; next.config.ts; supabase/config.toml; scripts/smoke-auth.mjs; tests/auth-security.test.ts; tools/live-browser-test.py; README.md; supabase/README.md; coordination state/board; report index and these reports.
- **Decisions made:** No profile/membership insert is required for claimant actions, which derive identity from auth.users. Keep role assignment exclusively in existing operator flows. Use the ordinary public Auth key, never a service-role key in registration handlers.

## Validation and results
- **Commands / checks run:** npm ci; npm run lint; npm run typecheck passed. `node --import tsx --test tests/*.test.ts` passed 47 tests; npm run test:release passed 6 tests; npm run test:mocks passed 14 tests. Direct `node node_modules/next/dist/bin/next build` passed compilation, type checking and route generation. `node --check scripts/smoke-auth.mjs`, Python AST parsing and git diff --check passed.
- **Tests not run:** Local full Supabase suites are not claimed: this fresh runtime has no cached Docker images. `npm run build` prebuild cannot download the unchanged model assets because the managed proxy denies that destination (403); the direct Next build above passed without model assets. Full model/database/HTTP/browser checks are required from GitHub Actions before merge.
- **Deliverables:** Registration implementation, setup guidance and regression coverage; CI/publication evidence to be appended below.

Production HTTP addendum: an inline `node --input-type=module` assertion script
against `next start` passed registration/sign-in unavailable-state rendering,
no-store, same-origin rejection, weak-password rejection, provider-unavailable
recovery, external redirect sanitization, missing/duplicate callback-code
recovery and the corrected callback no-referrer response. The second direct
Next production build also passed after the header fix.

CI review addendum: the first Phase 2 interface job rejected the modified
navigation line's formatting. Applied the pinned Prettier formatter to that
file and ran the interface formatting/type checks locally. Final review also
restricted the sign-up error-message lookup to own keys so arbitrary URL
parameters cannot select Object.prototype properties.

## Thoughts and reflections
- **What worked well:** Reusing the existing SSR and security utilities kept the new route consistent with sign-in without adding privileged server capabilities.
- **What was difficult or surprising:** A production HTTP probe found next.config.ts's global Referrer-Policy overrides the route header. Added the more specific callback rule and required a repeat HTTP probe.
- **Trade-offs and alternatives considered:** PKCE confirmation requires the original browser, which is explained on the success/recovery screens. A custom email template/token-hash flow would add separate provider configuration and is unnecessary here.
- **What I would improve next:** Verify hosted Auth/email settings with authorized operator access; source/local config alone cannot enable a hosted project's signup switch.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Historical Phase 1 instructions that disable public signup are superseded for this feature by the current README and local config. PR26 and original reports are preserved.
- **Dependencies / assumptions:** Supabase URL/public key, exact NEXT_PUBLIC_SITE_URL, hosted new-user/email signup, confirmation, callback redirect permission and email delivery must be configured.
- **Risks / integration concerns:** Test fixtures are local-only, use fresh synthetic identities and are removed in finally. New users must remain unable to write memberships. This change does not claim a hosted rollout or release-gate approval.
- **Questions / requested decisions:** Founder assignment remains unspecified, recorded as unassigned per AGENTS.md; no implementation decision is blocked by this metadata.

## Follow-up and handoff
- **Remaining work:** Run full CI, review final diff, merge the focused PR and close issue #27 after integration. Hosted provider settings remain an operator setup requirement.
- **Recommended next steps:** Record exact-head CI and final merge/issue outcome in the delivery discussion; do not infer a hosted signup test from a successful local/CI suite.
- **Relevant references:** Phase 00 report; AGENTS.md; README setup; issue #27.
