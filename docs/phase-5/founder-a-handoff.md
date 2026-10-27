# Founder A — Phase 5 browser and usability quality

Source: `plan.md`, Phase 5, LL-038–LL-045. Founder A owns automated
browser checks, mobile layouts, accessibility, errors and usability. The
individual task workbook remains unavailable, so this handoff does not invent
individual LL task assignments. Work shares [PR #14](https://github.com/AI-In-Bussiness/Lost-Link/pull/14)
with [Founder B's security work](README.md); independent Overseer acceptance
and deployment remain separate.

## Defects reproduced and fixed

| Finding | Reproduction and previous behavior | Change and regression |
| --- | --- | --- |
| Keyboard focus lost after refresh | Activate Try again after a failed school read, or approve a claim. The focused control is removed and focus falls to the document body. | User-initiated retries and mutations focus the updated page heading. Existing validation-summary focus wins. Two new browser regressions failed before the fix and passed afterwards, including keyboard completion of physical return. |
| Phone reflow fails with enlarged text | At 320px, double the computed root text size. Homepage heading/caption and a staff item's long claim references extend beyond the viewport. | Headings and reference text wrap, stacked grids can shrink, and the caption can wrap onto another line. A new test visits eleven core routes, checks document overflow and confirms visible form controls fit within the phone width. |

These are shared interface fixes, used by both the Next.js application and the
isolated preview. No backend authorization, lifecycle, data or matching contract
changes are included in Founder A's contribution.

## Browser coverage

The retained standalone suite now has 17 cases. It covers twelve mock routes,
school context, history, native Tab/Enter/Space workflows, validation/error links,
empty/network/rate-limit/fallback states, stale versions, delayed navigation and
sign-out, photo errors and replacement, reduced motion, text resize and axe.
The preview uses fictional in-memory data; it does not prove authentication or
persistence.

`npm run test:browser` retains the real Auth/Postgres/Storage journey and adds:

- Five viewport configurations on twelve routes plus validation, other-owner
  denial and other-school denial states: 320×1000, 390×844, 568×320 landscape,
  768×1000 and 1440×1000. Each state/viewport gets an overflow assertion, an axe
  WCAG A/AA scan through the WCAG 2.2 tags, and a screenshot after fonts load.
- Each reviewed state also checks reflow at 320×640 with doubled computed root
  text size and reduced motion. This is a text-resize check, not a claim about
  native browser zoom or mobile-device certification.
- Claim validation through native keyboard navigation, focusing the error
  summary and its evidence-field link; offline browser submission preserves
  private evidence and re-enables submission before a real successful retry.
- Approval, handover confirmation and return through Tab/Enter/Space, with
  updated-heading focus after mutations; retained refresh/persistence checks.
- Browser views for other-owner and other-school denials, in addition to the
  existing direct HTTP denials; uncaught page errors fail the test.

There are no intercepted API responses in this live suite. Only the isolated
preview uses mocks. Screenshots contain generated fictional test data and go
to `/tmp/lostlink-live-*.png` and `/tmp/lostlink-*.png`; existing workflows upload
them as review artifacts. Fixture cleanup stays limited to the suite's generated
organizations, users and photos.

## Verification

From the repository root, after installing the pinned dependencies:

```sh
npm run lint
npm run typecheck
npm test
npm run test:mocks
node --test --test-isolation=none tools/phase4/*.test.mjs
npm --prefix tools/phase2 run typecheck
npm --prefix tools/phase2 run format:check
node tools/phase2-preview.mjs
# In a separate terminal:
AXE_SCRIPT=tools/phase2/node_modules/axe-core/axe.min.js python tools/phase2-browser-test.py
# For the persisted suite, first follow the root README local stack/build setup:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Local lint, both TypeScript checks, formatting, unit/mock/search-tooling checks,
the two failure-before/fix-after regressions and the doubled-text phone check
passed. The application compiled with `node_modules/.bin/next build`.
All 17 standalone browser cases passed with axe enabled and no skips.
The expanded persisted suite and all Foundation checks passed remotely on
code commit `83cd353`: [Foundation run](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40403763199)
and [interface run](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40403763155).
The phase report records exact evidence. Local Docker could not unpack the
Postgres layer because its storage ran out of space; no local persisted pass
is claimed.

The first shell attempts lacked network/socket access. Explicit network access
restored Git and registry access; the full shared branch is now checked out
locally. The Supabase npm installer additionally needed the inherited proxy
passed through its supported npm proxy setting. Model downloads from
Hugging Face receive a policy 403, so local compilation does not establish
model packaging or model quality. Use the existing CI model/bundle checks.

## Handoff and acceptance boundaries

Founder A's browser evidence is builder verification. The Overseer still owns
independent P0 acceptance; this work does not approve the combined Phase 5 gate.
Axe results do not replace manual screen-reader testing. Real iOS/Android,
Firefox/WebKit and native browser zoom remain untested. Phase 4's additional
negative/trap false positives remain known relevance work for Founder B;
no labels, thresholds or diagnostic gates were changed.

See the [Founder A phase report](../../agent-logs/codex-founder-a-05__founder-va__phase-05-browser-quality/codex-founder-a-05__founder-va__phase-05-browser-quality.md)
for final commands, results, reflections and next owners.
