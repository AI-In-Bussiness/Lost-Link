# Phase Report: 00 — Sign-up plan

## Metadata
- **Agent:** codex-issue-27 (Codex)
- **Founder version:** unassigned
- **Phase:** 00 — Sign-up plan
- **Status:** Completed
- **Date (UTC):** 2026-10-27
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/27
- **Branch / commit:** codex/convert-plan-markdown; baseline 567ad420f62f6b7c8e6c0580dc9994dc8a89928e

## Objective and scope
- **Goal:** Identify the missing registration flow and plan a focused implementation.
- **In scope:** Public claimant registration, confirmation, safe redirects, documentation and authentication tests.
- **Out of scope:** Staff provisioning, unrelated release findings and hosted operator credentials.

## Work performed
- Read AGENTS.md, README, DESIGN.md, coordination hub/state/board/integration, foundation/security handoffs, auth code, database permissions and CI.
- Verified issue #27 is the only open #27 in the connected repositories and requests website account creation.
- Verified the inactive existing branch is an ancestor of main; use it for a focused PR without creating a remote branch or changing PR26.
- Updated the old checkout to current main. A failed tracking-branch switch populated the index before failing; verified the index exactly matched a28578e and preserved it while correcting the local ref, then switched to main's contents.
- **Files created or modified:** This report; coordination board registration row.
- **Decisions made:** Reuse existing SSR Supabase client, same-origin bounded forms and exact redirect allowlist. Register ordinary claimants only. Use PKCE code exchange after email confirmation. Keep passwords and provider errors out of redirects and logs.

## Validation and results
- **Commands / checks run:** Git status initially clean; remote/main fetched at 567ad42; merge-base verified inactive branch ancestry; npm ci passed on Node 24.19.0/npm 11.9.0.
- **Tests not run:** Implementation checks belong to the next phase.
- **Deliverables:** This plan and scoped board ownership.

## Thoughts and reflections
- **What worked well:** Existing authentication utilities already provide the required request and redirect protections.
- **What was difficult or surprising:** Fresh runtime contains an old checkout and no cached Docker images; the restored branch configuration only fetches main.
- **Trade-offs and alternatives considered:** Email confirmation preserves the confirmed-account model; client-selected roles and privileged signup APIs are unnecessary.
- **What I would improve next:** Exercise signup through the real HTTP/mail/confirmation path in CI.

## Cross-agent and cross-phase comments
- **For agents on other phases:** PR26's release documents remain untouched. Local config changes do not change hosted Supabase Auth settings.
- **Dependencies / assumptions:** The public Supabase key and exact NEXT_PUBLIC_SITE_URL must be configured; hosted Auth must permit signup and the callback URL.
- **Risks / integration concerns:** Existing smoke test asserts signup is disabled and must be replaced with positive registration/confirmation and role-isolation coverage.
- **Questions / requested decisions:** Founder assignment was not provided; use unassigned per AGENTS.md. This metadata question does not block issue #27.

## Follow-up and handoff
- **Remaining work:** Implement and verify registration and confirmation; deliver through a PR into main and close issue #27 when integrated.
- **Recommended next steps:** Read installed Next.js route/page/cookie guides, then implement and validate the scoped change.
- **Relevant references:** AGENTS.md; docs/phase-1/README.md; src/lib/auth/security.ts; scripts/smoke-auth.mjs.
