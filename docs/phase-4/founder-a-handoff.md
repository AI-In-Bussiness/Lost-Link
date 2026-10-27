# Founder A — Phase 4 cases and explanations

Source: plan.md, Phase 4 “Smart AI matching” (LL-031–LL-037).
Founder A owns realistic search cases and match-card explanations; Founder B
owns retrieval, vectors, ranking and fallback. Delivered for review on the
existing shared PR #12, based on main plus Founder B's local-model revision
`ed570ea`. No phase gate or hosted deployment is approved here.

## Frozen relevance set

[`tools/phase4/relevance-set.json`](../../tools/phase4/relevance-set.json)
contains 18 fictional items at two schools, six supported categories and 28
queries: eight exact, eight paraphrases, four no-match, four wrong-school and
four filter cases. Every case has explicit relevance labels and a rationale.
Same-color bags are distractors; otherwise identical purple bottles have
different found dates. An ambiguous bag query labels both bags relevant.
Nothing is inserted into seed data or a hosted database.

The set was authored after inspecting the earlier calibration set but before
running these new queries or changing thresholds. It is an additional frozen
test set, not an independently collected blind benchmark. Do not retune gates
on it and then describe it as held out. Preserve case IDs/version when recording
results; document label corrections and create a new version for additions.

Proposed review targets: at least 14/16 exact/paraphrase queries with a labeled
item in the top three; all three positive filter cases hit; no results on the
nine negative/trap/filter-exclusion cases; zero school/filter leaks. Report
exact and paraphrase outcomes separately, baseline top-three hits and mean
reciprocal rank. Founders and Overseer must agree thresholds and labels.
A red tote at the other school must not make an in-school red jacket relevant.

## Run and inspect

From the repository root, with Node 24 and dependencies installed:

```sh
node --test --test-isolation=none tools/phase4/*.test.mjs
npx tsx tools/phase4/evaluate.ts fallback
npm run model:download
npx tsx tools/phase4/evaluate.ts model > /tmp/lostlink-phase4-relevance.json
```

Model mode executes Founder B's actual local embedder and semanticSearch with
unchanged ranking thresholds. It exits nonzero if the proposed targets fail,
and aborts without a quality claim if inference is unavailable. Fallback mode
deliberately fails inference for every case and checks exact preservation of
keyword rows and honest availability metadata. Empty filtered inventory needs
no inference and correctly reports available.

The keyword comparison is the same deterministic public-field counterpart
used by Founder B's offline evaluator; it is not an actual SQL call. Scoping
in this harness tests the set and retrieval mechanics, not database RLS.
Run `npm run eval:search:live`, SQL, HTTP and persisted browser suites separately
for application/database evidence. No real claim, photo or private field is
included in this fixture. No paid inference service is used.

The additional Phase 4 diagnostics workflow runs set/UI checks, fallback and
actual model evaluation and uploads JSON. Its proposed quality step is explicitly
diagnostic: inspect the step outcome and artifact even if the job is green.
Existing Foundation checks are unchanged. Automated diagnostic success does
not establish independent acceptance.

## Interface behavior

Each card with supplied match reasons has a “Why this may match” label and a
semantic list. Reasons are escaped and come from the existing API; the UI
creates no confidence score or unsupported attribute. Cards without reasons
show no invented explanation. Search distinguishes hybrid signals from keyword
results, preserves the existing fallback notice, and says staff review private
claims. The search field discourages entering names, contacts and secret proof,
with help and validation errors both associated through aria-describedby.
Inference stays local, matching Founder B's revised implementation.

## Verification and remaining work

Seven native Node tests passed locally, covering reason escaping, missing
reasons, hybrid/keyword/fallback presentation, empty searches, query escaping,
validation help, fixture labels, inclusive dates and scorer failure detection.
The first date test incorrectly expected all other same-date items to be
excluded; it was corrected to check the older duplicate's exclusion.

The shell proxy at port 8080 is unreachable; Git fetch and npm registry access
both fail. The local checkout began at `b52dd4c`, so only the necessary source
files were materialized through the connected GitHub reader for these checks.
Publication uses the refreshed remote branch, preserving the integrated tree.
Full dependency-based lint/typecheck/build, model/fallback evaluation and browser
checks were not run locally. Remote CI results must be inspected separately.
No relevance improvement is claimed for this additional set until measured.

Review labels and model results before changing ranking; send false positives
and misses to Founder B with case IDs. Independent Overseer review, full live
validation and hosted readiness remain separate. See the
[phase report](../../agent-logs/codex-founder-a-04__founder-va__phase-04-search-cases/codex-founder-a-04__founder-va__phase-04-search-cases.md).
