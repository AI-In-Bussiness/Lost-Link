# Phase Report: 04 — Relevance repair

## Metadata
- **Agent:** codex-founder-b (Codex)
- **Founder version:** B
- **Phase:** 04 — relevance-repair
- **Status:** Completed (implementation; independent acceptance pending)
- **Date (UTC):** 2026-10-28
- **Task / issue:** GitHub issue #32
- **Branch / commit:** codex/founder-b-phase-7, based on 5a5478f; integrated main ae883e6 remains an ancestor

## Objective and scope
- **Goal:** Fix the reproduced negative/trap failures without weakening frozen expectations or describing known data as blind validation.
- **In scope:** Shared search eligibility, model/structured fallback, candidate overfetch, evaluation/CI and actual HTTP regressions.
- **Out of scope:** Hosted data/provider changes, migration changes, model/threshold tuning, release lock or independent approval.

## Work performed
- Reproduced 16/16 core positives and five false positives with the actual pinned local model.
- Added whole-word/anchor eligibility and explicit supported object-type/color checks. Applied them to normal, disabled/unavailable/busy fallback and fresh-inventory recovery.
- Overfetched up to 50 SQL candidates before guarded ranking/limit; retained raw SQL/browse as high-recall sources, preserving migrations.
- Updated offline evaluators to use the same production guard, without changing frozen labels/scorer/thresholds. Added a known supplementary regression set, including matching objects to disprove query blacklisting.
- Added actual local HTTP enabled/disabled testing with disposable organizations, higher-scoring sleeve and a real matching laptop at limit=1. CI now fails relevance regressions rather than tolerating them.
- **Files created or modified:** src/lib/search/{eligibility,ranking,service}.ts; src/lib/api/handler.ts; scripts/evaluate-search*.ts; scripts/test-search-relevance.mjs; tests/search-eligibility.test.ts and semantic-search.test.ts; tools/phase4 evaluation and supplementary cases; CI/package scripts; docs/phase-7 issue evidence; coordination board; this report.
- **Decisions made:** Fixed eligibility rather than increasing similarity cutoffs or changing labels. Curated object aliases are explicit English heuristics; unrecognized paraphrases retain inference.

## Validation and results
- **Commands / checks run:** Frozen 28-case model gate passes 16/16 core hits, zero false positives/leaks; corrected fallback 13/16, zero false positives/leaks. Additional 27-case model/fallback both pass 19/19 with zero false positives/leaks. Original 12-case calibration remains 8/8 positives, zero negatives/traps. 56 unit tests and nine tool tests pass; lint/typecheck/build pass. Actual HTTP enabled/disabled cases pass, including no-match, correct object, limit and scope. git diff --check passed.
- **Tests not run:** Hosted mutation/verification without operator credentials; unchanged SQL/claim lifecycle/browser suites not repeated locally for this search-only correction (CI retains them).
- **Deliverables:** docs/phase-7/issue-32.md with raw final JSON, guard, regression suite and mandatory CI quality checks.

## Thoughts and reflections
- **What worked well:** Whole-object eligibility separates returned inventory from components mentioned in descriptions. Positive counterparts test that unsupported inventory is not implemented as a query blacklist.
- **What was difficult or surprising:** Fixing only colors/weak words cleared the frozen gate but failed additional queries. Explicit recognized type checks repaired that broader confusion. Early guards also lost the holdall paraphrase; recognizing supported type aliases restored it without reducing numerical gates.
- **Trade-offs and alternatives considered:** Stricter fallback loses three paraphrase hits versus raw keywords but eliminates false positives; the actual model restores all frozen positives. An explicit vocabulary is reviewable but cannot cover all language or ambiguous accessories. No general-accuracy claim.
- **What I would improve next:** Independently authored blind data, broader language coverage and provider-deployed verification after merge.

## Cross-agent and cross-phase comments
- **For agents on other phases:** The structured HTTP fallback contract changes; raw SQL lists are candidate sets. Explain keyword unavailability honestly. No ownership probability or cross-school retrieval is introduced.
- **Dependencies / assumptions:** Correct caller-scoped public RPC, existing model bundle and public DTO fields. The 50-candidate showcase bound remains explicit.
- **Risks / integration concerns:** Conservative aliases/color rules can miss ambiguous descriptions. Current additional cases were written after inspecting the failure, not held-out. Historical failing evidence and blocked release record are preserved.
- **Questions / requested decisions:** Independent matching review and wider release acceptance remain separate from this code fix.

## Follow-up and handoff
- **Remaining work:** Exact-head remote checks, review/merge and hosted verification. Overall Phase 7 rollback/account/acceptance gates remain open.
- **Recommended next steps:** Review/merge Fixes #32, deploy the accepted source, rerun public checks and independently evaluate matching before recording release acceptance.
- **Relevant references:** GitHub #32; PR #33; docs/phase-7/issue-32.md; original frozen set and closeout reports.

## Integration addendum — 2026-10-28 UTC

- **Request:** Resolve the merge conflicts shown for PR #33 after PR #36 landed.
- **Work performed:** Merged main `846aacf` into the existing shared source branch
  from `1456949`, preserving both commit histories. The only textual conflicts
  were `docs/coordination/current-state.md` and `task-board.csv`; retained both
  landing-page and Phase 7/search records, with the newer completed auth status
  rather than the older In Progress row. Reviewed automatic merges in the public
  interface and CSS to preserve landing-page and staff photo shortcuts together.
- **Validation:** Lint, root and interface typechecks, interface formatting,
  56 unit tests, 14 mock tests and nine relevance tooling tests pass. Production
  build passes. Actual pinned-model frozen relevance remains 16/16 and additional
  relevance 19/19, both gates passing. Real HTTP relevance passes with model
  enabled and disabled, including the object counterexample, scope and limit=1.
- **Browser checks:** All 19 standalone browser journeys pass, including landing
  links/directory recovery, responsive/axe, claims and mock photo publication.
- **Reflections:** Independent additions to shared status documents require
  combining attributed histories rather than selecting a whole side. No search
  implementation or landing-page behavior needed a conflict-resolution rewrite.
- **Handoff:** Push this merge commit through the existing PR #33; repeat exact-head
  remote checks. This task resolves merge conflicts and does not claim production
  deployment or independent Phase 7 acceptance. No hosted mutations or unrelated
  lifecycle/database reset were performed.
