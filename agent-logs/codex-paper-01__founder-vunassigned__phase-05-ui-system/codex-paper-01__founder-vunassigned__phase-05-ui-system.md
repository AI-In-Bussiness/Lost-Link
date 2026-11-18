# Phase 05 — Site-wide paper UI system

## Metadata

- **Agent** codex-paper-01
- **Founder version** unassigned; the task owner has not supplied a version
- **Phase** 05, UI system
- **Status** Completed for PR review
- **Date (UTC)** 2026-11-18
- **Task** Site-wide styling, smooth motion, layer order and a durable agent guide
- **Branch** `codex/paper-ui-system`, based on integrated notebook-logo merge `2051676`

## Objective and scope

Unify the public, claimant, staff and native UI around paper, olive ink and yellow pencil marks. Use the existing 60/30/10 convention as the interpretation of the owner’s color-rule request. Preserve the logo, role-aware journeys, authentication, inventory, claims and private/public data boundaries.

## Work performed

- Consolidated the two competing palette definitions into semantic CSS properties. The native shell loads the same base controls and colors as the mounted app. Made the paper grain transparent so it respects the underlying sheet or canvas color.
- Aligned navigation, headings, type for reading and data entry, buttons, notices, errors, badges, cards and tables. Added an olive drafting mat behind the sketch. Removed redundant printed text on the placeholder image and the slogan strip on the homepage.
- Refined pencil and paper depth, page entries, pointer tilt, pause, and reduced-motion behavior. Unified native and mounted motion. Documented precise stacking order in the style guide.
- Replaced the brief in `DESIGN.md` with the agent-facing guide. Linked it from the repository instructions and project README. Included small visual review assets in `docs/design-review/paper-ui-system/`.

## Validation and results

- `npm run lint`, `npm run typecheck`, `npm --prefix tools/phase2 run typecheck`, `npm --prefix tools/phase2 run format:check`, and `git diff --check` passed.
- `npm test` passed 78 tests. `npm run test:mocks` passed 14.
- `npm exec next build -- --webpack` built the production application. Chromium verified the native pages at 320, 390, 768 and 1440px, with 40 route/viewport checks and 20 axe scans. A separate instance with a loopback Supabase configuration rendered the sign-in, sign-up and password recovery forms for visual review.
- The mounted Chromium suite on port 4174 passed 24 tests with axe enabled, including the new regressions for art clearance, unobstructed controls, reload pause, the notebook asset and operational table navigation. Animation phase and pointer tilt samples checked the sheet, tag and pencil against their captions and viewport edges.
- Solid palette pairs measured 12.12:1 (ink on paper), 5.84:1 (muted on paper), 10.32:1 (sheet on olive), 10.72:1 (ink on yellow), and 3.91:1 for the control outline on paper.
- Local native testing covered anonymous pages, guards and unavailable states. Real authenticated admin, school settings and persisted journeys use the repository’s integration CI. Physical devices and other browser engines were outside this local run.

## Thoughts and reflections

Operational table text wrapping was a more serious mobile issue than document overflow alone suggested. A bounded horizontal viewport lets staff read each action and status, including when using a keyboard. A transparent background grain also made a greater difference to palette consistency than changing individual card colors.

## Cross-agent and cross-phase comments

The native contributor verified shared fields, actions and legal content. The motion contributor handled the scene, lifecycle and preference storage. The browser reviewer added explicit geometry and interaction coverage. See their phase reports alongside this report for test boundaries. CSS component roles and intentional local 3D layers are documented in `DESIGN.md`.

## Follow-up and handoff

The pull request targets `main` for owner review. Its description links the desktop/mobile examples and style guide. Future agents should update the guide alongside any shared token or component change. The Founder version remains an open metadata item.
