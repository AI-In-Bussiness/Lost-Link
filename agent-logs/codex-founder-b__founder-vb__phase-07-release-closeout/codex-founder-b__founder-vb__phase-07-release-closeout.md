# Phase Report: 07 — Release closeout

## Metadata
- **Agent:** codex-founder-b (Codex)
- **Founder version:** B
- **Phase:** 07 — release-closeout
- **Status:** Blocked
- **Date (UTC):** 2026-10-28
- **Task / issue:** Finish Founder B Phase 7; PR #33
- **Branch / commit:** codex/founder-b-phase-7; base f357818, application ae883e6

## Objective and scope
- **Goal:** Validate production, rollback readiness and the locked release against actual evidence.
- **In scope:** Fresh public checks, runtime access inspection, executable evidence/pin validation and existing release PR.
- **Out of scope:** Invented approval, unsupplied credentials, database reset or unverified release tagging.

## Work performed
- Synchronized the checkout from integrated main and reused the existing Phase 7 PR source branch. Preserved its earlier reports and candidate application revision.
- Runtime status reports current observations, enforced unrestricted HTTP policy, no ready secrets/runtime identities. Requested secure operator access without asking for values in chat.
- Rechecked the public production site and Auth redirect behavior without registering accounts or sending email.
- Added release-readiness.mjs, seven tests and release:verify; test:release runs those tests in CI. The checker verifies pins, complete migration coverage, public report contents and required hosted/reviewer evidence, with redacted failures and constrained evidence paths.
- Saved fresh public evidence and a failing readiness audit. Kept candidate blocked, deployment/rollback/tag unknown, and issue #32 unresolved.
- **Files created or modified:** scripts/release-readiness.mjs; tests/release-readiness.test.mjs; package.json; docs/phase-7/README.md, release-candidate.json, readiness-public.json, readiness-audit.json; coordination board; this report.
- **Decisions made:** Keep provider operations blocked until credentials are securely configured. A complete public smoke is insufficient to declare a locked release.

## Validation and results
- **Commands / checks run:** Production release-smoke.mjs passed 17/17; auth-redirects.mjs check with explicit production origin/project ref passed 3/3. npm run test:release passed 21/21. npm run lint passed. release:verify exits 1 as expected: pins/public report pass; hosted/rollback/acceptance gates fail closed. git diff --check passed.
- **Tests not run:** Hosted account preflight, SMTP delivery, photographed claim/return and rollback rehearsal: no provider credentials/original demo password. Application build/full local suites not repeated for this release-tool-only change; prior PR exact-head Foundation/helper checks are successful.
- **Deliverables:** Readiness command, regression tests, current public evidence and explicit blocked audit.

## Thoughts and reflections
- **What worked well:** Existing public smoke and exact application pins make the candidate reproducible; assertions prevent a green homepage being confused with authenticated readiness.
- **What was difficult or surprising:** The repo advanced through Phase 7 already, but its remaining work still depends on operator access. The initial Auth invocation omitted required arguments; corrected it and verified all three explicit-target checks.
- **Trade-offs and alternatives considered:** Added a consistency auditor rather than pretending a manual JSON record proves hosted operations. It does not authenticate evidence provenance or certify runtime/provider state.
- **What I would improve next:** Collect real provider/journey/rehearsal evidence and independently review it; then select the accepted immutable deployment and tag.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Matching owners/reviewer must resolve #32 using supported relevance criteria or a validated fix, without relabeling the frozen set as blind data or weakening assertions. Founder A/Overseer submission and final acceptance remain separately owned.
- **Dependencies / assumptions:** Runtime secrets must be configured securely and observed ready; deployments/schema must match the intended existing project.
- **Risks / integration concerns:** Manual evidence files can be forged; readiness checks consistency only. Local hashes/public HTTP do not verify deployed schema/configuration. Never replay initial hosted DDL or rotate demo passwords casually.
- **Questions / requested decisions:** Secure operator access requested; independent relevance and release decisions remain required.

## Follow-up and handoff
- **Remaining work:** Secure hosted access, provider/schema inspection, hosted memberships/photo/claim/return, actual confirmation delivery, compatible rollback rehearsal, relevance acceptance and independent final sign-off.
- **Recommended next steps:** Configure secure access as in hosted-access.md, inspect target state, run the documented journey and rollback rehearsal, attach real evidence, rerun release:verify and only then lock an accepted release.
- **Relevant references:** docs/phase-7/README.md; docs/phase-7/hosted-access.md; docs/phase-7/release-candidate.json; PR #33; issue #32.
