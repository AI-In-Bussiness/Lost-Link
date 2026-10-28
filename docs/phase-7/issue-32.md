# Issue #32 — search eligibility correction

Implementation: `rrf-60-eligibility-v2` on the shared Phase 7 PR source branch.
Status: implementation and local verification complete; merge/deployed verification
and independent acceptance remain pending. Fixes #32 when merged. This is not a
claim that the overall Phase 7 release is locked.

## Root causes and behavior

The unchanged SQL candidate search uses substring matches across public fields.
It returned keys for “silver laptop computer” because the description says silver,
and a backpack because it has a laptop sleeve. It returned a pencil case for
“wooden violin in a hard case.” The semantic gate also added unrelated in-school
objects for three wrong-school traps; these were relevance errors, not tenant leaks.

A shared HTTP eligibility layer now applies to normal and disabled/unavailable/
busy-model fallback, as well as the fresh SQL retry after inventory changes:

- Explicit recognized object types must be supported by the item's title, with
  documented aliases (e.g. holdall/duffel, earphones/earbuds). A component in its
  description does not establish that the object itself exists. Protective case/
  cover/sleeve/holder titles cannot stand in for their contents unless requested.
- Explicit recognized colors must be supported by title/description/color, not
  a location name. Navy/azure map to blue and gray to grey; multi-color requests
  may match any mentioned color. Unspecified colors impose no inferred filter.
- For queries without an explicit supported type, structured matches require
  whole-word coverage of at least half the significant unique words and a
  non-color title/category anchor. Pure color/location searches remain usable.
- SQL remains a high-recall public candidate source. POST search fetches up to
  50 ranked candidates before eligibility filtering, fusion and the user limit.
  Direct RPC and browse behavior are unchanged. The existing 50-candidate bound
  remains a showcase limitation; this does not establish exhaustive retrieval at scale.
- Semantic additions pass the object/color guard before the existing cosine,
  separation and near-best gates. The pinned model, 0.30 minimum similarity,
  0.05 separation and 0.10 near-best window are unchanged. Ranking scores and
  ownership probabilities are not exposed.

The vocabulary is deliberately limited and English-oriented. Ambiguous words,
item titles, color descriptions and free-form language can still cause misses;
this is a conservative lost-property heuristic, not a general object detector.
Unrecognized paraphrases can still use the local model. No private item facts,
claim proof, contact information, photos or filenames enter inference.

## Measured results

The original `tools/phase4/relevance-set.json`, all 28 labels and the scorer's
14-of-16 core-hit/no-false-positive/no-leak criteria are unchanged. The initial
model reproduction returned 16/16 core positives and the same five false-positive
cases as #32. Historical failing closeout evidence remains unchanged.

| Set / mode | Core positive hits | Negative/trap false positives | School/filter leaks |
| --- | --- | --- | --- |
| Frozen 28, model before | 16/16 | 5 | 0 |
| Frozen 28, corrected model | 16/16 | 0 | 0 |
| Frozen 28, corrected fallback | 13/16 | 0 | 0 |
| Additional 27, corrected model | 19/19 | 0 | 0 |
| Additional 27, corrected fallback | 19/19 | 0 | 0 |
| Original 12 calibration, corrected model | 8/8 | 0 | 0 |

Fallback is intentionally a stricter structured result set, not the old raw SQL
list. On the frozen core its recall drops from 16/16 raw keyword hits to 13/16;
semantic matching restores the three paraphrases when available. This tradeoff
avoids false matches based only on shared attributes/components. It is not an
assertion that model failure leaves semantic recall unchanged.

The additional set was authored during this fix after reviewing the original
failures. It tests longer user context, additional public details, absent objects
and matching computer/cello/golf counterparts when those items actually exist.
It is an additional **known regression set**, not a blind held-out evaluation.
Additional false positives found during development were fixed through general
object/color rules; no original or additional labels were changed to hide them.

Raw final evidence:

- [Frozen model](issue-32-frozen-model.json) and [fallback](issue-32-frozen-fallback.json)
- [Additional model](issue-32-additional-model.json) and [fallback](issue-32-additional-fallback.json)
- [Original calibration](issue-32-calibration.json)

## Reproduction and executed checks

```sh
npm test
npm run lint
npm run typecheck
node --test --test-isolation=none tools/phase4/*.test.mjs
npx tsx tools/phase4/evaluate.ts model
npx tsx tools/phase4/evaluate.ts fallback
npx tsx tools/phase4/evaluate.ts model additional
npx tsx tools/phase4/evaluate.ts fallback additional
npm run eval:search
npm run build
npm run test:search:relevance
```

56 unit tests, nine relevance-tool tests, lint/typecheck and production build
pass. The real HTTP suite starts production servers on free port 3002, sequentially
with inference enabled/disabled, against matched local Supabase. It reproduces
bad raw RPC component/color candidates, asserts empty HTTP results, verifies
school scope and no-store, and then inserts a real laptop and requires it at
limit=1 even when a higher-scoring protective sleeve is present. Random fixture
organizations/items are removed; no reset or hosted mutation is performed.

CI now runs that HTTP suite and treats the frozen and additional model gates as
failures instead of using continue-on-error. Workflow success is still not
independent relevance/release acceptance. No hosted credentials, rollback,
release tagging or production data changes are part of this correction.
