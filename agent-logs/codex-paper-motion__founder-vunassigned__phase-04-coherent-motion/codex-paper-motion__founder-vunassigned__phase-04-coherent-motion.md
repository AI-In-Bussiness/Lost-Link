# Phase Report: 04 — Coherent motion and stable layering

## Metadata
- **Agent:** codex-paper-motion (Codex collaborator)
- **Founder version:** unassigned
- **Phase:** 04 — Coherent motion and stable layering
- **Status:** Completed
- **Date (UTC):** 2026-11-18
- **Task / issue:** Site-wide UI consistency, motion quality, and illustration layering follow-up.
- **Branch / commit:** codex/paper-ui-system; parent owns Git operations and final delivery.

## Objective and scope
- **Goal:** Apply coherent, restrained motion across mounted and native views while preventing illustration or control collisions.
- **In scope:** Motion lifecycle, preferences, native client shell, existing motion/transform/scene/stacking CSS rules.
- **Out of scope:** Palette/component typography, business flows, API/database behavior, authentication, legal copy, commits, or deployment.

## Work performed
- Added `getMotionPreference()` and a guarded, tab-scoped `lostlink:motion-paused=true` session preference. Resume removes that key. No page, account, or form data enters storage. Storage restrictions fall back to in-memory behavior.
- Added a binding ownership registry so delayed teardown of an older React shell cannot remove the new shell's document motion state. All observers and listeners are disposed with their owning shell.
- Added `PaperMotion` as a native client wrapper; the native-pages agent integrated it and the shared footer toggle in `PaperFrame`. Parent integrated shared preferences in the mounted app.
- Made decorative motion opt in after preferences load. Before hydration or when JavaScript is unavailable, native content stays static and hidden motion controls remain hidden. Native entrances run once and cancel cleanly when motion is paused.
- Used shared `--motion-fast`, `--motion-standard`, `--motion-enter`, and `--ease-paper` tokens for hover, tilt, reveal, and entrance transitions. Text stays fully opaque throughout.
- Replaced margin-based pointer tilt with independent compositor `translate` and `rotate` properties, avoiding layout shifts and preserving ambient transform animations.
- Flattened the illustrated paper's own child layers, confined 3D rendering to the pencil, removed the pencil's flattening filter, and set explicit local scene levels from drafting background to heading/caption. Decorative objects do not intercept controls.
- Reduced ambient travel and hover lift. Adjusted paper height/top so its transformed bounds remain clear of the art heading and caption on phones, tablets, and desktop.
- **Files created or modified:** `src/interface/motion.ts`; `src/app/paper-motion.tsx`; narrow existing motion/scene/stacking rules in `src/interface/styles.css`; this report. Other agents own shared token, native markup, and app integration edits.
- **Decisions made:** Shared application behavior without an animation dependency or continuous animation loop. One benign session boolean supports hard navigation while preserving privacy. Local scene z-order avoids artwork disappearing behind flattened 3D layers.

## Validation and results
- **Commands / checks run:** Root `npm run typecheck` and `npm --prefix tools/phase2 run typecheck` passed. Motion module and native wrapper were formatted with the pinned Prettier.
- Real Chromium scratch checks passed mounted pause/reload persistence, zero advancement of paused animation time, resume storage cleanup, shared depth/transition properties, out-of-order cleanup ownership, and storage-denied pause/resume without exceptions.
- Active scene checks passed nine animation phases times three pointer directions at 320/390/768/1440px. No horizontal overflow or paper/heading/caption collisions occurred. Minimum heading clearance was 5.66px and minimum caption clearance was 9.52px at the narrowest viewport.
- Reviewed a desktop screenshot with visible, correctly layered paper, backpack illustration, pencil, drafting mat, and tag. Preview server 4173 had a stale icon-serving allowlist; parent uses a fresh server for final evidence.
- Native development server 3000 served updated SSR markup but did not run the new shell effect: no page errors, only HMR WebSocket failures. Final native checks are assigned to the production build on port 3004; results are recorded in the addendum below.
- **Tests not run:** Full workflow suite belongs to the independent UI reviewer; no database or live account changes were made in this phase.
- **Deliverables:** Shared native/mounted motion system, stable scene geometry, and repeatable scratch checks under `/tmp/lostlink-paper-motion-system.py` and `/tmp/lostlink-motion-extremes.py`.

## Thoughts and reflections
- **What worked well:** Independent transform properties preserve gentle floating motion while allowing tilt without repeated layout. Explicit flat/3D boundaries make stacking predictable.
- **What was difficult or surprising:** A filter on a `preserve-3d` object flattens its faces, and a transformed drawing can cross a caption despite fitting the overall page width. Both required checking actual painted bounds rather than only declared sizes.
- **Trade-offs and alternatives considered:** Session storage is limited to a harmless animation preference so full document navigation respects pause. Discrete tilt targets avoid per-frame JavaScript and dynamic inline styles. Transform-only content entrances protect contrast and readability.
- **What I would improve next:** Review the final production preview on real iOS and Android devices for perceived motion and interaction comfort.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Parent defines timing tokens and updates `app.ts`; native agent integrates `PaperMotion` and toggle. UI reviewer extends regression coverage for paused reloads and geometry. CSS is frozen for the parent's final production build.
- **Dependencies / assumptions:** Native shell effect wraps server-rendered children and rebinds on pathname/children changes, including same-path form responses. The current mounted app invokes shared preference initialization before binding.
- **Risks / integration concerns:** OS reduced motion always takes priority. Shared scene geometry reserves space for heading/caption; changing card width/height or animation travel requires repeating geometry checks. No authorization to merge or publish is implied by local verification.
- **Questions / requested decisions:** Founder version remains unassigned; no blocking product decision.

## Follow-up and handoff
- **Remaining work:** Parent final rebuilt-commit checks and PR delivery. Native production verification passed as recorded below; no motion issue remains open.
- **Recommended next steps:** Include module, wrapper, shared CSS changes and this report; retain the guarded preference and explicit cleanup contract in the design guide.
- **Relevant references:** `src/interface/motion.ts`, `src/app/paper-motion.tsx`, `docs/coordination/task-board.csv`, parent UI system guide.

## Production validation addendum
- Native production verification was pending when the report was first created and is now completed in the verified addendum below.

### Verified native production result — 2026-11-18 UTC
- Added by codex-paper-account at the parent's explicit request after reviewing the fresh production build on port 3004.
- Native motion controls bind and unhide correctly in production. Pause persists after reload, Next Link navigation between native policy pages, navigation into the mounted homepage and a hard return to native content. Resume works after reload; OS reduced motion disables the toggle and cancels native entry motion.
- With JavaScript disabled, privacy content remains visible, native animationName is `none`, and the motion control remains hidden.
- The native review passed 40 route/viewport checks at 320/390/768/1440px and 20 axe scans with zero violations. Header/footer brand assets loaded; actual production screenshots were visually reviewed. No motion or native-chrome issue remains from the earlier HMR observation.
- Evidence: `/tmp/lostlink-native-production-evidence/results.json`, 20 PNGs in the same folder, and `/tmp/lostlink-native-production-evidence.zip`. See the native agent's [phase-04 report](../codex-paper-account__founder-vunassigned__phase-04-native-ui-system/codex-paper-account__founder-vunassigned__phase-04-native-ui-system.md) for scope and Supabase limitations.
- This resolves the production-native check that was pending when this report was created. Authenticated/database-backed acceptance and parent PR delivery remain separate.


### Final scene and viewport refinement — 2026-11-18 UTC
- Unified barrel/back/tip geometry under `--pencil-tip-length:55px`, eliminating the remaining 3px overlap between coplanar front and wood surfaces.
- Ambient floating loops use `ease-in-out` so velocity eases at each reversal. UI transitions retain the shared timing/easing tokens.
- Reused the existing IntersectionObserver for scene visibility. Floats and the drawn flourish pause when their figure is offscreen and resume on return. Unsupported observers keep the readable fallback and manual/OS controls; no new observer instance or animation loop was introduced.
- Extended the persistent art regression to check heading/caption clearance for paper, pencil, and tag, plus the actual untransformed barrel/tip seam. Its sweep includes 320/390/760/768/1024/1440px, active/reduced motion, float phases and tilt extremes.
- Focused Chromium verification on the fresh port-4174 preview passed all three requested motion/art/navigation cases in 15.876 seconds. The motion case verifies offscreen pause/resume, keyboard visibility, persisted pause after reload, and OS preference composition.
- A separate real-browser check with `window.IntersectionObserver=undefined` passed readable fallback, running ambient motion only after binding, manual pause/resume, and OS reduced-motion cancellation, with no uncaught errors.
- The initial new offscreen wait used a negated expression string that Playwright evaluated through a CSP-disallowed path. Changing the test predicate to an explicit arrow function fixed the harness without changing CSP or application behavior.
- No Git operations were performed. Source and CSS are ready for the parent's final production rebuild and PR checks.
