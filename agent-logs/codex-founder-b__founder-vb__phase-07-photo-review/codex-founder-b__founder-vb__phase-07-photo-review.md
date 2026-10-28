# Phase Report: 07 — Photo review repair

## Metadata
- **Agent:** codex-founder-b (Codex)
- **Founder version:** B
- **Phase:** 07 — photo-review
- **Status:** Completed (scoped UI correction; release approval remains blocked)
- **Date (UTC):** 2026-10-28
- **Task / issue:** User screenshot: public cards show photo pending; existing PR #33
- **Branch / commit:** codex/founder-b-phase-7, based on 7bd294b; current main ae883e6 is an ancestor

## Objective and scope
- **Goal:** Explain the real photo state and make publication review discoverable.
- **In scope:** Placeholder text, same-school staff navigation, management page order and browser regression coverage.
- **Out of scope:** Automatic publication, authorization changes, hosted account impersonation and unrelated release blockers.

## Work performed
- Confirmed public production responses contain zero published photos for the screenshot's listings. The public projection cannot establish whether a private upload exists; no claim of a broken processor was made.
- Found the misleading "photo pending" string hardcoded in the shared illustration. Replaced it with "No published photograph" and updated the HTML caption accordingly.
- Moved photo controls above public/private item details. Available items with pending photos now show explicit upload-success/review/publication guidance; empty photo lists explain how to upload and publish.
- Added same-school staff-only Review or add photos links on placeholder cards and public detail pages. Existing API authorization remains authoritative.
- Fixed the new card action's stacking so the existing stretched listing link cannot intercept it.
- Extended the real browser journey to check both staff entry points, top-of-page review, refresh persistence, anonymous absence of management links, and actual public bytes after explicit publication.
- **Files created or modified:** public/mock-assets/item-placeholder.svg; src/interface/{live-photos,public,shared,staff}.ts; styles.css; tools/live-browser-test.py; coordination board; this report; Phase 7 README.
- **Decisions made:** Preserve private review and explicit publication. Public placeholders must not claim an upload is processing or disclose unpublished photo existence.

## Validation and results
- **Commands / checks run:** Frozen npm ci passed. npm run build, lint, root/UI type checks, format:check and git diff --check passed. npm test: 51 passed. npm run test:release: 21 passed. npm run test:browser: full persisted real local Auth/Storage/DB journey passed, including new review links and actual photo publication, at five viewports with axe/keyboard/privacy checks.
- **Tests not run:** Hosted staff session/photo inspection: runtime has no hosted credentials; the user's dashboard session is not available to this agent. Unchanged SQL suites not repeated.
- **Deliverables:** Corrected review UI and existing PR #33 update. No claim of production deployment before merge.

## Thoughts and reflections
- **What worked well:** Separating public publication state from private processing exposed the confusing step without weakening privacy.
- **What was difficult or surprising:** The full-card listing link intercepted the new staff action; the browser test caught it and CSS stacking corrected it. Initial build needed npm ci because the restored node_modules predated integrated semantic dependencies; build passed after frozen install.
- **Trade-offs and alternatives considered:** Kept explicit review instead of publishing uninspected photos. Existing seed illustrations remain clearly labeled; no invented photos.
- **What I would improve next:** Independently review the hosted staff journey after merging; preserve the release gate's outstanding rollback/relevance/acceptance requirements.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A can review the photo panel's new priority and staff navigation; backend publication, quotas, no-store delivery and tenant policies are unchanged.
- **Dependencies / assumptions:** Staff membership is supplied by verified session display; all actual staff reads/writes are independently authorized by API/DB.
- **Risks / integration concerns:** PR #33 also contains prior release verification work. This UI correction does not certify the overall Phase 7 gate or prove hosted photo settings.
- **Questions / requested decisions:** Independent code/UX review remains pending; no new product decision required.

## Follow-up and handoff
- **Remaining work:** Remote checks/review and merge before production rollout; authenticated hosted confirmation and broader Phase 7 gates remain separate.
- **Recommended next steps:** For an existing uploaded photo, open its staff item page, inspect the private preview, check confirmation and select Publish reviewed photo. Upload an image first if no preview exists.
- **Relevant references:** PR #33; docs/phase-7/README.md; docs/phase-3/README.md; docs/phase-7/readiness-audit.json.
