# Founder A — Phase 3 integration handoff

Status: **Review** for the frontend integration; **Blocked** for the overall Phase 3 exit gate. Prepared October 25, 2026. Agent: `codex-founder-a-03`, Founder A, phase `03-real-workflows`. The source plan assigns LL-022–LL-030 to this phase; the individual task definitions/workbook remain unavailable. Local A3 IDs below do not invent those definitions.

## Delivered behavior

The Next.js homepage, organization search/detail, private claim form/history/status, staff dashboard/inventory/intake/review and physical return screens now consume Founder B's real `/api/v1` routes through `src/interface/http.ts`. The existing UI is mounted inside a Next.js Client Component; Server Components resolve the session display with `getUser()` and RLS-scoped membership reads. The server/API/database retain authorization responsibility. No service-role credential, runtime mock store or simulated account is part of the production composition.

Sign-in uses the existing server form endpoint and cookie session. An exact path allowlist preserves item-claim and staff continuation through sign-in, including failed attempts. Sign-out uses the existing same-origin POST. Account links reach My claims and assigned staff workspaces. Direct product URLs and refreshes resolve through Next.js routes. Back/forward cache restores reload the shell to revalidate identity. These behaviors are implemented, but real authenticated refresh/persistence is not verified in this environment.

Staff creates a text listing after reviewing an allowlisted public preview. The claim form sends only private evidence, using account identity; it does not send an editable contact address. Staff approvals, rejections and returns send the version displayed on the page. A conflict requires refresh rather than silently fetching a newer version and overwriting it. Return requires a separately checked physical-handover confirmation. Failed submissions retain entries. Duplicate submissions expose My claims and refresh recovery links. Each new screen/mutation fetches the backend again without a private-record cache.

## Explicit contract reconciliation

| Phase 2 interface | Phase 3 integration |
| --- | --- |
| Types imported from mocks | Separate `src/interface/contracts.ts` view model; runtime mocks stay in the loopback preview |
| Fictional session/persona controls | Server-verified session display, real sign-in/out routes; preview sign-in module imported only by `demo.ts` |
| `pending` | Backend `submitted` maps to the existing Pending label |
| Four claim statuses | Withdrawn and cancelled render distinct closed states; archived inventory is visible through staff filters |
| Editable claim contact email | Account email is read-only display; identity comes from cookies, no email copied into claims |
| Claim receipt includes full item snapshot | Backend supplies item title/reference only; the screen explicitly omits unavailable facts and does not fetch a hidden public item after reservation |
| Public rejection reason | Current backend supports a private review note and generic claimant decision; staff note is labeled private and is never rendered to claimant |
| `foundLocation`, `verificationNotes`, `ownershipEvidence` | Map to `publicLocation`, `identifyingDetails`, `evidenceText` |
| Mock accessory/date filters | Hidden on live controls; stale unsupported filter URLs fail explicitly with reset recovery |
| Page numbers and exact counts | Cursor APIs are scanned fresh in batches of 50 for the small showcase, then sliced for the existing page-number UI |
| Ranked search | Real structured-search POST, at most 50 results, visibly labeled as a bounded top-results set; no semantic AI claim |
| Placeholder upload metadata | No photo or upload metadata is sent to the real create endpoint; listing explicitly uses an illustration |
| Mock activity list | Live screen says the activity feed is unavailable; backend still records audit events |

Cursor scans are bounded at 100 batches/5,000 rows and fail visibly if incomplete or cyclic. They do not silently report partial totals. This is a deliberate showcase bridge, with more requests than native cursor navigation. Separate requests are not a transactional snapshot; counts can change during concurrent writes. Before larger inventories, add cursor-native navigation and server-side counts/detail endpoints. No database lifecycle, API request schema, RLS policy or migration was changed by this phase.

The school selector resolves configured slugs through existing public organization endpoints, defaulting to `maple-school,cedar-school`. Set optional server variable `LOSTLINK_ORGANIZATION_SLUGS` to change that directory. A direct organization URL and assigned staff slugs are also resolved. This list is discovery configuration, never an access control.

## Run and review

Follow the root README for Node 24, dependencies, local Supabase, public configuration and operator-provisioned fictional accounts. Run `npm run dev`, or `npm run build` then `npm start`. Use `http://localhost:3000`, matching `NEXT_PUBLIC_SITE_URL`, so the existing Origin checks succeed. No hosted service or deployment was created by this work.

The branch combines Founder B Phase 2 (`5be324e220528d6d6fcef070c177c42dde6be040`) with Founder A Phase 2 (`5fc10076d21b609294accde9dc712a8965c4a36c`, preserved as cherry-pick `c09662d`). Both are unmerged dependencies of this integration. The draft PR targets `codex/founder-b-phase-2` to keep the backend dependency explicit; its diff includes the imported Phase 2 interface. Integrators should review/merge dependencies and retarget as appropriate. This work does not approve either upstream gate or merge anything into main.

Executed evidence and reproduction commands are in [validation.md](validation.md). Scope/status tracking is in [task-board.csv](task-board.csv). The required phase report is in `agent-logs/codex-founder-a-03__founder-va__phase-03-real-workflows/`.

## Blockers and next owners

1. **Founder B — photos:** The current create/detail DTOs have no upload/delivery pipeline and return empty photo arrays. Provide the secure photo endpoints and DTOs, then connect a real file control/public preview. The plan requires a real found item with a photo; illustrations do not satisfy that requirement.
2. **Environment owner / Overseer — live acceptance:** `npm run db:start` failed because the managed network denied the default Supabase image registry `public.ecr.aws`. No local Supabase services were available. Recover approved local service access, configure the app and provision fresh fictional accounts. Independently create → refresh → search → claim → refresh → approve → refresh → return → refresh, verifying both receipt state and removal from public search. Database/HTTP tests from earlier reports were not re-certified here.
3. **Founders / Overseer — contract decisions:** The current API offers a generic claimant rejection status rather than the proposed explanatory public reason, account-derived identity rather than editable claim contact, no date-range filtering and no activity feed endpoint. This frontend follows the actual contract and labels these boundaries. Decide whether additive backend support is required for final MVP acceptance; do not publish private notes as a shortcut.
4. **Independent reviewer:** Review this integration, keyboard/screen-reader behavior and actual browser screenshots. The task board remains Review/Blocked, with no self-certified Done entries.

## Tools and limits

Codex, connected GitHub tools, the cloud runtime skill, Git, Node/npm, TypeScript, ESLint, Next.js and Python Playwright/Chromium were used. No delegated agents were used in this run. Package installation needed a writable temporary npm cache and `--ignore-scripts` after the Supabase installer failed direct DNS; the same pinned CLI was downloaded through the configured proxy for the startup attempt. No dependency or lockfile versions changed. Tool entitlements/project spend remain team inputs, not an assumed $0. The existing original interface and checked-in illustration were reused. Automated checks are not independent acceptance, a complete accessibility audit, hosted validation or production security approval.
