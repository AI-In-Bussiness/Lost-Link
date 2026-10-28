# Founder B — Phase 4 local semantic matching

PR #12 now uses a free pretrained **MiniLM model on the app CPU**. There is no inference API, account, API key, per-query bill or outbound query transmission. Model files download once during setup/build; runtime loading is strictly local. Existing hosting still supplies CPU, memory and storage, so this does not promise unlimited free hosting.

## Setup and operation

Use the repository's Node 24/npm 11 versions:

```sh
npm ci
npm run model:download
npm run eval:search
npm run dev
```

`npm run build` also runs the downloader automatically. It retrieves four public files (about 23.7 MB total) from a pinned Hugging Face revision and checks exact lengths/SHA-256 hashes in `src/lib/search/model-manifest.json`. Valid existing files are reused. These are static model downloads, not a hosted inference API. A fully disconnected build can use previously verified `models/all-MiniLM-L6-v2/` assets. Model weights stay ignored by Git. The downloader copies the model license and attribution notice into the packaged directory.

The downloader also verifies and restores assets from `.next/cache/lostlink-model/<revision>/`, which Vercel persists between Next.js builds. Cache contents receive the same size/SHA checks as downloads. Transient HTTP/network failures get at most three attempts with bounded backoff; retries request a fresh upstream redirect. Partial or corrupt files are never published, and exhausted failures still stop the build with the asset name and HTTP status. Runtime inference remains offline. `npm run test:model-download` covers retry, corruption, partial-stream cleanup, cache restoration and diagnostics before CI fetches real assets.

The CPU binaries ship in the ONNX Runtime npm package. `.npmrc` sets its documented `onnxruntime-node-install=skip` flag to avoid optional CUDA downloads; npm 11 currently emits an unknown-config warning while passing it through to the installer. The pinned npm version supports this setting. No GPU is required.

Semantic matching is enabled when model files are installed; `LOSTLINK_SEMANTIC_SEARCH=false` forces keyword-only operation. `OPENAI_API_KEY` is no longer read or required. There is no new database migration. The earlier unmerged paid-provider budget migration and its test were removed from this PR; previous application migrations stay intact.

## Search and privacy

The existing same-origin POST search keeps `{data:[{item,reasons,method}]}` and adds `search:{mode:"structured"|"hybrid",semanticStatus:"disabled"|"available"|"unavailable"}`. The interface shows AI + keyword matching only when returned rows actually use semantic ranking, and shows a fallback notice if local inference is unavailable. Browsing without a query is unchanged.

The existing structured SQL search runs first. Candidate retrieval uses the caller-scoped public RPC: only available items in the requested published school, with category/color/inclusive date filters applied before inference. An allow-list embeds public title, description, category, color and broad location. Claims, proof, identifying details, storage locations, contact details, photos and filenames never enter the model. Queries and embeddings are neither persisted nor logged. The worker disables remote model loading and replaces its fetch function with a rejection, so an absent asset cannot silently trigger a download or remote inference.

The pinned model is `Xenova/all-MiniLM-L6-v2` at revision `751bff37182d3f1213fa05d7196b954e230abad9` (Apache 2.0), running q8 ONNX on CPU. Mean pooling and normalization produce 384-dimensional vectors. One native inference thread processes chunks of four texts, truncated at 256 tokens. The model cannot invoke tools or generate prose. Explanations are fixed signal descriptions, never ownership probabilities or proof.

One worker per search module handles at most one batch at a time; concurrent calls immediately use keyword fallback rather than queueing CPU work. A 15-second deadline terminates a stuck worker, allowing a later request to recreate it. At most 50 eligible items are embedded; larger inventories fall back to the full structured search instead of silently ranking only a first page. Model loading includes file-integrity checks. Warm weights remain in worker memory; no vector cache or persistent index is used.

Public inventory is re-read after inference. Visibility/content changes invalidate the batch and trigger a fresh structured search. Missing/corrupt files, a busy worker, unsupported native runtime, deadline or invalid vector output yield structured fallback. No service-role credential is used. Database errors retain the existing safe API behavior.

## Ranking and measured limits

Issue #32 follow-up: current ranking is `rrf-60-eligibility-v2`. See the
[repair evidence](../phase-7/issue-32.md). The numerical semantic thresholds
below are unchanged. Keyword fallback now uses the same explicit object/color
eligibility guard as semantic additions. The original evaluation artifact is
historical; current calibration is 8/8 positives versus 4/8 guarded keywords,
with zero no-match/wrong-school results. The frozen 28-case gate now has 16/16
core hits, zero false positives/leaks and a passing unchanged gate. These are
known synthetic regression sets, not blind or general accuracy estimates.


Semantic candidates require cosine similarity >=0.30, a >=0.05 gap between the best two candidate similarities, and similarity within 0.10 of the best. Ambiguous semantic results leave the keyword baseline intact. Reciprocal rank fusion (`rrf-60-eligibility-v2`) combines semantic and structured ranks; ties use found date descending then ID. These gates were calibrated on the committed small synthetic set and need independent/held-out evaluation.

`npm run eval:search` runs the actual local model, with network disabled in its worker, against twelve fixed labeled queries and ten fictional inventory items including eight distractors. It compares the hybrid path with a deterministic counterpart of SQL's public-field keyword algorithm. The [recorded result](evaluation-results.json) is 8/8 positive queries with a relevant item in top three versus 5/8 for keywords, no results on the two no-match/two wrong-school cases, and zero school leaks. One local run took about 0.3 seconds for all twelve cases including model load; this is not a hosting latency guarantee. Initial gates from the former provider underperformed; the revised local gates improved this calibration set. No held-out/general accuracy claim is made. This small English-oriented model has no validated multilingual retrieval coverage here.

`npm run eval:search:live` separately compares the actual structured SQL RPC with the HTTP endpoint against the local seeded stack. It requires local `.env.local`, running Supabase/app and available seed items, and uses only a public key. The offline evaluation is not proof of database policy enforcement; existing SQL/HTTP/browser suites cover that boundary.

## Packaging and checks

`next.config.ts` traces the worker, model assets, license notices and native dependencies for the search route, selecting the build platform's ONNX binaries. `npm run check:search:bundle` copies only traced files into an isolated directory and executes real model inference there. Build and deployment architectures must match. Use Node hosting supporting worker threads/native addons; an edge isolate is unsupported. No hosted deployment has been performed.

Validation commands: `npm test`, `npm run test:search:model`, `npm run eval:search`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:search:bundle`. CI runs the real model checks along with existing database/HTTP/browser suites. See the [phase report](../../agent-logs/codex-founder-b-phase4__founder-vb__phase-04-semantic-matching/codex-founder-b-phase4__founder-vb__phase-04-semantic-matching.md) for exact evidence. Persistent indexing, realistic held-out relevance data, hosted validation and independent Phase 4 acceptance remain follow-up work.
