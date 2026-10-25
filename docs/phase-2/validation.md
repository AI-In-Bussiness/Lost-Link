# Phase 2 validation record

Outcome: Founder B's backend API deliverable is implemented and verified locally against real Supabase and the production Next.js server. Founder A's screens, complete product browser journey and hosted deployment are not claimed complete.

## Passed

- `npm run lint`: no errors or warnings.
- `npm run typecheck`: exit0.
- `npm test`: 11 passed,0 failed/skipped;6 API tests plus5 existing auth tests. Covers cursor canonicalization, strict/duplicate query input, write privilege/status rejection, dates, evidence/version requirements, structured search inputs, streamed JSON size/content-type/malformed body handling and auth boundaries.
- `npm run db:test`:72 passing SQL assertions/expected denials, comprising27 foundation and45 backend checks against real local Supabase PostgreSQL. Suites use temporary fixture transactions and roll back.
- `npm run build`: optimized production build succeeded and includes all16 API operations across14 route paths.
- `npm run test:live`: both existing auth and new backend HTTP suites passed against the runner's own production server and real local Auth/PostgREST. No test targets a hosted project.
- `supabase migration up --local`: local database up to date after recording the applied backend migration. Existing seed/demo accounts preserved; no reset.
- Markdown links and `git diff --check`: clean.

## Functional evidence

HTTP tests create two disposable organizations, staff in each and independent claimants, then remove their data/users in finally cleanup. The tests exercise:

1. Public projection excludes private facts/storage; foreign organization detail returns404. Staff/claimant/anonymous authorization is checked at real HTTP endpoints.
2. Staff create/edit inventory with versions; stale updates409. Unknown actor/organization/status fields fail400. Cross-origin mutation403, malformed JSON400, oversized JSON413 and invalid paging400.
3. Structured search returns a relevant item, no relevant signal returns an empty list, and filters operate within the selected organization. No semantic quality is claimed.
4. Two claimants submit private proof; duplicate active claim409. A competing-approval race uses simultaneous HTTP requests: exactly one200 and one409. The item is reserved and disappears publicly.
5. Approval and return retries with original versions return the existing state. Exactly one approval, fulfillment and item-return audit event is recorded. Final return is persisted, not just reflected in a response.
6. Owner histories exclude staff notes. Foreign staff cannot review another organization's claim. Staff self-approval is denied403. Claimants cannot withdraw someone else's claim.
7. Withdrawal, staff rejection, cancellation/reopening and archive/automatic claim rejection work. Pagination advances without duplicate rows. Removing membership immediately denies subsequent staff access.
8. A fresh claimant's first5 submissions succeed and the sixth returns429 with Retry-After3600. The database enforces this quota across organizations/requests, rather than an in-memory per-server counter.

SQL tests independently exercise direct RPC boundaries so HTTP validation cannot hide missing database checks: action/key/type validation, staff and owner isolation, public projection, created/edited fields and optimistic versions, claim uniqueness, approval/cancellation/return/archive invariants, self-review/return denial, idempotent audit, quota and safe pagination. The Phase1 suite continues to verify table/Storage grants and policies independently.

## Review and scope limits

A separate reviewer inspected routes, validation, grants/security-definer functions, data projections, lifecycle locking, cursors and the test runner. One mismatch was corrected: RATE_LIMITED now maps to HTTP429 with Retry-After rather than503. Date validation leaves timezone-aware future checks to PostgreSQL. SQL and HTTP color validation agree on lowercase words with space/hyphen separators. No unresolved blocking review finding remains.

Not run: browser/Playwright, complete UI journey, hosted Supabase policy/migration checks, Vercel deployment and remote GitHub Actions. Photo arrays remain empty pending Phase3 upload processing and delivery. No semantic matching, retention scheduler, admin membership API or shared public search/login edge limiter is implemented. These are explicit later-work boundaries, not passing tests.

The backend migration was applied transactionally to the existing local stack, then recorded in Supabase migration history. This is local validation, not proof of a fresh environment restore or hosted rollout. Cloud startup instructions were updated and saved in the environment draft; saving does not publish the environment or deploy Vercel. Review/save environment settings before publication when desired. Existing hosted credential requirements remain outstanding.
