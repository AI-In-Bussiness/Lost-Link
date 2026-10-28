# Phase Report: 01 — Home landing page

## Metadata
- **Agent:** codex-issue-34 (Codex)
- **Founder version:** unassigned; no Founder role was supplied for this issue.
- **Phase:** 01 — home-landing
- **Status:** Completed (implementation and local verification; integration tracked in PR #36)
- **Date (UTC):** 2026-10-28
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/34
- **Branch / commit:** Reused `codex/convert-plan-markdown`, fast-forwarded to current main `ae883e6c038a94d482a8b7bf4ba15f142ef70a2e` before editing.

## Objective and scope
- **Goal:** Give new visitors a home page that introduces the website's features.
- **In scope:** Root-page copy, feature overview, existing school search, account/claims and staff entry, accessible section navigation, browser regressions and required coordination records.
- **Out of scope:** Backend, database, authentication, model changes, unrelated open issues and the photo/release-readiness work in PR #33.

## Work performed
- Read issue/comments, current main, AGENTS, coordination documents, README, DESIGN, interface handoffs and upstream UI report. Read the installed Next client-boundary and TypeScript guides before code changes.
- Added an introduction and notebook-style feature notes covering school search, published photos/filters, private proof and claim/collection tracking. Preserve the existing search form and four-step workflow.
- Added account creation for live anonymous visitors and My claims for signed-in users. The local mock preview continues to route through its explicitly labeled demo sign-in.
- Expanded staff guidance to explain listing, explicit photo publication, claims, returns and separately assigned staff permissions.
- Keep the introduction available for empty/failed school directories, with a functional retry after failure. Do not fabricate available schools.
- Added section links and restored hash-target focus/scroll after asynchronous router rendering, including direct links and browser history. Preserve focused validation summaries and naturally focusable controls.
- **Files created or modified:** `src/interface/{app.ts,public.ts,styles.css}`, `tools/phase2-browser-test.py`, interface guide, coordination state/board, report index and this report.
- **Decisions made:** Extend `/` using existing design and routes instead of adding a competing entry route, framework or external assets. Make no claims about matching accuracy or guaranteed ownership.

## Validation and results
- **Commands / checks run:** `npm run lint`, `npm run typecheck`, scoped UI `typecheck` and `format:check` passed; `npm test` 51/51 and `npm run test:mocks` 14/14 passed.
- `AXE_SCRIPT=tools/phase2/node_modules/axe-core/axe.min.js python3 tools/phase2-browser-test.py` passed all 19 scenarios, including existing twelve-route axe checks, school isolation, keyboard search/claim/review/return and phone layouts. The two new landing scenarios also passed separately after adding direct-link/history assertions and preserving validation focus.
- Initial new keyboard regression exposed native hash navigation triggering a rerender that reset focus to H1 and scroll to the top. The router correction resolves it; final tests pass.
- Direct `npx next build` passed optimized compilation, TypeScript and page generation. Full `npm run build` includes model download and is left to normal remote CI: this workspace's policy excludes the model host. No build script or check was weakened.
- Inspected desktop (1440px) and phone (320px) full-page screenshots. Additional 320/390/768/1440px probes at normal and 200% root text size had no document overflow or uncaught browser errors. Screenshots remain synthetic local artifacts in `/tmp/lostlink-home34-*.png`.
- A browser probe against `next start` from the final production build passed feature visibility during actual local API 503s, focused section navigation and the account-creation link reaching the real `/sign-up` page, with zero page errors. No API interception, account creation or hosted access was used. This is a frontend composition check, not configured Auth acceptance.
- Frozen root install initially failed in the existing Supabase postinstall's direct DNS lookup; installed unchanged dependencies with `npm ci --ignore-scripts --cache /tmp/lostlink-npm-cache` for local frontend verification. Scoped tools installed normally. No lockfile changes.
- **Tests not run:** Local database, real Auth/photo/return browser journey, pinned-model download/inference and hosted authenticated acceptance; no provider credentials are configured and these are unchanged contracts. Full repository CI remains enabled.
- **Deliverables:** Landing page, regression coverage and this report; [PR #36](https://github.com/AI-In-Bussiness/Lost-Link/pull/36) tracks remote CI, integration and issue closure.

## Thoughts and reflections
- **What worked well:** Existing search, reusable router and licensed local design assets support the introduction without adding dependencies.
- **What was difficult or surprising:** Native fragment navigation emits history events, so a static-looking feature link needed integration with the asynchronous DOM router.
- **Trade-offs and alternatives considered:** Keep search immediately usable and add a dedicated feature section below it. Keep failure handling inside the search area so a backend outage does not erase the product introduction.
- **What I would improve next:** Validate the final wording with actual new school visitors; existing synthetic checks cannot establish user comprehension.

## Cross-agent and cross-phase comments
- **For agents on other phases:** PR #33 owns separate photo/release-readiness changes on `codex/founder-b-phase-7`; preserve both contributions if main advances. Do not interpret this landing page as acceptance of hosted or matching-quality gates.
- **Dependencies / assumptions:** Existing public organization directory, school-scoped item/search APIs, signup route, private claims and staff permissions remain unchanged.
- **Risks / integration concerns:** Shared public view, CSS and router require normal combined CI; the known single-school header-navigation issue #24 remains outside this task.
- **Questions / requested decisions:** Founder version is unassigned metadata, not a blocker to the user's explicitly authorized issue fix. No product decision is needed for implementation.

## Follow-up and handoff
- **Remaining work at report publication:** Inspect remote checks and diff, merge and confirm issue closure through PR #36. Its timeline is the source for final integration status.
- **Recommended next steps:** Use a normal merge commit to preserve the reused branch's ancestry; do not force-push or delete historical branches.
- **Relevant references:** Issue #34; `DESIGN.md`; `docs/phase-2/interface-guide.md`; `docs/coordination/integration.md`; Founder A Phase 6 UI report.

## Publication — 2026-10-28 UTC

Implementation commit `6611490ec0946eefb6f04c185781dd8a2847affc` is published on
the reused source branch in PR #36. The preview build passed. Both Foundation
runs, cross-platform helpers and interface CI started; the relevance workflow
remains diagnostic and does not resolve issue #32. Remote results and the final
merge/closure are recorded on the PR so this dated implementation report does
not imply acceptance of separately owned release gates.
