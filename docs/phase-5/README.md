# Founder B — Phase 5 quality and security

Founder B engineering scope complete and ready for review. Source: plan.md, Phase 5 / LL-038–LL-045: permissions, upload security, private claim data, reliability and malicious input. Independent Overseer acceptance and Founder A's browser/accessibility work are separate. Final code `10061df` passed the [Foundation security and end-to-end checks](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40402040638). See [backend review and findings](backend-review.md).

## Baseline and delivery

Started from main `b70777e` on `codex/founder-b-phase-5`. During publication main advanced to `f18076d`, merging Phase 4 PR #12. That main update is merged into this branch with both sets of reports and board entries preserved. Phase 4 local inference and its known negative-case relevance findings remain part of the combined tree; no Phase 4 quality acceptance is inferred. No database migration or deployment is included.

## Request-body hardening

The existing JSON, sign-in and photo readers bounded bytes but could wait indefinitely for a stalled/trickling stream. `src/lib/http/body.ts` now enforces a shared absolute ten-second read deadline plus each existing byte limit. It counts actual bytes regardless of Content-Length, stops excessive reads, clears the timer and starts cancellation without awaiting an untrusted cancellation hook. The deadline is total elapsed time across chunks, rather than an idle timeout renewed by every byte.

JSON and multipart deadline failures return HTTP 408 / REQUEST_TIMEOUT with safe retry copy and the existing no-store/request-ID envelope. Sign-in keeps its existing invalid-form behavior on failed body reads. It also rejects invalid UTF-8 instead of replacing credential bytes. Upload MIME/filename labels remain untrusted: exactly one file named file is required; actual bytes still pass through the existing decoder/re-encoder. The photo handler verifies staff access before reading upload bytes. No mutation/processor call occurs before body parsing succeeds.

The ten-second deadline applies to reading the request body, not the whole route, database, image decoder or network proxy. At a slow enough uplink a valid 4 MiB upload may time out; the user can retry on a faster connection. Host request limits and connection protection remain relevant because app code cannot control connections before the handler runs. This is a bounded-read reliability improvement, not a complete denial-of-service defense.

## Security coverage and remaining gates

| Area | Current coverage / evidence to run | Phase 5 state |
| --- | --- | --- |
| Anonymous, owner and other-school permissions | supabase/tests/foundation.sql and backend.sql; scripts/smoke-auth.mjs and smoke-backend.mjs | Verified in final Foundation run |
| Membership revocation / role escalation | Foundation SQL revocation, policy and direct mutation denials | Verified in final Foundation run |
| Private claim proof / staff notes | Foundation/backend/overseer SQL projection checks; HTTP claim tests | Verified in final Foundation run; no new public fields |
| Upload decoding / metadata / pixel caps | tests/photo-image.test.ts; photos SQL and smoke-photos.mjs | Unit, SQL and real photo HTTP suites passed |
| Stream abuse and malformed multipart | tests/body-streams.test.ts | Eight new tests pass, including timeout mappings and fragmentation |
| CSRF / redirects / unknown fields | Existing auth-security and api-contracts tests | Unit suite passes |
| Cross-layer persistent journey | test:live and test:browser | Passed against disposable real Auth/Postgres/Storage in CI |
| Deployment and real-user operations | Retention/cleanup scheduling, shared deployment throttling, operator configuration and hosted smoke checks | Still open; not approved by this checkpoint |
| Phase 4 integration | PR12's model, private-input isolation and additional relevance findings | PR12 merged during publication; combined checks rerun |

Validation: npm run lint, npm run typecheck, npm test, npm run build, npm run test:mocks, and git diff --check. The existing Foundation workflow also runs SQL, real Auth/backend/photo HTTP and persisted browser tests. Check the PR for actual remote results; a workflow definition is not passing evidence.

See the [phase report](../../agent-logs/codex-founder-b-phase5__founder-vb__phase-05-security/codex-founder-b-phase5__founder-vb__phase-05-security.md). Founder B has completed the implementation, permission/upload/private-data review and essential backend verification. No known critical security or demo-blocking backend defect remains in the reviewed fictional-demo scope. This is not an independent Overseer sign-off, a hosted release approval, or completion of Founder A's separately owned work.
