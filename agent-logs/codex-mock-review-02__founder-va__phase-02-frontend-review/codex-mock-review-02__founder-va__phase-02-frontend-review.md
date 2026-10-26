# Phase Report: 02 — Frontend mock review

## Metadata
- **Agent:** codex-mock-review-02 (Codex review subagent)
- **Founder version:** a (Founder A, assigned by the task owner)
- **Phase:** 02 — frontend-review
- **Status:** Completed
- **Date (UTC):** 2026-10-25
- **Task / issue:** Founder A Phase 2; read-only review of the Phase 1 mock adapter for frontend implementation.
- **Branch / commit:** Reviewed GitHub default-branch files at tree `412010ccaf6a2af77cf3abc6ed260676d557b86e`; implementation branch is managed by the parent agent.

## Objective and scope
- **Goal:** Identify the existing UI-facing API, validation constraints, reproducible scenarios, and integration risks before frontend work.
- **In scope:** `AGENTS.md`, every file in `src/mocks/`, and `public/mock-assets/item-placeholder.svg`.
- **Out of scope:** Source edits, backend contract approval, authentication, real uploads, deployment, and verification of production security.

## Work performed
- Read the complete requested files using the connected GitHub `fetch_file` tool, including tests and both JSON fixture files. Read complete `client.ts`, `fixtures.ts`, and `client.test.ts` from retained tool results after the initial batch output was truncated.
- Shared implementation constraints with the parent agent before frontend implementation.
- **Files created or modified:** This report only; existing source and remote repository were not changed by this review.
- **Decisions made:** Preserve the adapter's proposed types and transitions. Treat mock behavior as development support rather than evidence for real authentication, storage, semantic matching, or database transactions.

## Validation and results
- **Commands / checks run:** GitHub `fetch_file` reads succeeded for all eight requested files. Local `rg --files /workspace/Lost-Link` confirmed the repository directory was being prepared. No behavior-test execution was performed by this review agent.
- **Tests not run:** `src/mocks/client.test.ts` was read but not executed; the parent agent owns implementation validation and its final test results.
- **Deliverables:** This report and the contract notes below.

### Existing contract
- `LostLinkApi` provides organization listing, public search/detail, claim submission and claimant list/detail, staff inventory/intake/detail, staff claim list/detail, review decisions, and physical return recording. Every call returns `Promise<Result<T>>`, with structured error codes and optional `fieldErrors`; unexpected exceptions are not swallowed by the mock.
- Public items contain organization, title, public description, category, color, found location/date, photo, status, and timestamps. Staff items additionally contain `verificationNotes` and `storageLocation`. Public conversion uses an explicit allowlist.
- Search uses public title, description, category, color, and found location only; it never uses hidden verification details. It returns available items in the selected public organization, with exact token matches ranked by number of matching terms, then found date and item ID. All responses report `mode: 'keyword'`; `aiUnavailable` only sets the fallback notice flag.
- Search query maximum is 300 characters; color maximum is 50; category must be one of bag, clothing, electronics, bottle, keys, accessory, or other. Date filters must be real, nonfuture ISO dates and ordered. Pagination is one-based, with page size 1–50 and default 20.
- Claim contact email accepts 3–254 trimmed characters and an email-shaped value; ownership evidence requires 20–2000 trimmed characters. Existing pending or approved claims for the same claimant/item return the original receipt. Claimant views include the public item even after reservation or return; direct public-item lookup rejects those states.
- Intake title requires 3–100 characters, public description 10–1000, found location and storage location 1–100, color 1–50, verification notes 0–2000, and photo alt 1–200. Found date is validated against the fixed default clock `2026-10-25T14:00:00.000Z`.
- Intake simulates image metadata only: JPEG, PNG, or WebP, integer size 1–5 MiB. It accepts only `/mock-assets/item-placeholder.svg` and `isPlaceholder: true`. The SVG visibly identifies itself as a fictional demo illustration, not a photo.
- Approval changes pending → approved and available → reserved. Rejection needs a 5–500 character reason and leaves the item available. Return requires the reserved item and its approved claim, then changes the item to returned, the approved claim to fulfilled, and other pending claims for that item to rejected. A second review, second approval, mismatched return, or duplicate return produces a conflict.

### Reproducible states
- Cedar Grove has nine publicly available items, one reserved jacket, and one returned pair of headphones. Maple Hill has a near-identical duffel for organization-isolation checks. A disabled organization must not appear publicly.
- Avery owns pending, approved, and rejected seeded claims. Jordan owns the competing bottle claim and a fulfilled headphones claim. Cedar and Maple staff have separate organization memberships.
- Empty store, network-shaped failure, rate limiting, latency, and keyword fallback are configurable. Twelve fixed search cases cover exact queries, paraphrases, no matches, and organization boundaries; they are evaluation fixtures, not proof of semantic matching.
- Existing tests cover public/private DTO separation, private words excluded from matching, filters/pagination/errors, mock access checks, receipt ownership/idempotency, complete intake-to-return flow, competing approvals, intake validation without partial writes, clone isolation, scenarios, and reset behavior.

## Thoughts and reflections
- **What worked well:** The explicit DTO boundary and shared-store factory make it possible to build realistic screens without changing the backend proposal. Existing fixtures expose states that would otherwise be easy to overlook.
- **What was difficult or surprising:** All matching remains keyword matching even when `smartMatchingUnavailable` is false. The intake metadata object can resemble an upload despite having no real byte persistence. UI copy must explain these limitations accurately.
- **Trade-offs and alternatives considered:** Reusing the typed adapter preserves Phase 1 behavior, but the complete fixture store includes pretend private evidence in memory. A development-only entry point is needed until Founder B supplies a production adapter.
- **What I would improve next:** After the joint contract is approved, add the real adapter at the same interface and verify authorization and atomic transitions against the backend rather than extending mock checks as security evidence.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A should inject `LostLinkApi` into frontend screens and keep staff-only DTOs outside public props. The implementation must label search as possible keyword matches and must not invent AI confidence percentages. Founder B should reconcile this proposal before live integration.
- **Dependencies / assumptions:** `createMockApi` captures its persona at creation; persona changes require a new client against the same persistent mock store. A separate store per screen loses workflow continuity. `listMyClaims` includes owned claims across organizations.
- **Risks / integration concerns:** Never ship mock fixtures as production authentication or secret storage. UI route hiding is not access control. Approval is reservation, not completed handover. Stale async requests can display the wrong organization or item unless screens cancel or disregard obsolete responses.
- **Questions / requested decisions:** The existing proposal still needs Founder B review. No new owner decision was required to perform this review.

## Follow-up and handoff
- **Remaining work:** Parent agent implementation, type/build/browser checks, and final Phase 2 handoff. Production backend readiness and joint contract approval remain outside this review.
- **Recommended next steps:** Exercise browse → detail → claimant submission → receipt → staff approval → physical return using a shared store. Verify error, empty, unauthorized, wrong-school, reserved, and returned states. Keep mock imports behind a development-only boundary.
- **Relevant references:** `src/mocks/contracts.ts`, `src/mocks/client.ts`, `src/mocks/fixtures.ts`, `src/mocks/client.test.ts`, `src/mocks/response-examples.json`, `src/mocks/search-cases.json`, `docs/phase-1/founder-a-handoff.md`.

## 2026-10-25 addendum — public screen implementation

The parent agent reassigned this instance to implement the public screens within the same Founder A Phase 02. Scope expanded to `src/interface/public.ts` only, alongside this report. Read the root's `src/interface/types.ts` and `src/interface/shared.ts`, then the Phase 0 UX/product scope and Phase 1 mock integration guide before editing.

- **Work performed:** Added the exported async `publicView(ctx)` for homepage, school search, and public item detail. Screens accept only the injected API and never import fixtures. The homepage loads public schools, retains the specified headline, provides a search form, and explains the four steps without invented statistics. An original decorative inline bag/bottle illustration uses no external asset.
- **Search behavior:** GET-style forms navigate through the host callback; query, category, color, dates, and page are URL-addressable. Category/color controls preserve unknown values from invalid URLs. Invalid date strings remain editable text rather than disappearing through browser date-input normalization. Search errors preserve controls and query; empty/no-match, unavailable school, invalid page, out-of-range page, pagination, fallback, and retry states have recovery actions. Results identify keyword matching and possible matches honestly.
- **Detail behavior:** Renders only public item fields and the shared safe image helper. The claim action preserves the exact claim route through sign-in for an anonymous visitor and links directly for an existing session. No upload or staff details appear.
- **Files created or modified:** `src/interface/public.ts` and this dated report addendum. Other agents' source remains unchanged.
- **Validation:** `node --experimental-strip-types --input-type=module` executed twelve smoke scenarios against the existing adapter: homepage organization options; browse/count/pagination/private-field exclusion; search matching; escaped malformed query with preserved invalid category/date; no-match recovery; empty inventory; out-of-range page recovery; invalid page recovery; smart-matching fallback copy; network failure with retained query; anonymous detail return path/private-field exclusion; signed-in detail link. All twelve passed.
- **Checks not run:** Static TypeScript checking and browser interaction/accessibility checks remain with the parent agent's integrated toolchain. The smoke checks exercised view generation but did not execute DOM event bindings.
- **Decisions and trade-offs:** The implementation is a plain TypeScript view module to fit the host interface supplied by the parent agent. Calendar inputs are retained for valid ISO dates; malformed URL dates use text inputs to preserve correction context. Homepage staff sign-in is an entry link, not a client role selector.
- **Cross-agent handoff:** Additional style hooks are `hero-description`, `step-number`, `item-detail`, `detail-image`, and `item-facts`; the root owns CSS. API authorization, real sign-in, upload handling, persistent storage, and production adapter integration remain unchanged dependencies. No new contract changes were made.
- **Remaining work and next steps:** Parent agent should run the integrated type/build/browser checks, review responsive layouts and error-focus behavior, and include this module/report with the Phase 2 deliverable.
