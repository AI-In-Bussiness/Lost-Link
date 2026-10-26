# Phase Report: 04 — Search cases and explanations

## Metadata
- **Agent:** codex-founder-a-04 (Codex)
- **Founder version:** A (task-owner assignment)
- **Phase:** 04 — search-cases
- **Status:** Blocked (deliverables implemented; full validation/acceptance pending)
- **Date (UTC):** 2026-10-26
- **Task / issue:** Task-owner request; plan.pdf Phase 4, LL-031–LL-037; PR #12
- **Branch / commit:** codex/founder-b-phase-4; Founder B baseline ed570ea

## Objective and scope
- **Goal:** Deliver realistic matching cases and clear result-card explanations.
- **In scope:** Additional frozen fictional relevance set, reproducible model/fallback evaluator, UI copy, focused tests and diagnostics.
- **Out of scope:** Ranking tuning, model replacement, database changes, hosted deployment and independent gate approval.

## Work performed
- Read root instructions, shared hub/state/board/integration checklist, product scope, original PDF and upstream Phase 4 implementation.
- Identified the existing shared PR #12 and preserved Founder B's concurrent transition from paid inference to local MiniLM.
- Created 18 fictional public items with distractors and 28 labeled/rationalized cases including date/category/color exclusions and wrong-school traps.
- Added a model runner using the existing semanticSearch/embedder unchanged, baseline comparison, top-three/MRR scoring, school/filter leakage checks and deterministic failure-path verification.
- Labeled match reasons and exposed them as escaped list items; added accurate search-method, ownership and private-evidence guidance with associated help/error text.
- Added seven tests and a separate diagnostics workflow; existing Foundation checks remain intact.
- **Files created or modified:** src/interface/{public,shared}.ts; tools/phase4/; .github/workflows/phase4-relevance.yml; docs/phase-4/founder-a-handoff.md; shared coordination/index links; this report.
- **Decisions made:** Keep new cases separate from the tuned calibration set; do not alter ranking to satisfy proposed targets; do not seed another demo or infer ownership.

## Validation and results
- **Commands / checks run:** pdftotext original plan; remote GitHub reads/diff inspection; node --test --test-isolation=none tools/phase4/*.test.mjs — 7 passed. Local Git fetch and curl to npm registry both failed connecting to the configured proxy at port 8080.
- **Tests not run:** Local npm lint/typecheck/build, real-model/fallback runner, SQL/HTTP/browser suites: dependencies/services cannot be retrieved through the unreachable shell proxy. New diagnostics are published for remote execution; no remote success is assumed.
- **Deliverables:** docs/phase-4/founder-a-handoff.md; tools/phase4/relevance-set.json and evaluate.ts; shared draft PR #12.

## Thoughts and reflections
- **What worked well:** Native Node 24 stripping allowed direct tests of actual UI views and scoring without installing packages; GitHub connection remained usable.
- **What was difficult or surprising:** The remote branch advanced during orientation; its new local inference invalidated the earlier provider wording. Refreshed the branch and aligned the copy before publication. Initial date test mistakenly excluded unrelated same-date candidates; corrected the expectation to exclude only the older duplicate.
- **Trade-offs and alternatives considered:** A fixed additional set offers more evidence than expanding a calibration score after tuning. Offline tests avoid database writes, but cannot establish RLS or persisted application behavior.
- **What I would improve next:** Inspect additional-set model errors before changing gates, collect independently labeled queries, and obtain live database/browser evidence.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder B: inspect exact case IDs in the diagnostics artifact; retain false-positive/miss results without tuning this set and claiming independent accuracy. Overseer: review relevance labels, proposed targets and the distinction between diagnostics and acceptance.
- **Dependencies / assumptions:** Node 24; current local MiniLM implementation at ed570ea or compatible successor; npm dependencies/model assets for evaluation.
- **Risks / integration concerns:** Keyword comparator is an offline counterpart, not actual SQL. Diagnostic workflow permits the proposed quality step to fail visibly while uploading results; a green workflow is not a relevance pass. No model results are claimed from local UI/scorer tests.
- **Questions / requested decisions:** Founders/Overseer should agree the proposed 14/16 positive top-three target and labels after inspecting the first recorded run.

## Follow-up and handoff
- **Remaining work:** Remote model/fallback checks, full CI, browser layout/accessibility review, independent relevance/phase acceptance and hosted verification.
- **Recommended next steps:** Run the commands in the handoff; inspect quality-step outcome and JSON artifact; review failures and labels before adjusting ranking.
- **Relevant references:** plan.pdf Phase 4; docs/phase-4/README.md; docs/phase-4/founder-a-handoff.md; AGENTS.md; docs/coordination/task-board.csv; PR #12.
