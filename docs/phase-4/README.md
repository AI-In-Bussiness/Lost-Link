# Founder B — Phase 4 semantic matching checkpoint

Status: implementation ready for review; full Phase 4 quality gate blocked on a real-provider evaluation. Built from main `b70777e`. No hosted deployment or measured retrieval improvement is claimed.

## Behavior and boundaries

The existing same-origin POST search endpoint keeps `{data:[{item,reasons,method}]}` and adds `search:{mode:"structured"|"hybrid",semanticStatus:"disabled"|"available"|"unavailable"}`. Clients ignoring the new metadata still work. The live interface shows AI + keyword matching only when returned rows actually use semantic ranking, and shows a fallback notice for an attempted but unavailable semantic path. Browsing without a query remains unchanged.

The server first runs the existing structured search. When explicitly enabled, it retrieves **only available public items from the published requested school**, applying category/color/inclusive date filters in SQL before embedding or ranking. It never uses staff inventory, claims, ownership evidence, identifying details, storage locations, contact details, photographs or filenames. An explicit allow-list builds each provider input from title, public description, category, color and broad public location. User queries are sent to OpenAI; users can still type personal information into that field. Approve provider data handling and the real-user privacy notice before public enablement.

A single bounded request embeds the query and at most 50 items using OpenAI `text-embedding-3-small`, 256 dimensions, with a 2.5-second provider timeout, no redirects/retries and a 1 MiB response cap. The server validates vector dimensions, finite nonzero values and exact indexed batch coverage. No embeddings or queries are persisted or logged. The model cannot invoke tools or generate explanatory prose. Explanations are fixed descriptions of matching signals, never an ownership probability or proof.

Cosine similarity >=0.45 supplies semantic candidates. Reciprocal rank fusion (`rrf-60-v1`) combines semantic and structured ranks; ties use found date descending then ID. These settings are provisional until evaluated. Public inventory is re-read after the provider call; visibility/content changes invalidate the batch and cause a fresh structured search. RPCs use the caller-scoped Supabase client; no service-role key is used. Public projection is enforced even when staff are searching.

## Setup

1. Apply the **additive** migration `202610260005_semantic_budget.sql` to a reviewed target. Existing migrations are preserved. Local command: `npx supabase migration up --local`.
2. Bind `OPENAI_API_KEY` server-side and set `LOSTLINK_SEMANTIC_SEARCH=true` only in the disposable local evaluation environment. Neither variable is public. Default is disabled.
3. Start the local seeded app with `npm run dev`; run `npm run eval:search`. The evaluator requires localhost app and local Supabase, uses only the public key and performs no provisioning/writes. Preserve both seed items as available. It compares real structured RPC results with the actual HTTP search endpoint; disabled/unavailable AI fails the run instead of recording fabricated semantic scores.
4. Review the JSON output and synthetic relevance labels with Founder A/Overseer before enabling any hosted deployment. Queries and labels are in `evaluation-cases.json` (4 exact, 4 paraphrase, 2 no-match, 2 wrong-school). The proposed acceptance gate is 7/8 positives in top 3, zero false positives on the four negative/trap cases, and zero school leaks. The two-item seed is a small smoke evaluation, not a realistic retrieval benchmark; expand it with distractors before claiming quality or generalization.

The migration implements an atomic shared fixed-hour budget of **20 batches per published school per hour**, counting failures too. Old windows reset on the next reservation, using one private row per school. Public callers can consume the shared quota, including by directly invoking the reservation RPC; this can degrade AI availability but cannot bypass the budget or disable structured search. Provider-account spending limits remain an operator control. No IP/user tracking is stored by this change.

## Fallback and limitations

Missing key/flag means `disabled` with no paid call. Overflow (>50 eligible items), quota denial, missing migration, provider errors/rate limits/timeouts or invalid embeddings mean structured results with `unavailable`. Never silently rank only the first page of a larger inventory. DB visibility failures trigger a fresh structured read or the existing safe API error. The 2.5-second timeout covers the provider fetch/body; database latency retains existing behavior.

This is an on-demand small-demo implementation, deliberately without a persistent embedding index or cache. Each eligible request re-embeds the filtered inventory. A pgvector index, model-versioned incremental indexing, durable jobs and cache invalidation are future scale work. The existing keyword path remains available across the full inventory. There is no language generation, image recognition, ownership inference, notification or automatic claim approval.

## Evidence

See the [phase report](../../agent-logs/codex-founder-b-phase4__founder-vb__phase-04-semantic-matching/codex-founder-b-phase4__founder-vb__phase-04-semantic-matching.md). Unit tests use explicit fake vectors/provider responses to verify mechanics, fallback and privacy; they do **not** establish semantic relevance. The real-provider evaluation is not run: this environment has no configured OpenAI credential. Remote CI and independent review are tracked through the draft PR, separately from the quality gate.
