# Founder B — Phase 2 backend handoff

Founder B's roadmap responsibility in Phase 2 is to continue backend implementation against the shared contracts while Founder A builds the interface. This change provides real API endpoints for that integration. It does not claim the full team Phase 2 UI exit gate or a deployed product is complete.

## Delivered

Public organization lookup, available-item browse/detail, structured text search, staff inventory create/read/edit/archive, private claim submission and owner history, staff review/rejection/cancellation/return, audit events and shared claim throttling. Application requests use the session user's Supabase client; no service-role key is used in route handlers. Database functions independently enforce permissions and input/state rules, including when called directly through Supabase REST.

The additional migration is `supabase/migrations/202610250002_backend.sql`. The original Phase 1 migration is unchanged. The local migration is applied and recorded in migration history; `supabase migration up --local` reports up to date. No local database reset was needed, and the existing fictional demo accounts remain usable.

## API surface for Founder A

All paths below are prefixed `/api/v1`. Mutation bodies are JSON. The browser's same-origin session cookies identify the caller. POST/PATCH requests require an exact matching Origin; external CLI tests must supply it explicitly. Public search POST uses the same origin rule.

| Capability | Method and path | Access |
| --- | --- | --- |
| Organization | GET `/organizations/:slug` | Published organization |
| Inventory browse | GET `/organizations/:slug/items` | Public available fields |
| Item detail | GET `/organizations/:slug/items/:id` | Public available fields |
| Structured match | POST `/organizations/:slug/search` | Public, available items only |
| Staff inventory | GET/POST `/organizations/:slug/staff/items` | Organization staff/admin |
| Staff detail/edit | GET/PATCH `/organizations/:slug/staff/items/:id` | Organization staff/admin |
| Archive | POST `/organizations/:slug/staff/items/:id/archive` | Organization staff/admin |
| Submit claim | POST `/organizations/:slug/items/:id/claims` | Authenticated claimant |
| My claims | GET `/me/claims` | Caller only, across organizations |
| Withdraw | POST `/organizations/:slug/claims/:id/withdraw` | Claim owner |
| Staff claims | GET `/organizations/:slug/staff/claims` | Organization staff/admin |
| Review | POST `/organizations/:slug/staff/claims/:id/review` | Organization staff/admin |
| Cancel reservation | POST `/organizations/:slug/staff/claims/:id/cancel` | Organization staff/admin |
| Confirm return | POST `/organizations/:slug/staff/claims/:id/return` | Organization staff/admin |

Success envelopes are `{data: ...}`; lists add `{page:{nextCursor:null|string}}`. Created inventory/claims return 201. DTOs use the camelCase fields in the Phase 0 contract; owner claims exclude privateReviewNote, claimantId and reviewedBy. Staff inventory adds identifyingDetails/storageLocation/status/version/timestamps. Private data never appears in public inventory/search.

Lists accept `limit` 1–50 (default20) and an opaque `cursor`. Ordering is UUID ascending with a canonical base64url encoding of `v1:UUID`; treat the cursor as opaque and pass it back unchanged. It is pagination state, not authorization. Lists with filters require retaining the same filters when paging. UUID order is the chosen deterministic list contract for this iteration, replacing the earlier proposed date-based list order. New rows can appear before a cursor; refresh to see new inventory. Search is separately ranked by matched public terms, then found date descending and UUID, with limit only (no cursor). Browse accepts optional `q`, `category`, `color`; staff inventory accepts status; staff claim lists accept status and itemId. Duplicate/unknown query keys fail validation.

Schema/validation source: `src/lib/api/contracts.ts`; route adapter: `src/lib/api/handler.ts`. The database exposes one fixed-action `backend_dispatch` RPC, with private projection/audit helpers that client roles cannot invoke directly. Both HTTP and RPC reject unknown fields and invalid state writes.

### Input examples

Create item (staff):

```json
{
  "title": "Black athletic backpack",
  "publicDescription": "A black backpack with a white sports logo.",
  "category": "bag",
  "color": "black",
  "publicLocation": "Gym entrance",
  "foundDate": "2026-01-01",
  "identifyingDetails": "Fictional distinguishing fact kept private.",
  "storageLocation": "Fictional staff cabinet"
}
```

Claim submission: `{ "evidenceText": "My bag contains a fictional yellow dinosaur keyring." }` (20–2000 characters). Search: `{ "query": "black backpack", "limit": 20 }`. Edit: `{ "expectedVersion": 1, "title": "Updated public title" }`. Review: `{ "expectedVersion": 1, "decision": "approve", "privateNote": "Staff-only verification note" }` or decision `reject`. Withdraw/archive require expectedVersion. Cancel accepts expectedVersion and optional privateNote. Return requires `{ "expectedVersion": 2, "ownershipVerified": true }`. Versions are examples: use the resource's actual returned version.

Allowed categories: bag, clothing, electronics, keys, bottle, other. Colors are lowercase words separated by spaces/hyphens, at most40 characters. Public description max1000, private identifying details max2000, title max100, locations max150, private review note max1000. Dates must be valid and not in the future in the organization's timezone (database enforced). Every create includes a private distinguishing fact and storage location. These examples describe requests, not real inventory or research evidence.

## State and failure behavior

- Approval locks the item and claim, reserves the item, rejects competing submitted claims and writes audit metadata in one transaction. Return atomically fulfills the claim and marks the item returned. Public detail/search hide reserved, returned and archived items.
- A successful cancellation reopens the item without resurrecting rejected claims. Archive rejects open submitted claims. Withdrawal affects only the caller's submitted claim. Staff cannot approve or confirm return of their own claim.
- Submit, approve, archive, edit and return use transactional state/uniqueness checks; mutations other than submission require expectedVersion. Stale/conflicting requests return409. Exact retries of an applied approval (same reviewer) or return with the original pre-transition version return the existing state without duplicate audit events.
- Successful claim submissions are capped at5 per user per rolling hour across all organizations. The database serializes the quota across concurrent requests. A sixth submission returns429 with Retry-After3600. Rejected duplicate attempts do not consume the quota.
- All responses use private,no-store. Errors include code, safe message and requestId; validation may include fields. HTTP status codes: 400 invalid input,401 unauthenticated,403 forbidden operation/origin,404 absent or inaccessible tenant resource,409 conflict,413 body too large,415 wrong content type,429 quota,503 unavailable dependency. Never display raw SQL errors to users.
- JSON body cap16KiB is checked while streaming, independent of Content-Length. No caller-supplied actor, organization ID, staff role or arbitrary status field is accepted.

## Still later work

Photo upload decoding/re-encoding, review/publication and download URL delivery belong to Phase 3. Photo arrays are intentionally empty in these new DTOs; Storage permission rules from Phase 1 remain. Structured matching uses public text/attributes only, never private evidence, and is not semantic AI. Embeddings/evaluation are Phase 4. Frontend integration, loading/error/accessibility states and browser user journeys remain Founder A/Phase 3 work. Membership-management endpoints, retention scheduling and shared deployment throttling for public search/login are also outstanding; this is not a production security sign-off.

The existing Supabase/Vercel hosted targets remain identified but unverified without usable provider authentication. No remote migration, source push, deployment or remote CI run is claimed. Do not blindly apply these migrations to an unknown hosted schema. Existing secure token requirements in environment settings remain the path for hosted setup.

## Validation

See [validation.md](validation.md). `npm run db:test` now runs both SQL suites; `npm run test:live` now runs both auth and backend HTTP suites against its own production server on a free port3000. For an already-running local app, `npm run test:backend` runs only the backend HTTP suite. All fixtures are newly created fictional organizations/users and removed on completion. The SQL suites roll back their fixtures. Do not target these tests at a hosted project.
