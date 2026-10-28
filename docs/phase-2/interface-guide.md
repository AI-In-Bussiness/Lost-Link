# Founder A Phase 2: website interface

Status: **Review**. The interface uses fictional Phase 1 mock data. It is ready for independent UX review, not production use or competition submission. The original task workbook is still unavailable; the plan assigns LL-015–LL-021 to this phase without defining individual task titles.

## Open the preview

From the repository root, with Node **24+**:

```sh
node tools/phase2-preview.mjs
```

Open <http://127.0.0.1:4173>. No package installation is needed to run it. For reproducible checks, run `npm ci --prefix tools/phase2`, install `tools/phase2/requirements.txt`, and run `npm --prefix tools/phase2 run typecheck`. The scoped tools directory does not establish a second root application. `LOSTLINK_PREVIEW_PORT` can change the port. The server binds to loopback and refuses `NODE_ENV=production`. Stop with Ctrl+C.

The persistent prototype notice explains that every person/item is fictional, accounts are simulated, and refreshing resets changes. Expand **Demo controls** below the footer to switch personas, simulate slow loading, empty inventory, request errors, rate limits or smart-matching unavailability. Reset restores the original data. All personas share one in-memory store until reset/refresh. No evidence is written to browser storage, URLs, server logs or a database.

This harness serves only the interface modules, necessary mock JavaScript, one placeholder SVG and application routes. It does not serve the repository's private-response JSON, documentation or Git metadata. The mock JavaScript intentionally contains fictional staff evidence; source availability is another reason to keep this local and exclude mocks from production.

## Screens and interactions

| Route | Interface behavior |
| --- | --- |
| `/` | LostLink introduction, feature overview, school search, account/claims entry, four-step explanation and staff entry; introduction remains available if the school directory fails |
| `/o/[orgSlug]/search` | Query, category/color/date filters, public keyword reasons, six-card pagination, empty/error/fallback states |
| `/o/[orgSlug]/items/[itemId]` | Public item facts, illustration notice, sign-in return path or direct claim link |
| `/sign-in` | Explicit fictional student/staff demo actions, validated local return path |
| `/o/[orgSlug]/items/[itemId]/claim` | Editable contact email, private evidence, focused validation, retry and duplicate receipt handling |
| `/my/claims` | Own claim summaries and pagination |
| `/my/claims/[claimId]` | Receipt, own evidence, pending/approved/rejected/fulfilled state, reason or collection instructions |
| `/o/[orgSlug]/staff` | API-derived inventory counts, claim queue, status filter |
| `/o/[orgSlug]/staff/items` | Inventory state filter and pagination |
| `/o/[orgSlug]/staff/items/new` | Separated public/private fields, illustration/alt text, public preview before publish |
| `/o/[orgSlug]/staff/items/[itemId]` | Public facts, staff notes/storage, linked claims, activity and confirmed handover |
| `/o/[orgSlug]/staff/claims/[claimId]` | Private comparison, approval, reasoned rejection and separate physical return |

Search state uses `q`, `category`, `color`, `from`, `to` and `page` URL parameters. Evidence/contact never enter URLs. Invalid search values remain available for correction. Available listings only are public; a claimant's own receipt retains the safe item snapshot after reservation/return. Protected views use API responses, not just hidden navigation.

Loading replaces the previous view before requests resolve. Render-generation checks discard stale responses and stale navigation after sign-out or a newer action. Failed claim submission retains entries in the current form; navigating/signing out clears that form. A focused error summary links to fields. Native controls, visible focus, a working skip link, one H1 and contained, labeled keyboard-scrollable staff tables support keyboard operation.

## Rehearse the workflow

1. Search Cedar Grove for `black Nike duffel`. Open the duffel and select **This might be mine**.
2. Continue as the demo student. Submit invented evidence, such as `The inside pocket contains a fictional purple jump rope.` Keep the resulting claim reference.
3. Switch to Cedar Grove staff using Demo controls. Open **Staff workspace**, find that reference in the queue and review it.
4. Select **Approve for collection**. This reserves the item; it does not record a return.
5. Confirm the named item was handed to the named claimant, then select **Mark item returned**.
6. Switch back to Avery and open the claim. It is fulfilled. Public search for `duffel` no longer lists that item. Reset before repeating.

Also try the seeded approved jacket, two competing bottle claims, rejected backpack and Jordan's fulfilled headphones. Maple Hill staff cannot open Cedar Grove staff views. The disabled school and another student's claim show a generic unavailable page.

## Implementation boundary

`src/interface/app.ts` exports `mountLostLink(element, host)`. The host supplies `getApi(): LostLinkApi`, `getSession(): Session | null` and `signOut()`. Session information controls display; the adapter must authorize every protected operation. The optional `demoSignIn` exists only for preview composition.

`public.ts`, `claims.ts` and `staff.ts` return typed views and bind native DOM events. `shared.ts` supplies escaped text/attributes, public cards, dates, badges, pagination, form errors and submit locking. `styles.css` contains original navy/teal/neutral design tokens, breakpoints and reduced-motion behavior. No external fonts, templates or image services are requested. The homepage illustration is original inline SVG; inventory photography remains the explicitly labeled Phase 1 placeholder.

Only the development composition (`demo.ts` and its local photo projection) imports runtime mocks. All other interface references to `src/mocks/contracts.ts` are erased type imports. Do not include `demo.ts`, mock clients, fixtures, response JSON or this preview server in a production bundle. Reconcile the proposed DTOs with Founder B before moving the type contract into a shared production module.

This PR remains a standalone mock interface. Founder B’s foundation exists on its separate branch, and real Next.js/API integration is tracked in PR #7. This isolated, dependency-free browser interface lets Phase 2 proceed without introducing a competing root project. Founder B/integrator should decide how to adapt these views into the planned Next.js client routes/components and coordinate history ownership. This is an explicit integration cost, not evidence of a passing Next.js build. Real Supabase sign-in, photo selection/upload, persistence, RLS, transactions and semantic matching belong to later work.

## Validation

```sh
node --experimental-strip-types src/mocks/client.test.ts
python tools/phase2-browser-test.py
git diff --check
```

The browser suite needs Python Playwright and Chromium (`CHROMIUM_PATH` overrides `/usr/bin/chromium`); start the preview first. `LOSTLINK_PREVIEW_URL` overrides its URL. It checks workflow transitions, intake preview, rejection, validation, error recovery, private view boundaries, sign-out races, keyboard skip navigation and the important screens at 320/768/1440px. Screenshots go to `/tmp/lostlink-*.png`.

For accessibility scans, set `AXE_SCRIPT` to a local axe-core `axe.min.js` before running the suite. Without it, that one optional test is explicitly skipped. The scan covers 12 route/persona combinations using WCAG A/AA tags; automated checks do not establish complete accessibility conformance.

Strict static checking can run with a locally available TypeScript compiler:

```sh
tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --lib ES2022,DOM,DOM.Iterable src/interface/*.ts
```

See the [handoff](founder-a-handoff.md) and phase reports for executed results and remaining work.


## Merge-readiness follow-up (2026-10-26 UTC)

Read the [Overseer response and evidence matrix](review-response.md). Intake now supports local JPEG/PNG/WebP selection, decode/size errors, preparation progress, preview, replacement and removal. No bytes leave the browser. The development host projects the selected blob photo over the unchanged placeholder-only mock adapter; reset/refresh releases those temporary images. Production uploads remain separately scoped.

The Phase 2 GitHub Actions workflow runs locked TypeScript/format checks, mock tests and the expanded Chromium suite with axe enabled. Its downloadable review artifact contains viewport screenshots. Run locally with `AXE_SCRIPT=$PWD/tools/phase2/node_modules/axe-core/axe.min.js python tools/phase2-browser-test.py` after starting the preview. Install Chromium with `python -m playwright install chromium` if no system browser is available.
