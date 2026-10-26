# Founder B — Phase 5 quality and security

First implementation checkpoint; full Phase 5 remains in progress. Source: plan.pdf, Phase 5 / LL-038–LL-045: permissions, upload security, private claim data, reliability and malicious input. Independent Overseer acceptance and Founder A's browser/accessibility work are separate.

## Baseline and delivery

Started from current main `b70777e` on `codex/founder-b-phase-5`. Phase 4 PR #12 is still open; its local model, additional relevance cases and known negative-case false positives are not assumed integrated or accepted. This focused PR can be reviewed against main without carrying Phase 4 commits. After integration, rerun combined checks on the merged tree. No database migration or deployment is included.

## Request-body hardening

The existing JSON, sign-in and photo readers bounded bytes but could wait indefinitely for a stalled/trickling stream. `src/lib/http/body.ts` now enforces a shared absolute ten-second read deadline plus each existing byte limit. It counts actual bytes regardless of Content-Length, stops excessive reads, clears the timer and starts cancellation without awaiting an untrusted cancellation hook. The deadline is total elapsed time across chunks, rather than an idle timeout renewed by every byte.

JSON and multipart deadline failures return HTTP 408 / REQUEST_TIMEOUT with safe retry copy and the existing no-store/request-ID envelope. Sign-in keeps its existing invalid-form behavior on failed body reads. It also rejects invalid UTF-8 instead of replacing credential bytes. Upload MIME/filename labels remain untrusted: exactly one file named file is required; actual bytes still pass through the existing decoder/re-encoder. The photo handler verifies staff access before reading upload bytes. No mutation/processor call occurs before body parsing succeeds.

The ten-second deadline applies to reading the request body, not the whole route, database, image decoder or network proxy. At a slow enough uplink a valid 4 MiB upload may time out; the user can retry on a faster connection. Host request limits and connection protection remain relevant because app code cannot control connections before the handler runs. This is a bounded-read reliability improvement, not a complete denial-of-service defense.

## Security coverage and remaining gates

| Area | Current coverage / evidence to run | Phase 5 state |
| --- | --- | --- |
| Anonymous, owner and other-school permissions | supabase/tests/foundation.sql and backend.sql; scripts/smoke-auth.mjs and smoke-backend.mjs | Existing suites retained; fresh CI required |
| Membership revocation / role escalation | Foundation SQL revocation, policy and direct mutation denials | Existing coverage retained |
| Private claim proof / staff notes | Foundation/backend/overseer SQL projection checks; HTTP claim tests | Existing coverage retained; no new public fields |
| Upload decoding / metadata / pixel caps | tests/photo-image.test.ts; photos SQL and smoke-photos.mjs | Unit suite passes; fresh database/HTTP CI required |
| Stream abuse and malformed multipart | tests/body-streams.test.ts | Seven new tests pass, including public timeout mappings |
| CSRF / redirects / unknown fields | Existing auth-security and api-contracts tests | Unit suite passes |
| Cross-layer persistent journey | test:live and test:browser | CI retained; no local stack reset/start performed |
| Deployment and real-user operations | Retention/cleanup scheduling, shared deployment throttling, operator configuration and hosted smoke checks | Still open; not approved by this checkpoint |
| Phase 4 integration | PR12's model, private-input isolation and additional relevance findings | Separate open PR; rerun after integration |

Validation: npm run lint, npm run typecheck, npm test, npm run build, npm run test:mocks, and git diff --check. The existing Foundation workflow also runs SQL, real Auth/backend/photo HTTP and persisted browser tests. Check the PR for actual remote results; a workflow definition is not passing evidence.

See the [phase report](../../agent-logs/codex-founder-b-phase5__founder-vb__phase-05-security/codex-founder-b-phase5__founder-vb__phase-05-security.md). This checkpoint does not establish the phase exit gate (all essential checks green, no critical security/demo blockers, and independent acceptance).
