# Phase Report: 02 — Claim interface

## Metadata
- **Agent:** codex-claims-02 (Codex implementation subagent)
- **Founder version:** a (Founder A, assigned by the task owner)
- **Phase:** 02 — Claim interface
- **Status:** Completed (scoped implementation; independent browser review belongs to the parent/integrator)
- **Date (UTC):** 2026-10-25
- **Task / issue:** Founder A Phase 2 website interface; local contribution to the plan's LL-015–LL-021 range, without inventing individual workbook task assignments.
- **Branch / commit:** Parent working branch; parent will include this report with the final Phase 2 changes.

## Objective and scope
- **Goal:** Make the student claim journey navigable and functional against the injected mock contract.
- **In scope:** Demo sign-in, private claim form, own claim list, own claim status/receipt, errors and recovery links.
- **Out of scope:** Real authentication, server authorization, database persistence, actual email delivery, item uploads, staff pages and global styling.

## Work performed
- Read repository instructions, README, Phase 0 scope/contracts/UX/handoff, Phase 1 mock integration/handoff and nearby contracts/client/tests before implementing.
- Added `src/interface/claims.ts`, exporting `claimsView(ctx)` for `/sign-in`, `/my/claims`, `/my/claims/:id` and `/o/:org/items/:id/claim`.
- Used `LostLinkApi` only; no fixture or persona imports enter the UI module. The host injects explicitly fictional demo account actions separately.
- Added required email/evidence constraints, focused error summary and field errors through the shared helpers. Failed writes retain form entries in the current DOM. Success clears the evidence and navigates to the receipt; no private input enters URL parameters or browser storage.
- Rendered all four claim states using the owner's safe item snapshot, including reserved and returned items. Approved claims show collection instructions; rejected claims show claimant-visible reasons.
- Escaped all interpolated DTO/session text, preserved validated local return paths and kept private evidence out of the claim list.
- **Files created or modified:** `src/interface/claims.ts`; this uniquely named report. No existing source or shared module was changed by this subagent.
- **Decisions made:** Demo sign-in is explicitly identified as a preview rather than simulating real account authentication. No password field or claim of actual staff provisioning is introduced. An unavailable/conflict recovery link leaves existing evidence in memory until the user chooses navigation.

## Validation and results
- **Commands / checks run:** `node --experimental-strip-types -e "import('./src/interface/claims.ts').then(() => process.stdout.write('Claim view module loaded successfully\\n'))"` passed. `git diff --check -- src/interface/claims.ts` passed at implementation time.
- Ran Node 24 stdin assertions using `node --experimental-strip-types --input-type=module` against the injected real mock adapter. Passed checks covered private evidence omitted from lists; pending/approved/rejected/fulfilled rendering; one H1 on the reviewed status screens; another claimant's record unavailable; anonymous claim-form denial; reserved item unavailable; public item form lacking staff proof; HTML escaping of hostile evidence text; and a remote sign-in return path not becoming an external continuation link.
- **Tests not run:** This subagent did not run browser interactions, keyboard/viewport checks, production security checks or a TypeScript compiler. The parent owns browser integration and overall validation. Node stripping verifies executable syntax, not static types.
- **Deliverables:** `src/interface/claims.ts` and this report; integration notes sent to the parent agent.

## Thoughts and reflections
- **What worked well:** The `MyClaim.item` snapshot preserves access to an owner's status without exposing unavailable items through public lookups. API injection kept the views independent of development fixtures.
- **What was difficult or surprising:** Own claims can span schools, while the general route context represents one school. The views use `listOrganizations()` to display the actual school associated with each returned claim where available.
- **Trade-offs and alternatives considered:** A real sign-in form would imply capabilities that Phase 1 explicitly lacks. This implementation offers clearly marked fictional accounts only when the host injects demo session actions; real sign-in remains an integration dependency.
- **What I would improve next:** Once real authentication and notifications are defined, replace the preview account controls and agree final copy for the account/session and contact workflow.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder B/Phase 3 must keep server-side ownership checks on `getMyClaim` and `listMyClaims`. The UI session is display context and never an authorization boundary. Preserve duplicate active-claim receipts and the separate approval/fulfillment transitions.
- **Dependencies / assumptions:** Shared `types.ts` and `shared.ts` remain compatible with this module; the host refreshes views on session changes and removes previous DOM so private form contents do not survive sign-out. The mock adapter's shared store is preserved across preview persona changes.
- **Risks / integration concerns:** Browser previews include fictional mock data in their development module graph; do not ship that composition to production. The generic API contract remains proposed. No production privacy, storage, email or persistence guarantee is claimed by these views.
- **Questions / requested decisions:** Founder B and the Overseer still need to agree production authentication and final shared DTOs; none blocks review of the isolated Phase 2 mock interface.

## Follow-up and handoff
- **Remaining work:** Parent browser testing, styling, integration review, required overall Phase 2 report and PR.
- **Recommended next steps:** Test student sign-in with preserved item context, invalid claim correction, network failure retention, duplicate submit behavior, four seeded statuses, sign-out clearing and mobile keyboard operation. Style `.evidence` with `white-space: pre-wrap` for readable ownership details.
- **Relevant references:** `AGENTS.md`, `docs/phase-0/ux-spec.md`, `docs/phase-0/shared-contract-proposal.md`, `docs/phase-1/frontend-mock-guide.md`, `src/mocks/contracts.ts` and the parent Phase 2 handoff when available.

## Dated addendum — 2026-10-25 independent integration review

- At the parent's request, independently read `src/interface/app.ts`, `shared.ts`, `staff.ts`, the development composition, public view module, preview HTML, CSS and `tools/phase2-preview.mjs`. This review made no shared-source edits.
- Found a stale claim-submission navigation race: with the Slow scenario, a valid in-flight claim could finish after sign-out or another navigation and redirect the user to its old receipt. The parent resolved this by checking the form remains connected immediately after the awaited submission and by making context navigation, refresh and demo sign-in callbacks conditional on the current render generation. Re-read the implementation to confirm those guards are present.
- Reviewed the equivalent staff intake/approval/rejection/return callbacks; they already check that the bound main element remains connected after awaited writes. The render-generation checks prevent old read requests from replacing a newer page.
- The parent also corrected repeated validation `aria-describedby` accumulation and retained focus on a validation summary instead of replacing it with H1 focus during navigation. Re-read `shared.ts` and `app.ts` to confirm both changes.
- Reported a minor route consistency issue: the preview server accepts trailing-slash claims/staff URLs while those view dispatchers use exact paths. The `/staff/claims` alias is also implemented in the staff dispatcher but absent from the preview-server route list. Neither is used by current generated navigation. Parent owns any normalization or route cleanup.
- The server's allowlist confines serving to the interface modules/CSS, the two required development mock modules, the one placeholder asset and declared page routes. Source documents, `.git`, fixture JSON and unrelated filesystem files are not served. This is a local fictional preview review, not a production security audit.
- Browser verification by this subagent was not completed: a localhost preview launch on port 4175 returned `listen EPERM` under the sandbox. No escalation was requested because the parent was already performing the browser integration checks. Static review and the earlier Node view assertions remain the evidence contributed by this subagent.
