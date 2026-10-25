# Founder A Phase 1: frontend mock integration

Status: implementation ready for independent review; shared backend contract remains proposed. No app, Supabase project, authentication, hosting or database security is configured by this work. Use the [Phase 0 contract](../phase-0/shared-contract-proposal.md) until Founder B supplies agreed production types.

## What is included

| File | Purpose |
| --- | --- |
| `src/mocks/contracts.ts` | UI-facing DTOs, discriminated success/error results and `LostLinkApi` interface |
| `src/mocks/fixtures.ts` | 12 fictional found items across two schools, five claims in all four states, personas and minimal activity fixtures |
| `src/mocks/client.ts` | Async in-memory adapter for every Phase 0 operation, reset/snapshot helpers and configurable scenarios |
| `src/mocks/client.test.ts` | Executable behavior tests using Node's built-in test library |
| `src/mocks/response-examples.json` | 16 captured response scenarios for static component work; includes fictional private evidence |
| `src/mocks/search-cases.json` | 12 labeled queries for later matching evaluation; not a claim of measured AI quality |
| `public/mock-assets/item-placeholder.svg` | Original, reusable illustration clearly labeled as a placeholder, not a found-item photo |

All identities, inventory and evidence are invented. Contact addresses use reserved `example.invalid`. The fixed mock clock is October 25, 2026; pass `now` explicitly if testing other dates. Item found dates range from October 16–24, 2026. IDs are opaque fixture references, not database schema choices.

Cedar Grove has nine available items, one reserved jacket and one returned pair of headphones. Maple Hill has a deliberately similar black duffel to catch organization leakage. The disabled school exercises unavailable organization handling. Categories cover bag, clothing, electronics, bottle, keys, accessory and other. Claim fixtures include two competing pending bottle claims, an approved jacket claim, a rejected backpack claim and a fulfilled headphones claim. Activity history is intentionally minimal and does not claim to reconstruct historical seed decisions.

## Run the checks

Requires Node **24+** with built-in TypeScript stripping. No package installation or root package/README changes are needed. From the repository root:

```sh
node --experimental-strip-types src/mocks/client.test.ts
```

The built-in tests report 14 cases when run directly this way. Type stripping executes TypeScript syntax but does not type-check it; run the project type checker once Founder B establishes the TypeScript foundation. This phase did not install a compiler or add a competing project scaffold.

## Use through dependency injection

Frontend components should depend on `LostLinkApi`, rather than importing the fixtures. Keep this construction in a development-only composition module, and pass the resulting client into hooks/components. Production composition must select a real adapter and exclude the entire mock dependency tree and fixture JSON from the bundle. Mock personas are not sign-in or permission enforcement.

```ts
import { createMockApi, createMockStore } from '../../src/mocks/client.ts';
import type { LostLinkApi } from '../../src/mocks/contracts.ts';

// Create once per demo session, outside React render functions.
const store = createMockStore();
const publicApi: LostLinkApi = createMockApi(store, { latencyMs: 350 });
const studentApi = createMockApi(store, { persona: 'student', latencyMs: 350 });
const staffApi = createMockApi(store, { persona: 'staff', latencyMs: 350 });

const result = await publicApi.searchItems({
  orgSlug: 'cedar-grove', query: 'dark gym bag', page: 1, pageSize: 20,
});
if (result.ok) {
  // Render result.data.items, pagination, matchReasons and keyword mode.
} else {
  // Render result.error.message / fieldErrors; map code to sign-in/retry/conflict UI.
}
```

The imports above assume a file two folders below the repository root; adjust to its real location. Integrate hooks/forms/pages in Phase 2. Read-only DTOs returned to callers are cloned: mutating a response cannot mutate fixtures. All clients sharing one store observe writes; constructing a new store starts a separate demo session.

## UI scenarios

| UI state | Setup / action |
| --- | --- |
| Loading | `{ latencyMs: 800 }`; render loading until promise settles |
| Browse/search/results | Default client and Cedar Grove; filters use category, normalized color and date range |
| No result | Search `telescope` or use filters with no matching items |
| Empty inventory and claim lists | `createMockApi(createEmptyMockStore(), { persona: 'student' })` |
| Failure/retry | Client with `{ failure: 'network' }`; create a normal client over the same store to retry |
| Rate limited | `{ failure: 'rateLimit' }` returns `RATE_LIMITED` |
| Invalid form | Submit evidence shorter than 20 characters or malformed email |
| Signed out | Default `anonymous` persona calls protected operation |
| Access denied | `student` calls staff operations, or `otherStaff` accesses Cedar Grove |
| Missing/wrong-school item | Cedar Grove lookup of `item-maple-duffel` |
| AI outage | `{ aiUnavailable: true }` returns keyword results and a truthful fallback flag |
| Pending / approved / rejected | Student reads `claim-pending`, `claim-approved`, `claim-rejected` |
| Fulfilled | `otherStudent` reads `claim-fulfilled` |
| Conflict | Approve `claim-approved` again or submit a fresh claim for unavailable item |
| Fresh demo | `store.reset()`; recreate/reload component state after reset |

`failure` affects every operation of that client until it is recreated. Scenarios are explicit local development settings, not public query parameters. Loading duration is simulated; no remote service is contacted. Responses contain codes, not HTTP status codes; future transport should map them to the Phase 0 semantics.

## Repeatable end-to-end frontend demo

1. Start a shared store and public/student/staff clients. Public search for `black Nike duffel` at `cedar-grove` returns `item-duffel`; Maple Hill's duplicate must not appear.
2. Student calls `submitClaim` for `item-duffel`, with `avery@example.invalid` and fictional evidence “The inside pocket contains a purple jump rope.” Capture the returned claim ID. Repeating the active submission returns the same receipt.
3. Staff reads the claim, then calls `decideClaim({ orgSlug: 'cedar-grove', claimId, decision: 'approve' })`. Item becomes reserved; student sees collection instructions. Other pending claims cannot be approved for that item.
4. Staff calls `recordReturn({ orgSlug: 'cedar-grove', itemId: 'item-duffel', approvedClaimId: claimId })`. Item becomes returned and approved claim fulfilled; other pending claims are rejected. Item disappears from public search/detail. Owner retains access to claim status.
5. Recreate a client with the same store to simulate remounting. For a test-process restart, `createMockStore(store.snapshot())` restores state. This is explicit in-memory snapshot restoration, **not automatic browser refresh persistence or a database**. Never persist real evidence in browser local storage. Reset before rehearsing again.

For intake, call `createItem` with the typed public/private fields, the checked-in placeholder photo and mock upload metadata. Only placeholder references are accepted. Real photo uploads, byte/content validation, re-encoding and storage permission checks belong to Founder B; the mock only validates claimed metadata. The placeholder SVG is a static development illustration, not an accepted upload type. Photographs are still required for the real P0 product.

## Matching limitations and handoff

This adapter implements deterministic **keyword and attribute matching only**. Tokens from public title, description, category, color and broad location rank results; stop words are removed, ties sort by found date then ID. No synonyms, embeddings, AI calls, ownership probabilities or invented similarity scores are used. Reasons list actually matched public terms. `aiUnavailable` is an outage UI fixture, not proof of an attempted provider request. Paraphrase cases intentionally expose baseline gaps for Phase 4; do not claim semantic success from these fixtures.

Founder B should replace the adapter behind `LostLinkApi`, reconcile DTOs with the approved schema, implement server/database authorization and transactional decisions, add actual auth/upload/persistence, and agree transport semantics. The mock's synchronous state transitions simulate one approval winner but do not validate database concurrency or RLS. Keep private notes/evidence out of public DTOs, logs and embeddings in the real implementation.
