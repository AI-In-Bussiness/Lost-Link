# Phase Report: 04 — Semantic matching

## Metadata
- **Agent:** codex-founder-b-phase4 (Codex)
- **Founder version:** B
- **Phase:** 04 — semantic-matching
- **Status:** Blocked (implementation checkpoint delivered; full quality/acceptance gate pending)
- **Date (UTC):** 2026-10-26
- **Task / issue:** Task owner: “start on founder B phase 4”
- **Branch / commit:** codex/founder-b-phase-4; baseline main b70777e; checkpoint commit contains this report.

## Objective and scope
- **Goal:** Start Phase 4 with a reviewable, opt-in semantic search path and repeatable evaluation.
- **In scope:** Public text embeddings, bounded school-filtered retrieval, hybrid ranking, deterministic explanations, automatic structured fallback, provider budget, UI metadata, synthetic evaluation and tests.
- **Out of scope:** Hosted deployment, real-user enablement, persistent vector indexing, image recognition, claim approval changes and Phase 5+.

## Work performed
- Verified GitHub PR context and synchronized remote main; local starting tree was clean and matched main b70777e. Created a focused PR branch in the existing checkout.
- Read AGENTS.md, shared hub/current-state/integration, README, Phase 0 scope/architecture and Phase 3 handoffs, plus Next.js route and server boundary documentation.
- **Files created or modified:** src/lib/search/{ranking,embeddings,service,server}.ts; src/lib/api/handler.ts; src/interface/{contracts,http,public}.ts; additive SQL migration and tests; tests/semantic-search.test.ts; tests/interface-http.test.ts; scripts/{test-database.mjs,evaluate-search.ts}; package.json; .env.example; docs/phase-4/; shared navigation/state/board; this report.
- **Decisions made:** Use on-demand embeddings for <=50 eligible public items rather than introduce background indexing before a relevance baseline exists. Overflow falls back across the complete structured inventory. Keep a fixed model/dimension/timeout, per-school shared budget and explicit enable flag. Use fixed explanations instead of generated claims or ownership confidence. Record these as provisional demo choices, not a scalable production architecture or jointly accepted gate.

## Validation and results
- **Commands / checks run:** npm_config_https_proxy="$HTTPS_PROXY" npm ci passed after plain npm ci failed during Supabase CLI download (installer did not use the inherited proxy automatically). npm run lint and npm run typecheck passed. npm test: 38 passed. npm run test:mocks: 14 passed. npm run build passed. git diff --check passed.
- **Tests not run:** Real-provider `npm run eval:search` requires OPENAI_API_KEY, which is not configured in this environment; no relevance results are invented. SQL/live/browser verification awaits local service startup and remote CI; see subsequent addendum for actual results. No hosted checks or manual assistive-technology audit.
- **Deliverables:** docs/phase-4/README.md documents API metadata, algorithm/configuration, rollout, budget, privacy and limits. Twelve fixed labeled queries and a localhost-only evaluator compare real baseline RPC and HTTP search. Unit fallback checks exercise all twelve queries using a failing provider; these prove control flow, not relevance.

## Thoughts and reflections
- **What worked well:** Existing caller-scoped public RPCs already enforce organization/status/filters and preserve the private proof boundary. The original structured path can remain the fallback.
- **What was difficult or surprising:** The environment restoration had no installed dependencies or Docker images. Prior validation reports describe prior runs and cannot substitute for new checks. Hosted credentials and a provider key are absent.
- **Trade-offs and alternatives considered:** A persistent pgvector index would reduce repeated embedding cost, but requires versioned indexing, update/deletion invalidation, job authorization and evaluation. The bounded on-demand path avoids stale persisted vectors and stays within the small demo scope; it is deliberately inefficient for repeated searches.
- **What I would improve next:** Add distractor-rich evaluation inventory, review labels/thresholds, then choose persistent indexing based on measured quality and scale requirements.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A can use method/reasons and optional search metadata without a schema-breaking transport change. The shared UI now reflects actual hybrid usage/fallback. Overseer should independently examine filtering/privacy, budget behavior, freshness checks and real-provider evaluation before accepting Phase 4.
- **Dependencies / assumptions:** Current main contains integrated Phase 3 and the UI redesign. New quota RPC needs the additive migration; if missing, paid calls are skipped and keyword fallback works.
- **Risks / integration concerns:** At most 50 eligible items, 20 batches per school/hour, uncalibrated cosine threshold 0.45, repeated inventory embeddings, public shared quota exhaustion, and user-entered query text sent to the provider when enabled. No query/vector persistence or application logging. Review data handling/privacy notice before enabling for real users.
- **Questions / requested decisions:** Founder A/Overseer should approve evaluation labels and acceptance thresholds based on a real-provider run. This request does not block shipping the disabled implementation for review.

## Follow-up and handoff
- **Remaining work:** Real-provider evaluation, relevance calibration/distractors, independent review and hosted validation. Local/remote database checks tracked below.
- **Recommended next steps:** Apply the additive migration to the local disposable stack, securely bind OPENAI_API_KEY, enable the flag locally, run npm run eval:search, review recorded metrics, and keep the draft PR open until the quality gate is satisfied. Do not interpret this checkpoint as completion of the whole team phase.
- **Relevant references:** docs/phase-4/README.md; docs/phase-0/product-scope.md; docs/phase-0/architecture-contract.md; docs/coordination/implemented-contract.md; upstream Phase 3 reports.
