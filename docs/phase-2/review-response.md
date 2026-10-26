# Phase 2 Overseer response and merge evidence

The Overseer report in PR #5 inspected `412010c`, before PR #4's interface existed. Its original findings are preserved. This follow-up addresses its twelve-route matrix against the Phase 2 source; it does not grant Phase 0/1 acceptance or claim real backend security.

| Overseer requirement | Delivered evidence |
| --- | --- |
| Homepage and school navigation | School selector, describe/search entry, four steps; public browser journey |
| School search | URL filters, pagination, no results, empty, loading, request/rate-limit errors, keyword fallback |
| Public item | Public DTO allowlist, unavailable reserved/returned/wrong-school views, claim entry |
| Sign-in | Explicit demo accounts, local return validation, failure feedback, retained school context |
| Claim form | Private text, focused summary/field links, retry retention, duplicate receipt and conflict recovery |
| Own claim list | Own records only, empty state, pagination and school-labeled links |
| Claim status | All four states, own evidence, rejection reason and collection instructions |
| Staff dashboard | Scoped counts, status-filtered queue, denied view |
| Inventory | State filtering, pagination, labeled keyboard-scrollable table |
| Intake | Public/private separation, local photo prepare/progress/errors/preview/replace/remove, preview then publish |
| Manage item | Private notes, claims, activity and confirmed physical handover |
| Review claim | Evidence comparison, approval, required rejection reason, stale conflict recovery |

The browser suite covers all twelve routes at 320/768/1440px, keyboard-only search → claim → review → handover, browser back/forward, Maple Hill context through sign-in/status, all claim states, duplicate receipts, delayed navigation/sign-out, failure retention, injected stale conflicts, dotted field-ID focus, local photo validation and publication, text resizing and reduced motion. Axe checks twelve route/persona combinations; screenshots are uploaded by `.github/workflows/phase2-interface.yml` as `phase2-review-evidence`.

New UI fixes include active school retained in session memory, focusable validation targets, explicit skip-link focus, local photo state and sign-in failure feedback. The `demo-photos.ts` projection preserves the original placeholder-only mock contract and keeps image bytes in the browser. Production photo delivery and Next.js/API integration belong to separate work, including PR #7.

Reproducible tools are isolated in `tools/phase2/` with a lockfile, strict TypeScript configuration and pinned Python Playwright. CI runs type/format checks, the 14 original mock tests and the full Chromium suite with axe enabled. The Phase 2 guide documents local commands.

Peer review identified the school-context and photo-UI gaps before fixes. The original independent report remains an accurate record of that inspection; no independent Overseer approval is invented. Delivered tasks remain Review pending formal phase acceptance. The task owner's request authorizes merging this verified Phase 2 implementation separately from accepting upstream gates.

## Combined backend and Phase 3 follow-up

The [2026-10-26 Overseer response](../coordination/overseer-response.md) verifies the integrated real stack, twelve live routes, actual photo review, date filters, separate public/private rejection text and persistent browser journey. This supplements the original mock-only review evidence above without rewriting its result.
