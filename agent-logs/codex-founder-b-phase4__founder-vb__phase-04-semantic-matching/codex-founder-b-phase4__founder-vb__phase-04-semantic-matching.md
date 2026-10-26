# Phase Report: 04 — Semantic matching

Current revision: the task owner requested a free solution without an inference API. The local-model addendum below supersedes the original paid-provider design and credential blocker; the original checkpoint is preserved as history.

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

## Validation addendum — 2026-10-26 UTC

- Final local unit run: 38 passed, 0 failed; lint and typecheck passed again after adding the evaluator and twelve-case fallback check.
- `npm run db:start` began fresh Docker image downloads. This local attempt was explicitly interrupted before startup completed; it is not a SQL validation result. No data reset or hosted mutation was performed. SQL/live/browser checks remain pending in [Foundation CI](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40376805286); the [interface workflow](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40376805145) also started. At this checkpoint Foundation CI was installing browser dependencies, not yet executing SQL tests.
- Delivered checkpoint `5cc9c7531e47888cef68c45dc8f0d8c97d2a1391` in draft [PR #12](https://github.com/AI-In-Bussiness/Lost-Link/pull/12). This addendum records handoff evidence; no merge or hosted deployment occurred.


## Free local model revision — 2026-10-26 UTC

- **Authorization / status:** Task owner requested “without the api and free and update PR.” Local-model replacement completed; independent Phase 4 acceptance and hosted validation remain separate. Same agent, Founder B, phase 04 and PR #12.
- **Work:** Replaced OpenAI HTTP embedding calls with the actual Apache-2.0 MiniLM q8 model running on the app CPU through Transformers.js/ONNX Runtime. No API key, inference API or per-query inference fee. One-time static public model downloads occur during setup/build; runtime remote loading and fetch are disabled. Existing hosting resources still have their ordinary limits/costs.
- **Resources/privacy:** One worker handles chunks of four texts on one native inference thread; busy requests fall back immediately. A 15-second deadline terminates a stuck worker. Retained public field projection, tenant/date/category/color scope, 50-item complete-inventory bound and revalidation after inference. Vectors/queries remain ephemeral and unlogged. Pinned file lengths/hashes are verified at setup and worker load.
- **Files:** Reworked src/lib/search/{embeddings,ranking,server,service}.ts; added local-worker.mjs/model-manifest.json; dependency/lockfile and CPU installer configuration; pinned model downloader; offline evaluation/inventory/result artifact; real-model integration test; isolated Next traced-bundle check; updated Next config, CI, documentation, environment example and backend smoke assertions. Added Apache license/attribution and ignored downloaded weights. Removed the earlier unmerged semantic-budget migration/test and their runner entry; original pre-Phase-4 migrations are untouched.
- **Decisions / reflections:** A free pretrained neural model preserves paraphrase retrieval; a synonym map would not be an equivalent replacement. The model runs within existing Node hosting, avoiding another service. Packaging native dependencies and model files matters as much as passing source-tree tests: the isolated trace check executes inference using only deployment-traced files. npm 11 warns about the vendor-specific installer option but passes it correctly; CPU binaries are already bundled and optional CUDA downloads are skipped.
- **Actual relevance evidence:** Twelve fixed queries, ten fictional items including eight distractors. Actual offline local inference found 8/8 positives in top three versus 5/8 for the deterministic keyword counterpart, no results for four negative/wrong-school cases and zero school leaks. Recorded in docs/phase-4/evaluation-results.json. This is calibration, not held-out quality: initial inherited cosine gates found only 5/8; gates were adjusted to minimum 0.30, top-two gap 0.05 and within 0.10 of the best. The separate live evaluator uses actual SQL/HTTP and remains unexecuted locally.
- **Validation:** npm run model:download verified all pinned files. npm run lint, npm run typecheck, npm test (38 unit tests), npm run test:search:model (one actual native-model test including concurrency/normalization/reuse), npm run eval:search, npm run build and npm run check:search:bundle passed. The isolated traced bundle successfully loaded native dependencies/model and produced 384-dimensional vectors with runtime networking disabled. All twelve failure-path checks remain. Remote CI is updated to run the actual model/evaluation/package checks; final commit CI state is tracked in PR #12. No hosted deployment, full local Supabase HTTP/browser rerun or independent acceptance is claimed.
- **Handoff:** No new database migration or OPENAI_API_KEY is needed. npm run build automatically installs/verifies model assets. Force keywords with LOSTLINK_SEMANTIC_SEARCH=false. Hosted Node must support native addons/worker threads and match the build architecture; Edge isolates are unsupported. Further work: independent review, held-out/multilingual relevance data, persistent indexing if scale warrants it, and hosted verification.

## CI runner repair — 2026-10-26 UTC

Task owner supplied failed Phase 4 relevance checks and requested a fix. Synchronized the shared branch to Founder A commit `474cab3`, preserving all added cases, UI changes and reports. Both failing relevance jobs stopped before inference because tsx compiled the evaluator as CommonJS, which cannot execute its top-level await. Added `tools/phase4/package.json` with `type:module` scoped only to the tool directory, plus a subprocess regression test exercising the actual CI entry point and all 28 fallback cases. The whole app's module mode is unchanged.

Also moved relevance exit-status assignment after native-worker cleanup so a failed proposed quality gate is reported accurately. Local validation: eight tooling tests, lint and typecheck pass; fallback emits all 28 cases and preserves baseline results. Actual model evaluation executes successfully and reports 16/16 core hits, MRR 0.96875 versus keyword 0.9375, but five negative/trap cases contain false positives. It correctly exits 1 for that proposed quality gate. The existing explicitly diagnostic quality step remains unchanged, with its failure/report visible in the workflow artifact and summary. No test labels, model thresholds or gate requirements were relaxed or tuned to this additional set. Independent relevance acceptance remains open; this repair addresses the CI runner failure rather than asserting that all relevance targets are met. Remote check results are tracked in PR #12.
