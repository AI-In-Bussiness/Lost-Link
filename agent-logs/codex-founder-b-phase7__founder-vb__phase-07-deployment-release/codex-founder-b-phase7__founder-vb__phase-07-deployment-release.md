# Phase Report: 07 — deployment release

## Metadata
- **Agent:** codex-founder-b-phase7 (Codex)
- **Founder version:** B, as assigned by the task owner
- **Phase:** 07 — deployment release
- **Status:** Blocked (repository release package delivered; hosted gate fails)
- **Date (UTC):** 2026-10-27
- **Task / issue:** plan.md Phase 7 LL-052–LL-056; issues #20 and #21
- **Branch / commit:** codex/founder-b-phase-7, based on main 77e46af122db4b566113345c167cca3b9bff5f39

## Objective and scope
- **Goal:** Validate the live deployment, production environment, rollback and locked demo release; ensure automated checks pass or open issues for failures.
- **In scope:** Public hosted smoke, source/check audit, repeatable release verification, production setup instructions, release pins, rollback procedure and candid gate record.
- **Out of scope:** Founder A UX/submission work and independent Overseer acceptance. No live data, migration, account, deployment alias or provider configuration was modified without access.

## Work performed
- Read current main, AGENTS, shared coordination, updated plan and Phase 1/5/6 handoffs. The checkout was clean; started from freshly fetched main.
- Checked managed-environment readiness: connected, no configured credentials, variables or outbound identities. No Vercel/Supabase connector or authenticated browser tools are available.
- Executed public production checks. Homepage/sign-in load; public school/inventory/search RPC-dependent requests return 503. Opened release-blocking issue #20 with observed request IDs and concrete operator recovery steps.
- Added credential-free release-smoke.mjs: sequential bounded requests, JSON/projection/school/seed/search contracts, denial/origin/header checks, fixed redacted diagnostics and nonzero failure exit. Added meaningful failure-path regressions and included both those tests and the real local smoke in Foundation CI.
- Audited actual baseline workflow jobs and latest applicable interface/relevance runs. Reran model calibration, frozen additional evaluation and fallback; preserved proposed gate failure and opened #21 as the updated plan requires.
- Added production Config/Secret mapping, hosted schema/account checks, immutable candidate pins, honest freeze conditions and rollback/recovery/rehearsal procedure. Candidate is explicitly blocked; no fictitious release tag/deployment or rollback success.
- **Files created or modified:** scripts/release-smoke.mjs; tests/release-smoke.test.mjs; scripts/test-live.mjs; package.json; .github/workflows/ci.yml; docs/phase-7/; root/docs indexes; coordination current state/board; this report and agent index.
- **Decisions made:** Preserve safe public errors; diagnose RPC failures through secure operator logs rather than exposing internals. Preserve model thresholds and diagnostic failure. Keep current application baseline hashes separate from the future accepted merge/deployment SHA.

## Validation and results
- **Commands / checks run:** `npm run test:release` 6/6 passed; `npm run lint` passed; `npm run typecheck` passed; `npm test` 46/46 passed; `npm run test:mocks` 14/14 passed; `node --test tests/local-supabase.test.mjs` 6/6 passed.
- `npm run test:search:model` passed real native inference/concurrency test; `npm run eval:search` passed 8/8 positives versus 5/8 keyword, zero four negative/trap results; `npx tsx tools/phase4/evaluate.ts fallback` passed.
- `npx tsx tools/phase4/evaluate.ts model` exited 1 with 16/16 core positives, five false positives and proposedGatePassed false. Issue #21 records this; it was not hidden or tuned away.
- `npm run build` passed; `npm run check:search:bundle` passed isolated traced native inference without runtime network. `git diff --check` passed.
- `node --use-env-proxy scripts/release-smoke.mjs https://lost-link-beta.vercel.app` exited 1: 7/17 public checks pass, ten public-data checks fail with 503. Exact redacted report in docs/phase-7/public-smoke.json. Anonymous 401 responses indicate some runtime Supabase configuration is present; they do not validate URL/key pairing or the hosted schema.
- Baseline main Foundation run 40444642079 and Linux/Windows helpers 40444642093 succeeded. Foundation jobs confirm SQL, repeatable accounts, build/bundle, live HTTP/photo and persisted browser steps succeeded against disposable local Supabase. Latest applicable interface 40410170406 and relevance diagnostic 40410170378 also succeeded; diagnostic success does not mean its optional quality gate passed.
- **Tests not run:** Hosted authenticated account/browser/photo workflow, provider environment/schema inspection, production rollback or rehearsal: no provider credentials, known-good deployment ID or secure demo password. New branch full CI results will be appended after publication; baseline checks are not represented as checks of new scripts.
- **Deliverables:** docs/phase-7/README.md; public-smoke.json; release-candidate.json; issue #20 (production blocker); issue #21 (known relevance quality failure).

## Thoughts and reflections
- **What worked well:** Public API checks distinguished a loading shell from usable inventory. Existing local suites already cover deep permissions/photos/persistence; the new smoke verifies a deployed composition without privileged secrets.
- **What was difficult or surprising:** Anonymous routes and origin checks can pass while all RPC-backed public inventory fails. Provider Ready status and CI are insufficient to diagnose configuration/schema health.
- **Trade-offs and alternatives considered:** A credential-free smoke cannot prove an authenticated photo/claim journey or deployment identity. A blocked candidate plus explicit operator checklist is more useful than inventing a healthy release or weakening acceptance. No speculative backend fix was made without the underlying hosted error.
- **What I would improve next:** Secure provider access, inspect RPC logs/history, complete hosted setup, run the actual full demo, and establish a compatible known-good rollback target before freezing.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A should use the same accepted immutable deployment for final UX/Phase 0–6 review; do not treat a local mock or HTML 200 as a working submission. Overseer should independently verify the hosted return journey and review #21's quality evidence.
- **Dependencies / assumptions:** Intended Vercel project ddar2425s-projects/lost-link and historical Supabase ref ldhwtrxhmaanfcgmtsbp require operator confirmation. Production variable values and migration history were not observed.
- **Risks / integration concerns:** Pin file currently references integrated application baseline; regenerate final source SHA after merge. No known-good hosted rollback target exists in recorded evidence. Never revert database migrations/reset claims/photos to demonstrate rollback.
- **Questions / requested decisions:** Operator must finish/confirm secure Vercel and Supabase configuration. Founders/Overseer must decide relevance acceptance from frozen evidence; no general accuracy is claimed.

## Follow-up and handoff
- **Remaining work:** Resolve #20, complete hosted secure account/photo-return/persistence/denial checks, record deployment identity, rehearse rollback, resolve/review #21, independently accept and lock final SHA/tag.
- **Recommended next steps:** Review/merge the verification package after CI, then follow docs/phase-7/README.md with secure provider access. Rerun smoke after configuration changes; keep phase blocked until actual hosted evidence passes.
- **Relevant references:** plan.md Phase 7; docs/phase-6/README.md; docs/phase-1/README.md; docs/coordination/task-board.csv; issues #20/#21.

## Publication and CI addendum — 2026-10-27 UTC

Published ready-for-review PR #22. Both Linux/Windows helper workflows on the initial
push/PR checks passed. Initial Foundation runs 40522623001 and 40522669854,
including retries, failed before tests because GHCR rate-limited the pinned
Supabase image download. Opened issue #23 and added read-only built-in token
authentication via docker/login-action; preserved image pins and every database,
HTTP and browser assertion. Final post-mitigation run evidence is maintained in
PR #22 and issue #23 rather than inferred from these failed attempts.

Also reran all eight native Phase 4 tooling regression tests successfully.
Production acceptance remains blocked regardless of CI outcome.

Authenticated GHCR pulls also hit the registry limit. Added a single conditional
startup fallback to Supabase's original official public ECR registry using the
same CLI-pinned versions. It triggers only on a rate-limit diagnostic; unrelated
startup/SQL errors and every test still fail normally. No reset is performed.
A local database startup attempt was stopped during image download; no local
integration success is claimed.
