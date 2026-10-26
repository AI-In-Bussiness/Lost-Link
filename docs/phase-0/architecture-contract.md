# LL-006 — Architecture and shared contracts

Status: Proposed for founder review. Phase 0 design, not implemented.

## Scope and decisions

Demonstrate Search → Match → Claim → Return at a fictional school, with synthetic people and items only. Support multiple organizations in the schema and isolation tests from the start. P0: home, organization search/listings, structured matching, private claim submission, staff inventory, claim review and return. P1: semantic matching and explanations after the structured workflow works. Notifications, analytics, image recognition, QR codes, multilingual search and integrations are deferred. The supplied competition rubric is mapped in competition-alignment.md. Exact deadline is not supplied; these MVP choices remain proposed.

Use Next.js App Router with TypeScript, Tailwind and shadcn/ui; Supabase PostgreSQL, Auth and Storage; Vercel hosting; Playwright for journeys and database integration tests for authorization. Pin supported versions and package manager in Phase 1. No paid AI provider is required for P0.

The browser calls same-origin Next.js route handlers. Handlers validate inputs and use a request-scoped Supabase client with the caller's identity. Database RLS is the final authorization boundary. Never authorize solely through hidden buttons, a URL org slug or client role fields. Service-role credentials bypass RLS: keep them server-only and out of normal user-request handlers. Limit privileged provisioning to an explicit administrative process. Public search uses a restricted projection/RPC that cannot expose private columns. Embedding jobs are server-only and index public searchable fields only.

## Entities

All IDs are UUIDs; times are UTC timestamptz; APIs serialize ISO 8601. All tenant-owned tables include non-null `organization_id`. Composite foreign keys `(organization_id, related_id)` reference a unique `(organization_id, id)` pair to prevent cross-organization links. Index tenant, status, and lookup columns. Migrations, grants and RLS remain Phase 1 work.

| Entity | Fields and constraints | Visibility |
| --- | --- | --- |
| organizations | id, unique slug, name, published, created_at | Published name/slug only to public |
| profiles | id references auth.users, display_name, created_at | Self; no public user directory |
| memberships | organization_id, user_id, role `staff` or `admin`, created_at; unique org/user | Self membership; org admin manages staff via protected server path |
| items | id, organization_id, title (1–100), public_description (1–1000), category, color, public_location, found_date, status, created_by, created_at, updated_at, version | Approved public projection for available items; full row to org staff |
| item_private_details | item_id, organization_id, identifying_details, storage_location | Org staff only; never search input/output |
| item_photos | id, organization_id, item_id, storage_path, status `pending`/`published`, created_by | Public projection includes published, staff-reviewed photos only |
| claims | id, organization_id, item_id, claimant_id, evidence_text (20–2000), status, submitted_at, reviewed_at, reviewed_by, private_review_note, decision_reason, closed_at, evidence_deleted_at, version | Owner sees own evidence and public decision; staff sees org claims; private notes excluded from owner response |
| audit_events | id, organization_id, actor_id, action, entity_type, entity_id, occurred_at, request_id, previous_status, new_status | Append-only server writes; org staff reads; no evidence text, tokens or sensitive payloads |
| item_embeddings (P1) | organization_id, item_id, model, dimensions, content_hash, embedding, updated_at | Server only, derived from public fields; no private evidence |

Category keys: `bag`, `clothing`, `electronics`, `keys`, `bottle`, `other`. Color is a normalized lowercase label or `unknown`. `found_date` is a calendar date and cannot be in the future in the organization's configured timezone (default UTC until agreed). Private information lives in separate tables rather than relying on row filtering to hide columns.

## Roles and transitions

Anonymous visitors can search published organizations and view available-item projections. Authenticated claimants can submit claims and see only their own claims. Staff can manage inventory and review/return claims only in their organizations. Admin is staff plus membership management. No public registration path can self-assign staff or admin. Provision the first admin through a controlled setup process.

Item states: `available → reserved → returned`; staff may `available → archived`, or `reserved → available` only by cancelling the approved claim. Archiving an available item atomically rejects its submitted claims with decision_reason `item_unavailable`. Terminal returned/archived items cannot receive claims. Claim states: `submitted → approved | rejected | withdrawn`; `approved → fulfilled | cancelled`. Staff cannot approve or confirm return of their own claim; require a different authorized staff member. Scheduled retention expiry additionally permits submitted → cancelled with reason expired, as defined below. Only claimant can withdraw a submitted own claim; only staff can review, cancel approval or confirm return. Approval reserves the item and rejects other submitted claims atomically with decision_reason `item_unavailable`; reject does not alter item availability. Return atomically marks item returned and approved claim fulfilled. Cancellation makes item available; rejected claims stay rejected and may be resubmitted explicitly. Staff must check private evidence and confirm in-person ownership before return; matching is never proof.

Approval locks the item row in a transaction, checks current states, and uses a partial unique constraint for one approved claim per item. Submission also locks/checks the item; at most one submitted or approved claim per claimant/item. Mutations use expected versions; stale requests return 409. Retried return/approval of the same already-applied action returns the existing result with no duplicate audit event. Cross-tenant targets return 404. Direct database calls must enforce the same transitions via restricted transactional functions, grants and policies, not just handlers.

## Pages shared with Founder A (proposed)

| Page | Path | Access |
| --- | --- | --- |
| Home | `/` | Public |
| Organization search | `/o/[orgSlug]` | Public, published org only |
| Item details | `/o/[orgSlug]/items/[itemId]` | Public available projection |
| Sign in | `/sign-in` | Email/password Supabase Auth for demo; provision confirmed synthetic accounts |
| Claim form | `/o/[orgSlug]/items/[itemId]/claim` | Authenticated |
| My claims | `/my-claims` | Authenticated, owner only across organizations |
| Staff inventory | `/o/[orgSlug]/staff/items` | Org staff/admin |
| Staff claim review | `/o/[orgSlug]/staff/claims` | Org staff/admin |

Every data screen needs loading, empty, forbidden/not-found and retryable error states. Sign-in return paths must be local allowlisted paths. Founder A can build mocks from the contracts below without a live database.

## HTTP contract v0.1

All endpoints are `/api/v1` prefixed, same-origin JSON. Unknown fields rejected. Server derives actor identity and org ID from session and resolved slug. Bodies never accept claimant_id, reviewer_id or membership role. Cookie-auth mutations require Origin/CSRF checks. Configure abuse controls before public release (see security design).

Success: `{ "data": ... }`; list: `{ "data": [], "page": { "nextCursor": null } }`. Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "Check the submitted fields.", "fields": {"evidenceText": "Use 20–2000 characters."}, "requestId": "uuid" } }`. Use 400 validation, 401 missing session, 403 known inaccessible operation, 404 absent/cross-tenant resource, 409 conflict, 413 oversized upload, 415 invalid type, 429 throttled (Retry-After), 503 dependency unavailable. Never return stack traces or internal SQL.

| Method/path | Input | Result and guard |
| --- | --- | --- |
| GET `/organizations/:slug` | — | `{id, slug, name}` published org |
| GET `/organizations/:slug/items` | q optional max 300 chars; category/color optional; limit 1–50 default 20; opaque cursor | PublicItem[], available only, same org |
| GET `/organizations/:slug/items/:id` | — | PublicItem or 404 |
| POST `/organizations/:slug/search` | `{query, category?, color?, limit?}` same bounds | Match[], available only; no evidence input |
| POST `/organizations/:slug/items/:id/claims` | `{evidenceText}` | 201 ClaimOwner; authenticated; duplicate/conflict 409 |
| GET `/me/claims` | limit/cursor | ClaimOwner[] for session user only |
| POST `/organizations/:slug/claims/:id/withdraw` | `{expectedVersion}` | ClaimOwner; owner only |
| GET `/organizations/:slug/staff/items` | status, limit/cursor | StaffItem[]; staff |
| POST `/organizations/:slug/staff/items` | public fields, identifyingDetails, storageLocation | 201 StaffItem; staff, starts available |
| PATCH `/organizations/:slug/staff/items/:id` | editable descriptive fields, expectedVersion | StaffItem; staff; no direct status writes |
| POST `/organizations/:slug/staff/items/:id/archive` | `{expectedVersion}` | StaffItem; available only |
| POST `/organizations/:slug/staff/items/:id/photos` | multipart image, max 5 MiB | 201 `{id,status:"pending"}`; staff upload validation |
| POST `/organizations/:slug/staff/items/:id/photos/:photoId/publish` | — | Reviewed public photo; staff verifies no private clues/PII |
| GET `/organizations/:slug/staff/claims` | status, itemId optional, limit/cursor | ClaimStaff[]; org staff |
| POST `/organizations/:slug/staff/claims/:id/review` | `{decision:"approve"|"reject", expectedVersion, privateNote?}` note max 1000 | ClaimStaff; transactional transition |
| POST `/organizations/:slug/staff/claims/:id/cancel` | `{expectedVersion, privateNote?}` | ClaimStaff; releases reservation |
| POST `/organizations/:slug/staff/claims/:id/return` | `{expectedVersion, ownershipVerified:true}` | ClaimStaff fulfilled; transactional return |

PublicItem: `{id, organizationSlug, title, publicDescription, category, color, publicLocation, foundDate, photos:[{url,alt}]}`. No storage location, identifying details, finder/claimant identity, claim counts or evidence. Only published photos appear. StaffItem adds `{status, identifyingDetails, storageLocation, version, createdAt, updatedAt}`. ClaimOwner: `{id,itemId,organizationSlug,itemTitle,status,evidenceText,submittedAt,reviewedAt,decisionReason,closedAt,evidenceDeletedAt,version}`. ClaimStaff adds `{claimantId,reviewedBy,privateReviewNote}`. No claim evidence included in inventory/search response. Private responses use `Cache-Control: private, no-store`; public search uses no shared cache for MVP to avoid stale returned listings.

Match: `{item:PublicItem, reasons:["Similar category","Similar description"], method:"structured"|"hybrid"}`. Never expose a purported ownership probability. P0 tokenize/normalize public title and description, combine category/color matches and deterministic tie-breaking by found_date then id; return empty on no relevant signal, not arbitrary inventory. P1 filter by org and availability inside retrieval before ranking; combine semantic/structured signals and fall back to structured matching on AI timeout. Preserve response shape. Record model/ranking configuration and evaluate against agreed synthetic queries in Phase 4; no measured matching quality is claimed now.

## Validation required before implementation approval

- Migration tests: cross-org composite foreign keys, one active claim per owner/item, one approved claim/item; direct invalid lifecycle writes denied.
- RLS tests with anonymous, claimant, same-org staff, other-org staff and admin JWTs; check direct REST/RPC and Storage access, not only UI routes.
- Concurrent approval/submission tests and repeated/stale transition calls; correct atomic state and audit counts.
- Browser journey: staff creates item and reviews photo → visitor searches → signs in → submits private proof → staff approves and returns → refresh preserves states. Rejected/withdrawn/cancelled flows and empty/error states also exercised.
- Search and response serialization tests prove private evidence and other-org items never leak, including fallback.

These are planned checks, not tests executed in Phase 0. Implement authentication/RLS first, then inventory/search, then claim transitions, then P1 matching. Do not deploy with permissive temporary policies.

## Closure and retention contract

`decision_reason` is a safe enum: `approved`, `rejected`, `item_unavailable`, `withdrawn`, `cancelled`, `fulfilled`, or `expired`; it is never free-text staff commentary. Every transition updates it. `closed_at` is set on rejected, withdrawn, cancelled or fulfilled claims; approved reservations remain open. A scheduled cleanup expires submitted or approved claims after 90 days of inactivity, atomically cancelling them with reason `expired` and releasing any reservation. Add `last_activity_at` to claims for this purpose. Evidence must meet length limits on submission; cleanup may set evidence_text to null and evidence_deleted_at to the deletion timestamp. ClaimOwner returns null evidence with a removed-evidence UI state after cleanup. Terminal records cannot be reopened. Private item fields may likewise be nulled by retention jobs. These are design requirements for migrations and scheduled jobs, not implemented behavior.

Photo `alt` uses the sanitized public item title as a deterministic fallback in P0; do not derive it from private fields or original filenames.
