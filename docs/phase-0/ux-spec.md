# LostLink: user journeys and screens

LL-004 is a proposed UX assignment: its original title was absent from the supplied plan. Routes and copy are a proposed shared baseline for LL-006.

## Navigation and visual direction

Product name: **LostLink**. Homepage headline: **Find what you lost. Get it back safely.** Supporting copy: “Search your school's found items, send a private claim, and collect your belongings after staff verification.” Primary action: “Find my item.” Staff entry: “Staff sign in.”

Use a calm, practical school-service identity: deep navy text, teal actions, warm neutral surfaces, consistent rounded cards and clear item photography. Final colors require contrast verification. Use explicit labels, visible focus and status text alongside color; reserve brand polish for Phase 2. Target WCAG 2.2 AA, 44px touch controls, responsive content at 320px without horizontal page scrolling, and keyboard/screen-reader operation. No hover-only controls or motion-dependent information.

## Screen inventory

| Route / screen | Access | Required content and primary action |
| --- | --- | --- |
| `/` — Home | Public | Product promise, four-step explanation, fictional school selector; “Find my item” leads to selected school's search. |
| `/o/[orgSlug]/search` — School search | Public for enabled demo school | Persistent school name, free-text query, category/color/date filters, item cards, result count and reset filters. Query/filter state is URL-addressable. |
| `/o/[orgSlug]/items/[itemId]` — Item detail | Public available items | Photo, public title/description, category/color, broad location and found date; “This might be mine” opens claim form through sign-in. |
| `/sign-in` — Sign in | Public | Supabase Auth form; preserve a validated local return path. Sign-in failures preserve context. Staff role comes from membership, never a role picker. |
| `/o/[orgSlug]/items/[itemId]/claim` — Claim form | Signed-in claimant | Item summary, contact email, private ownership-evidence textarea, privacy explanation, submit action and correction errors. |
| `/my/claims` — My claims | Signed in, own records | Claim receipt/status and link to each claim. Empty state returns to school search. |
| `/my/claims/[claimId]` — Claim status | Claimant who owns record | Own submitted evidence, pending/approved/rejected/fulfilled status, public decision reason when rejected, and collection instructions when approved. |
| `/o/[orgSlug]/staff` — Staff dashboard | School staff/admin | Available/reserved/returned counts and pending claim queue; links to inventory and new item. Counts are operational totals, not claims of AI accuracy. |
| `/o/[orgSlug]/staff/items` — Inventory | School staff/admin | Search/filter inventory by state; link to item and claim review, including reserved and returned items. |
| `/o/[orgSlug]/staff/items/new` — Add item | School staff/admin | Public fields/photo plus distinctly separated private verification notes; preview public listing before publishing. |
| `/o/[orgSlug]/staff/items/[itemId]` — Manage item | School staff/admin | Public item, private notes, claims, state and activity log; review claims or record collection for approved claimant. |
| `/o/[orgSlug]/staff/claims/[claimId]` — Review claim | School staff/admin | Item details, private notes, claimant evidence/contact, pending decision controls, recorded outcome; “Approve for collection” or “Reject claim.” |

## Core journeys and behavior

**Student:** Home → school search → item detail → sign in if needed → claim form → receipt/status → collection instructions after approval. Preserve the item through sign-in. The student never picks a staff role. Claim success announces “Claim received. Staff will review your ownership details.” It does not promise approval or a review time. Instructions say where to collect, without exposing staff-only storage details. There is no automated email in this MVP; users revisit My claims.

**Staff:** Sign in → school dashboard → add item → public preview/publish → pending claim review → approve for collection → physically verify handover → mark returned. Approval and physical return are separate actions. Record-return confirmation names the item and claimant; a rejected claim leaves the item available unless another claim has reserved it.

**Result card order:** safe photo and descriptive alt text, title, category/color, broad found location/date, public match reasons, detail link. Say “Possible match,” never “95% yours.” Explanations such as “Similar item type and dark color” must correspond to actual ranking signals. AI outage copy: “Showing keyword and filter results while smart matching is unavailable.” Do not disclose private notes through ranking explanations.

**Claim form:** prefill editable contact email from account; require evidence of a detail absent from the listing, such as contents or an identifying mark. Explain “Only you and authorized school staff can view these details. Do not include passwords, identity documents or sensitive personal information.” Do not reveal the expected answer or require proof documents. On submit failure retain evidence in memory on the current page, never local storage or query parameters. Clear it on sign-out/success. Duplicate submission opens the existing pending/approved claim.

## Shared states and accessibility acceptance

| State | Expected behavior |
| --- | --- |
| Loading | Skeleton or labeled progress, stable layout; announce search completion without moving focus unexpectedly. |
| No results | “No matching items found.” Offer clear filters, browse all and school office guidance; retain query. No invented matches. |
| Empty inventory | Explain that no items are listed at this school; do not imply the missing item was never found. |
| Invalid form | Inline field errors plus a focused error summary linked to inputs; preserve valid entries. |
| Request failure | Plain-language error and retry; preserve non-sensitive query and in-memory form state. Avoid stack traces. |
| Signed out | Sign-in with validated return path; no private data rendered while checking auth. |
| Forbidden/not found | Private record access uses a generic unavailable response; staff navigation is hidden from claimants. |
| Item reserved/returned | Disable new claims and explain unavailability; stale open forms receive a conflict and refresh state. An existing claimant still sees their own status. |
| Concurrent decision | Refresh current state after a conflict; never claim approval succeeded when another staff member acted first. |
| Upload | Preview, progress, validation errors, replace/remove action; photo alt text describes the public item without hidden proof. |

Verify keyboard-only search/claim/review/return; landmarks and one clear H1; labels and instructions associated with controls; logical focus on navigation/errors; no status conveyed by color alone; text contrast at least 4.5:1 (large text 3:1); zoom and reduced-motion behavior; mobile portrait and tablet/desktop layouts. Staff tables become labeled cards or remain in a contained accessible scroll region.
