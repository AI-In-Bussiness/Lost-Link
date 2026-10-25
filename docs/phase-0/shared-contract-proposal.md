# Shared product contract proposal — LL-005 / LL-006 handoff

Founder A proposal for Founder B's architecture/security work. **Not an approved architecture or an implemented security guarantee.** Founder B owns final schema, authentication, RLS, storage rules, retention and transaction design; the Overseer checks agreement with this UX contract. Recommended stack remains Next.js App Router + TypeScript, Tailwind/shadcn, Supabase PostgreSQL/Auth/Storage, pgvector when semantic matching is added, Vercel and Playwright/CI.

## Roles, organization and visibility

Public visitors browse only organizations explicitly enabled for public listings; use fictional Cedar Grove in the demo. Claimant = authenticated user; staff/admin = server-verified organization membership, never user-submitted role. Staff can only operate within their memberships. No public signup-to-staff path or self-service organization creation in MVP. Founder B must define staff provisioning and recovery.

| Entity | Required contract fields | Public exposure |
| --- | --- | --- |
| Organization | id, slug, name, publicListingEnabled, collectionInstructions | Only enabled organization's safe display fields; instructions shown to approved claimants |
| Membership | userId, organizationId, role: staff/admin | None |
| Item | id, organizationId, title, publicDescription, category, color, foundLocation, foundDate, photo, status, createdAt, updatedAt | Explicit DTO for safe fields; only available items in public search/detail |
| ItemPrivate | itemId, organizationId, verificationNotes, storageLocation | Staff only; never embeddings/public photo/description/explanation |
| Claim | id, itemId, organizationId, claimantId, contactEmail, ownershipEvidence, status, decisionReason, decidedBy, decidedAt, createdAt | None publicly; owner can see own evidence/status and claimant-visible reason; staff within school can review |
| Activity | id, organizationId, actorId, itemId/claimId, action, timestamp | Staff only; no evidence text or contact data in logs |

Proposed shared category enum: bag, clothing, electronics, bottle, keys, accessory, other. Color is a normalized string; foundLocation is broad public location. All timestamps ISO 8601 UTC; foundDate and date filters are YYYY-MM-DD calendar dates. IDs opaque strings; organization slug resolves to server-validated ID. Search defaults: 20 results/page, maximum 50; stable ordering and pagination metadata. Semantic embeddings use public item fields only and must apply organization/availability filtering before results are exposed.

## State transitions and concurrency

Item: `available → reserved → returned`. Claim: `pending → approved | rejected`; `approved → fulfilled`. No student self-approval, reopening, deletion or withdrawal in this MVP. Rejecting a pending claim leaves item state unchanged. Approving requires available item and pending claim; atomically reserve item and approve exactly one claim. Other pending claims stay pending during reservation, but cannot be approved. Physical handover atomically marks item returned, approved claim fulfilled, and remaining pending claims rejected with safe reason “This item has been returned.”

Use atomic server/database operations so concurrent staff decisions cannot approve two claims. Conflict must return current safe state, not success. One active pending/approved claim per claimant/item; repeated submit returns existing receipt. Returned/reserved items cannot accept new claims. Retain claimant access to own claim status even when public item detail becomes unavailable. Founder B must define a staff correction path for mistaken reservations before real-world use; it is excluded from the competition happy path.

## Operation contracts

Transport may be route handlers or server actions; agree semantics before implementation. Never trust browser organization IDs or roles. Every operation applies server authorization and matching database/storage restrictions.

| Operation | Input | Success | Important failures |
| --- | --- | --- | --- |
| searchItems | orgSlug, optional query/category/color/from/to/page/pageSize | public item DTOs, public matchReasons, mode: keyword/hybrid, pagination | Invalid filters 400; disabled/unknown school 404; AI failure falls back |
| getPublicItem | orgSlug, itemId | Safe available-item DTO | Unavailable, other-school, reserved/returned 404 |
| submitClaim | orgSlug, itemId, contactEmail, ownershipEvidence | Claim receipt/status; repeat returns existing active claim | Auth 401, invalid 400, item unavailable 409 |
| listMyClaims / getMyClaim | own identity, pagination / claimId | Own claim DTO + safe item snapshot | Auth 401; other user's record 404 |
| createItem | staff org, public fields, photo reference, private notes/location | Persisted staff item DTO | Auth 401/403, validation/upload error 400 |
| listStaffInventory / getStaffItem | orgSlug, state/pagination / itemId | School staff item DTOs and permitted claim references | Auth 401/403; other-school item 404 |
| listStaffClaims / getStaffClaim | orgSlug, status/pagination / claimId | School-scoped private claim DTOs | Auth 401/403; other-school claim 404 |
| decideClaim | orgSlug, claimId, approve/reject, reason when reject | Updated claim and item state | Auth 401/403, invalid 400, stale state 409 |
| recordReturn | orgSlug, itemId, approvedClaimId | Returned item and fulfilled claim | Auth 401/403, mismatched/nonapproved/stale state 409 |

Errors use a stable code, safe message, optional fieldErrors and requestId; never raw SQL, private record existence or proof in logs. Proposed codes: VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR. Validation must run server-side as well as client-side.

Proposed limits: title 3–100 chars; publicDescription 10–1000; ownershipEvidence 20–2000; private notes 0–2000; location 1–100; query max 300; contactEmail valid and max 254; rejection reason 5–500. Trim text and render as plain text. Dates cannot be in the future; filter start cannot exceed end. Staff photo required: JPEG/PNG/WebP only, max 5 MB, validated by content and decoded safely; reject SVG, executable/polyglot and oversized inputs, strip metadata and ensure public derivative contains no identifying proof. Founder B validates feasibility and enforces secure upload paths and permissions.

## Founder B decisions required before joint gate

- Final schema, constraints, RLS and storage policies; no cross-school private reads/writes or public claim access.
- Auth method, staff invitations/provisioning, account/session behavior and safe sign-in return URLs.
- Data retention/deletion period and school consent requirements before real students or real evidence are collected. No invented policy duration in product copy.
- Upload validation/re-encoding pipeline, rate limits and abuse prevention; contact/evidence omitted from analytics/logs.
- Final API/shared types, DTO allowlists, status transitions, duplicate/idempotent behavior and concurrency tests.
- Service/AI costs, credentials and deployment environment; no credentials in browser bundles.

Review cases: anonymous claim denial; own vs another claimant's evidence; staff school A vs school B; forged org/role; cross-school image paths; private data absent from public DTO/search/embeddings; simultaneous approvals; stale return; duplicate submission; persistence after refresh; AI outage. These are future implementation checks, not tests already passed.
