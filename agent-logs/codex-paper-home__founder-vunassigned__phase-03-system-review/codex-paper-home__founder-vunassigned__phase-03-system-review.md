# Phase Report: 03 — System review

## Metadata
- **Agent:** codex-paper-home (Codex mounted-interface reviewer)
- **Founder version:** unassigned; the task supplies no Founder version.
- **Phase:** 03 — System review
- **Status:** Completed
- **Date (UTC):** 2026-11-18
- **Task / issue:** Audit the shared paper UI system, strengthen observed browser coverage gaps, and verify the combined mounted interface.
- **Branch / commit:** codex/paper-ui-system, based on main 2051676; parent handles the combined commit and PR.

## Objective and scope
- **Goal:** Review layouts, interaction states, animation stacking, and reduced-motion behavior across the mounted public, claimant, and staff routes.
- **In scope:** Browser review, temporary visual/hit-target audits, focused regressions in tools/phase2-browser-test.py, and this report.
- **Out of scope:** Implementation edits, database/API changes, Git publication, hosted acceptance, and native-route browser verification. The native-page and motion agents own the native checks.

## Work performed
- Reviewed repository guidance, existing browser coverage, mounted view markup, shared CSS, and motion lifecycle changes.
- Audited 12 mounted routes at four viewport widths with normal and reduced motion, producing 96 baseline cases with document-overflow and control-hit observations.
- Identified unreadable staff claim/inventory tables: inherited intra-word wrapping collapsed headers, references, and action labels into vertical glyph columns. Reported the problem to root, who added readable table width, normal table wrapping, and unbroken action labels. The new regression reproduced the original failure and verified the correction.
- Initially observed broken brand images from a preview process predating the notebook-logo merge. The current source already served the asset; switched final checks to a newly started preview on port 4174. This was a stale-process issue, not a source defect.
- Added an art regression sampling float extremes, tilt transitions, viewport bounds, compact child SVG dimensions, heading/caption clearance, and search-control hit targets at six widths with both motion preferences.
- Extended the existing motion case to cover manual pause after a full document reload, readable content on return home, and preference cleanup on resume.
- Added readable table-word ranges, keyboard horizontal scrolling, and actual keyboard Review/Manage navigation at phone/tablet widths under both motion preferences.
- Strengthened responsive checks to wait for loaded brand images instead of allowing broken logo boxes to pass silently.
- Captured and reviewed final shared typography/surface/layout screens with motion reduced. A final 48-case layout sweep found no document overflow; two union-bounding-box midpoint warnings for a wrapped inline claim link were ruled out by per-line hit checks and successful Playwright trial clicks.
- **Files created or modified:** tools/phase2-browser-test.py and this report. Temporary scripts, JSON, and captures are in /tmp.
- **Decisions made:** Reuse the existing browser harness, fictional data, axe installation, and system Chromium. Test observable readability/reachability and geometric failures, rather than asserting the CSS implementation.

## Validation and results
- **Commands / checks run:** `LOSTLINK_PREVIEW_PORT=4174 node tools/phase2-preview.mjs` started a fresh local-only preview. `python -m py_compile tools/phase2-browser-test.py` passed. `LOSTLINK_PREVIEW_URL=http://127.0.0.1:4174 AXE_SCRIPT=/workspace/Lost-Link/tools/phase2/node_modules/axe-core/axe.min.js python tools/phase2-browser-test.py` passed all 24 tests in 174.769 seconds, including axe, workflow/private-boundary, photo preparation, keyboard, responsive, and enlarged-text checks. After motion's final caption changes, `LOSTLINK_PREVIEW_URL=http://127.0.0.1:4174 python tools/phase2-browser-test.py InterfaceTest.test_decorative_art_does_not_escape_or_cover_search_controls` passed with the added caption-clearance assertion in 9.696 seconds. This exercises 108 phase/tilt/preference/width samples.
- **Tests not run:** Persisted Supabase and hosted/browser acceptance are outside this review. Native Next routes are verified by their assigned owners. No Safari claim is made.
- **Deliverables:** Final representative screenshots: `/tmp/paper-system-home-1440.png`, `/tmp/paper-system-home-390.png`, `/tmp/paper-system-o-cedar-grove-search-1440.png`, `/tmp/paper-system-o-cedar-grove-staff-1440.png`, `/tmp/paper-system-o-cedar-grove-staff-390.png`. Broad layout evidence: `/tmp/paper-system-layout-final.json`; baseline audit: `/tmp/paper-layout-audit.json`.

## Thoughts and reflections
- **What worked well:** Pixel-bound and screenshot review caught issues that a document-overflow assertion alone misses. The new table test first failed on visible word fragmentation, then passed after implementation correction. The shared surface/type system is now consistent across the exercised routes.
- **What was difficult or surprising:** A valid inline link can have multiple separate line rectangles, so its union-bounding-box center can fall in an unclickable gap. Per-fragment hit testing and a real trial click distinguished that from a stacking defect. A stale preview process also served older routing behavior despite current source files.
- **Trade-offs and alternatives considered:** Sampled animation extrema and explicit caption clearance offer useful protection without adding screenshot-golden churn. Horizontal table scrolling preserves legible operational data on narrow screens.
- **What I would improve next:** Start a fresh preview process for each assignment and retain per-fragment geometry when extending generic hit-target audits.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Root owns the table fixes and shared CSS. Motion owns guarded tab-scoped pause persistence and the final art/caption geometry. Native-route evidence belongs to the native/motion reports. All observed source issues in this mounted review are resolved.
- **Dependencies / assumptions:** Manual animation preference storage is explicitly authorized by root and stores only the benign pause choice. Final tests use the combined shared files present on 2026-11-18 and synthetic in-memory data.
- **Risks / integration concerns:** This local harness exercises the mounted composition and shared assets but does not establish real Auth/database persistence or production deployment. Representative captures were regenerated after the final motion geometry adjustment.
- **Questions / requested decisions:** Founder version is unavailable and remains unassigned. No unresolved UI decision blocks this review handoff.

## Follow-up and handoff
- **Remaining work:** Parent completes its overall verification and publication workflow. No actionable mounted-layout finding remains.
- **Recommended next steps:** Attach the final captures to the PR review material and retain the new focused regressions in CI.
- **Relevant references:** Prior phase-01 homepage and phase-02 review reports; root UI-system report; motion and native-page reports; tools/phase2-browser-test.py.

## Addendum — Durable PR screenshots, 2026-11-18 UTC

- The environment resumed with fresh temporary storage, so the earlier /tmp screenshots were regenerated from the running port-4174 mock preview and exported as durable, optimized WebP review assets.
- Final exports are `docs/design-review/paper-ui-system/home-desktop.webp` (1280×1078, 67,442 bytes), `home-mobile.webp` (390×1226, 43,084 bytes), and `staff-mobile.webp` (430×969, 18,870 bytes). Desktop includes the complete hero and search sheet; mobile includes the complete hero/art without a partial next-section edge. The mobile staff view uses the actual five-claim, all-status demo queue, horizontally scrolled to the Submitted, Status and Review columns.
- Captures use the OS reduced-motion mode and loaded local fonts/assets. Sharp exports use WebP quality 85 and effort 6; total size is 129,396 bytes. All three final WebP files were opened and visually inspected after motion's final geometry/tip adjustments.
- Screenshot review exposed wrapped status-badge labels in the all-status queue. Root corrected table badge intrinsic width and wrapping. The table regression now includes `td .badge` and the all-status claim queue, alongside headers/actions, so Pending/Approved/Rejected/Fulfilled remain intact. `LOSTLINK_PREVIEW_URL=http://127.0.0.1:4174 python tools/phase2-browser-test.py InterfaceTest.test_staff_tables_keep_words_readable_and_actions_reachable` passes after the correction (18.413 seconds).
- Motion owns the separate final expansion of the art regression to all decorative objects and the pencil tip seam. No implementation or Git publication changes were made by this reviewer during screenshot delivery; parent owns status and commit.
