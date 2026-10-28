# Phase Report: 05 — Email rate diagnosis

## Metadata
- **Agent:** codex-auth-redirect (Codex)
- **Founder version:** unassigned; not supplied by owner.
- **Phase:** 05 — email-rate-diagnosis
- **Status:** Blocked
- **Date (UTC):** 2026-10-27
- **Task / issue:** Second signup with another address reports too many attempts.
- **Branch / commit:** work / ae883e6; existing delivery branch codex/founder-b-phase-7.

## Objective and scope
- **Goal:** Restore registration across different addresses without bypassing verification.
- **In scope:** Trace rate-limit handling and establish hosted email configuration requirements.
- **Out of scope:** Disabling verification, automatic retry bursts and invented confirmation success.

## Work performed
- Traced signup POST: one auth.signUp call; no application attempt counter. Provider email/request rate errors and HTTP 429 currently share the rate-limit message.
- Checked runtime readiness: no Supabase management credentials or SMTP configuration bindings; no callable Supabase/browser tools. Checked credential presence only, not values.
- Verified current official docs: default SMTP is restricted to team addresses and two messages per hour across the project. A different recipient does not provide a fresh project quota.
- Asked whether custom SMTP is enabled to distinguish default quota from custom provider/request limits.
- **Files created or modified:** This report; docs/coordination/auth-email-redirects.md; coordination board.
- **Decisions made:** Do not alter the client to bypass a provider limit or report unsent email as sent. Actual project limit/provider settings and exact upstream code are not available; default SMTP remains a likely diagnosis, not an inspected fact.

## Validation and results
- **Commands / checks run:** Read signup route, registrationError mapping and current tests; git fetch confirmed main ae883e6. Runtime status current with no credentials. Official Auth SMTP/rate-limit documentation checked.
- **Tests not run:** No application code changed; production registration probes would consume email quota/create users and cannot establish private provider configuration.
- **Deliverables:** Operator steps in docs/coordination/auth-email-redirects.md.

## Thoughts and reflections
- **What worked well:** Application code clearly attributes the displayed limit to Auth.
- **What was difficult or surprising:** Existing generic copy cannot distinguish email quota from request throttling.
- **Trade-offs and alternatives considered:** Cosmetic message changes do not lift hosted quotas. Removing verification would change account security and was not chosen.
- **What I would improve next:** Once settings/error code are available, apply the matching provider fix and distinguish email-delivery quota in UI if useful.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Do not treat localhost redirect or resend visibility fixes as changes to hosted email limits.
- **Dependencies / assumptions:** Need owner confirmation of SMTP configuration or secure management access. Custom SMTP additionally requires a provider and verified sender.
- **Risks / integration concerns:** Raising email quota without a configured sender cannot fix default SMTP; per-recipient cooldown and provider quotas also apply.
- **Questions / requested decisions:** Is custom SMTP enabled? Founder version remains unknown.

## Follow-up and handoff
- **Remaining work:** Inspect hosted configuration/log code; configure SMTP if absent or adjust verified custom-provider email quota; test owner-requested registration afterward.
- **Recommended next steps:** Follow operator instructions; never paste SMTP passwords or access tokens into chat.
- **Relevant references:** https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/rate-limits.
