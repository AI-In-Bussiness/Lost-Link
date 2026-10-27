# Phase Report: 06 — Demo reliability

## Metadata
- **Agent:** codex-founder-b-phase6 (Codex)
- **Founder version:** B
- **Phase:** 06 — demo-reliability
- **Status:** Completed (engineering package; independent judging remains separate)
- **Date (UTC):** 2026-10-26
- **Task / issue:** Fully do Phase 6 Founder B; plan.md LL-046–LL-051
- **Branch / commit:** codex/founder-b-phase-6; baseline main f18076d

## Objective and scope
- **Goal:** Reproducible synthetic demo, stable identities, honest matching evidence and operational recovery.
- **In scope:** Existing seed/provisioner replay verification, read-only application-data preflight, CI integration, rehearsal/evidence/recovery instructions.
- **Out of scope:** Founder A pitch/visual work, independent judge acceptance, hosted deployment, password rotation or shared-data reset.

## Work performed
- Read original plan assignment, repository/shared guidance, existing seed, account provisioner, local service runner, model evidence and live tests. Confirmed Phase 5 PR14 is open; used main as required.
- Added demo:check to verify real sign-in, exact roles, owner receipt access, published synthetic schools/showcase items, safe public projection and foreign-school inventory denial. Optional --app validates real HTTP readiness.
- Added test:demo to replay the seed/provisioner twice on the disposable local stack, intentionally provide a different second password, then verify original passwords and identities/access are unchanged. It never resets data or changes existing passwords.
- **Files created or modified:** scripts/verify-demo.mjs; scripts/test-demo-repeatability.mjs; package.json; Foundation workflow; docs/phase-6/README.md; board/index/report.
- **Decisions made:** Preserve the existing two-item seed and four identities rather than invent a competing dataset. Keep showcase items available; create a new photographed intake per rehearsal. Use actual local-model calibration and additional frozen diagnostics, including failures, as evidence.

## Validation and results
- **Commands / checks run:** lint/typecheck and full Foundation run recorded in final addendum; test:demo runs against real local Auth/Postgres. Existing tests continue to cover real photo upload, review/publication, claim approval/return, tenant denial, refresh persistence and keyword/model fallback.
- **Tests not run:** Hosted rehearsal/deployment and independent judging; no secure hosted password or target write was requested. No passing model general-accuracy claim is made.
- **Deliverables:** docs/phase-6/README.md contains complete setup, account roster, matching evidence, repeatable journey and recovery procedures.

## Thoughts and reflections
- **What worked well:** Existing stable UUID seeds and non-destructive provisioning support repeatability without a reset tool.
- **What was difficult or surprising:** Reprovisioning with a new password preserves an existing password, so successful account creation logs alone cannot establish sign-in readiness. The preflight checks actual authentication.
- **Trade-offs and alternatives considered:** New fixed claim fixtures would be consumed on return. Fresh staff intake keeps the story repeatable while preserving audit history and showcase search items.
- **What I would improve next:** Rehearse the complete verified release on the selected hosted environment during Phase 7 and collect independent judge feedback.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A can build the pitch around the documented live journey and exact measured evidence. Overseer should judge the three biggest remaining weaknesses separately. Preserve known additional-set false positives in presentation/evidence.
- **Dependencies / assumptions:** Existing synthetic seed/migrations, Node24/npm11/Docker and securely supplied original demo password. Phase5 PR14 remains separately open at orientation.
- **Risks / integration concerns:** Seed replay intentionally preserves reserved/returned items and mismatched memberships. Preflight fails visibly; it does not repair them. Local CI-generated passwords are disposable and not rehearsal credentials.
- **Questions / requested decisions:** None blocking this engineering package; hosted release acceptance remains Phase7/Overseer work.

## Follow-up and handoff
- **Remaining work:** Independent judging/presentation acceptance and hosted Phase7 verification.
- **Recommended next steps:** Review PR, integrate with Phase5, run preflight and matching evidence on the intended rehearsal machine, then follow the fresh-intake journey.
- **Relevant references:** plan.md Phase6; docs/phase-6/README.md; docs/phase-4/evaluation-results.json; PR14; Foundation workflow.

## Final evidence and handoff

Delivered ready-for-review PR15: https://github.com/AI-In-Bussiness/Lost-Link/pull/15. Initial full real-stack run 40404673688 passed. During validation main advanced to e913f89 with the Windows launcher fix; merged it cleanly, retaining both contributions and reports. All six helper tests, lint and typecheck passed locally afterward. Final combined code f7b6c754e372cca05f7f51e666fa2bcd12336dcf passed Foundation run 40405351921 and Windows/Linux helper run 40405351767.

Foundation verified the new seed/account test against real disposable Supabase: two non-destructive seed replays, two provisioning attempts with different supplied passwords, original-password login, unchanged user IDs, exact memberships, public projection, owner receipt reads and foreign-school denial. It also passed all existing SQL, unit/mocks, actual model checks/evaluation, production build, isolated traced inference, Auth/backend/photo HTTP and persisted browser/accessibility journeys. No required check was disabled. Moved Chromium installation after account/data checks to report readiness failures earlier; all browser checks remain enabled.

Matching evidence was rerun locally: calibration exit0, 8/8 positive top-three hits versus 5/8 baseline, zero calibration negative/trap results; additional frozen evaluation exit1, 16/16 positive hits but proposed gate false; fallback exit0 across 28 cases. Runbook retains those limits honestly.

Verified runs: https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40405351921 and https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40405351767. Founder B Phase6 engineering deliverables complete. Board remains Review pending independent judging; no self-asserted Overseer approval, hosted rehearsal, data reset, password rotation, deployment or PR merge. Final documentation-only commit records the tested code state; any new automatically triggered workflow is separate from that evidence.
