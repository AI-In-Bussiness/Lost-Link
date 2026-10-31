# Phase Report: 01 — Browser regression

## Metadata
- **Agent:** codex-image-upload-tests (Codex subagent)
- **Founder version:** unassigned; not supplied in this assignment.
- **Phase:** 01 — Browser regression
- **Status:** Completed
- **Date (UTC):** 2026-10-31
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/49
- **Branch / commit:** codex/issue-49-compress-images, based on main dff9614fbcc711864497add66455ae9e87a42641.

## Objective and scope
- **Goal:** Verify automatic browser compression of oversized production photo uploads without weakening the existing server upload limits or private review process.
- **In scope:** Existing browser regression tools, real Chromium image encoders/decoder, live photo panel composition, persisted upload journey assertions.
- **Out of scope:** Compression implementation, server authorization/storage changes, production deployment.

## Work performed
- Read repository instructions, coordination guidance and current photo interfaces; identified separate production and development-only image paths.
- Added real Chromium checks using deterministic noisy JPEG, PNG and WebP sources, each over 4 MiB. The JPEG contains a synthetic orientation-6 EXIF segment.
- Asserted bounded, decodable output with correct orientation and aspect ratio; confirmed a small file keeps its original object and bytes.
- Exercised the real photo panel with a synthetic API seam: a genuine 5.6 MiB PNG reaches the API under 4 MiB exactly once despite same-turn duplicate submits.
- Verified unsupported SVG, corrupt PNG, animation, excessive pixel count and excessive source bytes produce focused form errors without API uploads.
- Updated the persisted Auth/database/Storage browser journey to upload a genuine oversized PNG, observe the compressed File handed to native FormData, and continue the existing private-preview/publication/reload/claim-return checks.
- **Files created or modified:** tools/phase2-browser-test.py, tools/live-browser-test.py, this report.
- **Decisions made:** Preserve the development-only local photo path. Use native image encoders and decoder for browser evidence. Observe FormData arguments passively because Chromium omits multipart File bytes from Playwright Request.post_data_buffer; native requests and responses remain unchanged.

## Validation and results
- **Commands / checks run:** `python -m py_compile tools/phase2-browser-test.py tools/live-browser-test.py` passed; `git diff --check` passed.
- **Commands / checks run:** `python tools/phase2-browser-test.py InterfaceTest.test_oversized_live_photos_are_compressed_in_the_browser InterfaceTest.test_live_photo_panel_compresses_once_and_keeps_failures_local` passed, two tests in 33 seconds, using /usr/bin/chromium.
- **Commands / checks run:** `AXE_SCRIPT=/workspace/Lost-Link/tools/phase2/node_modules/axe-core/axe.min.js python tools/phase2-browser-test.py InterfaceTest.test_accessibility_scan` passed.
- **Commands / checks run:** Full `python tools/phase2-browser-test.py` completed successfully: 21 cases in 108 seconds, with the axe case skipped because AXE_SCRIPT was not set in that invocation. The axe case passed separately with AXE_SCRIPT set, so all 21 cases have passing runtime evidence.
- **Tests not run:** Persisted live browser journey requires a running matched local Supabase Auth/database/Storage stack. Its source was compiled, but no local persisted runtime pass is claimed; Foundation CI executes it.
- **Deliverables:** Both existing browser tool files and this report; temporary browser evidence remains under /tmp.

## Thoughts and reflections
- **What worked well:** Real browser JPEG/PNG/WebP encoders produce reproducible oversized fixtures without committed binary assets or external image dependencies.
- **What was difficult or surprising:** Playwright string-expression polling conflicts with the preview CSP. Explicit arrow-function predicates work without weakening the policy. Chromium does not expose multipart File post-data through Request.post_data_buffer.
- **Trade-offs and alternatives considered:** The panel test isolates browser preparation and duplicate-submit behavior through the existing API seam; the persisted journey separately checks real authorization, sanitization, storage and publication.
- **What I would improve next:** Keep the persisted oversized-image journey in Foundation CI so future UI changes cannot restore the old early size rejection.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Root owns src/interface/compress-photo.ts and src/interface/live-photos.ts. Browser tests import the public helper exports preparePhoto and MAX_PHOTO_BYTES.
- **Dependencies / assumptions:** Sources above 4 MiB and no larger than 32 MiB/40 megapixels are eligible for preparation. Output remains within the existing 4 MiB server transport bound.
- **Risks / integration concerns:** Browser evidence here uses Chromium. Existing server decoding, metadata stripping, rate limits and explicit private review remain essential for all clients.
- **Questions / requested decisions:** Founder version remains unassigned; task owner may supply it for later report attribution. It does not prevent the authorized implementation or tests.

## Follow-up and handoff
- **Remaining work:** Root should collect the PR Foundation checks, including the persisted oversized-photo journey.
- **Recommended next steps:** Include both browser files and this report in the shared PR; retain existing server photo validation tests.
- **Relevant references:** AGENTS.md; docs/coordination/current-state.md; src/interface/live-photos.ts; src/lib/photos/image.ts; scripts/test-browser.mjs; issue #49.
