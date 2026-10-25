# Phase Report: 03 — Real workflows

## Metadata
- **Agent:** codex-founder-a-03 (Codex; no subagents)
- **Founder version:** A (lowercase `a` in path)
- **Phase:** 03 — real-workflows
- **Status:** Blocked (frontend implementation ready for review; overall live/photo gate remains blocked)
- **Date (UTC):** 2026-10-25
- **Task / issue:** User assignment: Founder A phase 3; plan.pdf Phase 3, LL-022–LL-030 range. Individual task workbook unavailable.
- **Branch / commit:** codex/founder-a-phase-3; baseline Founder B `5be324e`; imported Founder A Phase 2 as `c09662d`. This report is included with the integration commit.

## Objective and scope
- **Goal:** Connect finished frontend screens to real backend endpoints with working forms and status updates.
- **In scope:** Next.js mounting/routing, session display, cookie transport, form/DTO reconciliation, optimistic concurrency, receipt/status rendering, targeted tests, reporting and draft review handoff.
- **Out of scope:** Database/RLS/lifecycle changes, secure photo processing owned by Founder B, semantic matching, hosted deployment, competition submission and independent acceptance.

## Work performed
- Read README, AGENTS.md, plan.pdf, upstream Founder A reports and Founder B architecture/API/integration documents. Used GitHub connector because the initial local checkout was stale. Selected explicit Founder A identity/phase metadata.
- Created an integration branch from the existing backend and preserved the additive Phase 2 interface commit. Kept upstream mocks, historical reports, reference documents and database migrations intact.
- Mounted the interface in Next.js Server/Client Components, retaining the existing DOM views. Added real HTTP transport with cookie credentials/no-store, safe error mapping and bounded cursor traversal. Reconciled field names/statuses explicitly.
- Connected create/search/submit/history/review/return. Sent rendered claim versions; retained failed forms and conflict recovery. Kept account email read-only. Represented unavailable photo/activity/receipt fields honestly. Kept private review notes out of claimant views.
- Added allowlisted sign-in continuation and account workflow links. Separated preview sign-in code so production does not import demo controls or runtime fixtures.
- **Files created or modified:** `src/interface/{contracts.ts,http.ts,live-client.tsx,live-page.tsx,demo-signin.ts}`; existing interface views/host/types/demo; Next.js home/layout/sign-in/account/auth route and new organization/My claims routes; `src/lib/auth/security.ts`; `tests/interface-http.test.ts`; `tools/phase3-browser-test.py`; README/.env.example; Phase 3 docs/task board and this report.
- **Decisions made:** Follow actual backend schemas without silently changing contracts. Preserve small-showcase page-number screens using bounded fresh cursor scans; document scaling costs. Build on the two unmerged dependency branches and use a draft handoff; do not merge or claim upstream acceptance.

## Validation and results
- **Commands / checks run:** `npm run lint` and `npm run typecheck` passed; `npm test` passed 18; `npm run test:mocks` passed 14; `npm run build` passed; `python tools/phase3-browser-test.py` passed four; `python tools/phase2-browser-test.py` passed seven with one optional axe test skipped; `git diff --check` passed. See `docs/phase-3/validation.md` for boundaries and final rerun notes below.
- **Commands that failed:** Initial dependency installation failed on an unwritable inherited cache, then the Supabase install hook failed DNS. Temporary cache/locked install without hooks plus the same pinned CLI through the proxy resolved tooling. `npm run db:start` remained blocked by the Supabase image-registry Forbidden response. The first test command without network permission could not open tsx's local IPC socket; the permission-enabled rerun passed. No code failure was hidden as a passing result.
- **Tests not run:** Live Supabase/SQL/authenticated-persistence tests, secure photo tests, hosted checks, remote CI and manual assistive-technology review. Infrastructure/contract dependencies are absent. Independent review not performed.
- **Deliverables:** `docs/phase-3/founder-a-handoff.md`, `docs/phase-3/validation.md`, `docs/phase-3/task-board.csv`, source/tests and required report. Visually inspected `/tmp/lostlink-phase3-search.png` from a fixture-backed production screen. Draft PR is the review handoff, not approval.

## Thoughts and reflections
- **What worked well:** The existing injectable host made transport replacement practical. Backend-authored versions and DTOs exposed behavior differences early. Tests now distinguish real route mounting from fixture-only authenticated interactions.
- **What was difficult or surprising:** Neither previous branch was integrated into main; the local checkout predated both. Prototype receipts assumed item snapshots/contact data that the real API deliberately omits. Empty photo arrays and inaccessible local image registry prevent a truthful end-to-end exit-gate claim.
- **Trade-offs and alternatives considered:** A full React rewrite would expand this phase substantially; a small Next.js wrapper reuses verified DOM behavior but requires careful history/auth boundaries. Cursor scans preserve UI totals for fictional school inventory at the cost of request volume and non-atomic counts. A scalable product should use native cursor navigation and count/detail endpoints.
- **What I would improve next:** Run the actual fresh-account flow on recovered local services, agree photo/error/rejection contracts, then migrate pagination before a larger inventory rollout.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder B Phase 3 must supply secure photos and image DTOs. Current private review notes must remain staff-only. Overseer must verify actual cookie sign-in, tenant scope and refreshed lifecycle state; fixtures do not prove these properties. Founder B/integrator should review the explicit mapping table before changing API shapes.
- **Dependencies / assumptions:** Depends on Founder B Phase 2 `5be324e` and Founder A Phase 2 `5fc1007`; configured public school slugs default to fictional seeds. User authorized Founder A Phase 3, not acceptance of earlier gates.
- **Risks / integration concerns:** Unmerged dependency branches, capped cursor scans, absent photo pipeline/activity read endpoint/date filters/public rejection explanations and unexecuted real persistence. Production APIs still enforce authorization independently of session display.
- **Questions / requested decisions:** Founders/Overseer should decide final MVP behavior for claimant rejection explanations and missing search/activity capabilities, and arrange an environment with approved Supabase service access. No permission question blocks preserving this implementation for review.

## Follow-up and handoff
- **Remaining work:** Live database-backed browser/refresh acceptance; secure photo integration after Founder B exposes endpoints; independent review and joint gate decision.
- **Recommended next steps:** Follow the handoff's fresh-account sequence, run existing SQL/live HTTP suites, inspect privacy and version conflicts, then accept/reopen tasks. Merge/retarget dependency branches through normal project review. Keep task statuses Review/Blocked until verified.
- **Relevant references:** `plan.pdf` Phase 3; `AGENTS.md`; `docs/phase-2/{README.md,integration-notes.md,founder-a-handoff.md}`; `docs/phase-3/founder-a-handoff.md`. No next phase started.

## Final verification addendum — 2026-10-25 UTC

Final lint/typecheck/build passed. The final adapter/auth unit suite passed 18 tests and retained mocks passed 14. The Phase 3 suite passed all four checks, including explicit withdrawn/cancelled receipt and staff-state checks added during review. The retained Phase 2 browser suite passed seven with its one optional axe scan skipped. Production JavaScript was searched for runtime mock-store identifiers, private fixture markers and demo account controls; none were found after extracting demo sign-in. CSV shape/statuses, relative Phase 3 document links and whitespace checks passed. No live persistence or photo claim was added.
