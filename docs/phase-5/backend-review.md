# Founder B Phase 5 backend review

Reviewed the combined Phase 4/5 tree at `10061df`. This is the implementing agent's engineering review, not an independent Overseer sign-off. Scope: fictional competition demo, the current inventory/search/private-claim/photo workflows and their adversarial boundaries.

| Boundary | Code inspected | Verification |
| --- | --- | --- |
| Caller identity / CSRF | auth routes, auth/security.ts, api/handler.ts | Auth security unit cases and smoke-auth.mjs: exact origin, safe redirects, no staff self-provisioning, session enforcement |
| Tenant / role separation | foundation and backend migrations; caller-scoped RPC dispatch | foundation.sql/backend.sql: anonymous/claimant/foreign staff denial, revocation, direct mutation and cross-organization constraints |
| Private proof / notes | explicit public/claimant/staff projections; no public claim-table policy | foundation.sql/backend.sql/overseer.sql and smoke-backend.mjs: owner access, other-owner denial, private-note projection, safe errors/audit |
| Lifecycle races | transactional claim transition functions and uniqueness constraints | SQL and live HTTP competing approval/return/idempotency tests |
| Photo processor privileges | photos/service.ts and service-only photo_begin/finish/abort grants | photos.sql/smoke-photos.mjs: quota and concurrent cap, foreign staff denial, immutable object paths, failed-decode reservations, credential absence from browser assets |
| Publication and delivery | photo_metadata RPC, storage RLS, anonymous public delivery and size/hash verification | photos.sql/smoke-photos.mjs: pending/private access denial, explicit review, immediate public revocation on return, integrity failure |
| Untrusted image bytes | photos/image.ts | photo-image tests: spoofed/unsupported formats, metadata stripping, animation, pixel and byte bounds, fresh WebP output |
| Request resource use | http/body.ts and API/auth/upload adapters | Eight new stream/multipart cases: absolute deadlines, malicious cancellation hooks, dishonest lengths, tiny-chunk fragmentation, malformed forms and safe failure mappings |
| Search/privacy integration | public RPC candidates and allow-listed local embedding text | Model/security tests plus existing SQL tenant/public projections; no proof or staff notes enter embeddings |

## Findings and disposition

- **B5-01 — Body read time unbounded:** Fixed. One absolute ten-second deadline for JSON, sign-in forms and uploads; stalled/trickling streams stop without a mutation. Underlying cancellation hooks cannot hold the handler open.
- **B5-02 — Fragment bookkeeping memory:** Fixed. Request readers now use a fixed capacity buffer instead of an unbounded list of tiny chunks. Successful return copies only received bytes; cap and timer remain enforced.
- **B5-03 — Raw malformed UTF-8 in credentials:** Fixed. Reject decode failures rather than silently substituting credential bytes.
- **B5-04 — Insufficient phase evidence:** Closed by [Foundation run 40402040638](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40402040638) on code commit 10061df: all required SQL, image/Auth/backend/photo HTTP and persisted browser checks must pass on the code commit, not merely exist in YAML.

No additional critical security or demo-blocking backend defect was identified in the inspected boundaries. This is a scoped finding, not proof of absence of vulnerabilities.

## Remaining release boundaries

Real-user rollout still requires operator decisions and deployment work: shared edge abuse controls, retention/stale-photo cleanup scheduling, provider secret configuration/rotation and hosted smoke verification. Those are explicitly outstanding production controls, not silently claimed implemented. Native image processing is byte/pixel bounded but not isolated in a separate process; platform resource limits still apply. Slow valid uploads may hit the new deadline. These limitations must accompany any broader public-use decision.

Phase 4's additional-set semantic false positives are relevance findings: results are possible matches and never auto-approve ownership. Preserve that report; do not represent green diagnostic CI as relevance acceptance. Founder A's usability/browser work and the Overseer's independent P0 phase acceptance have their own owners. Founder B's completed engineering review does not approve their gates or merge the PR.
