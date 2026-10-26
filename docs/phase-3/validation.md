# Phase 3 validation evidence

2026-10-26 remediation: [current combined evidence](../coordination/overseer-response.md) supersedes the original runs’ missing photo/UI/browser statements. Original evidence below remains attributed to its own run.

The records below preserve both original branch reports. They describe their own
executions and limits. See the [current integration snapshot](../coordination/current-state.md)
for combined-tree validation and outstanding work.

## Founder A — original interface validation

Executed October 25, 2026, on `codex/founder-a-phase-3`. These are builder checks. Independent acceptance remains open.

| Command/check | Result |
| --- | --- |
| `npm run lint` | Passed, zero warnings after removing an unused import |
| `npm run typecheck` | Passed |
| `npm test` | 18 tests passed: existing auth/API tests plus seven HTTP-adapter/continuation cases |
| `npm run test:mocks` | 14 passed; retained fictional mock behavior only |
| `npm run build` | Passed; Next.js includes organization and My claims routes |
| `python tools/phase3-browser-test.py` | Four passed: production shell/routing/refresh/sign-in continuation and layouts/service failure; isolated HTTP-fixture claim retry/conflict/review/return/receipt and intake/private-note checks |
| `python tools/phase2-browser-test.py` | Seven passed; one optional axe scan skipped because `AXE_SCRIPT` was not supplied |
| `git diff --check` | Passed |
| `npm run db:start` | Failed: Docker could not pull `public.ecr.aws/supabase/postgres:15.8.1.085`; registry request was denied with HTTP Forbidden |

The final source was rebuilt after separating demo sign-in code. Lint/typecheck/build, all 18 unit tests, 14 mock tests and all four Phase 3 browser checks passed on their final runs. The Phase 3 fixture workflow also verifies withdrawn/cancelled receipts and staff summaries. Production JavaScript contains no runtime mock-store identifiers, private fixture markers or demo sign-in controls. The standalone preview server is for local review and is not deployed.

The adapter tests verify same-origin/no-store requests, private evidence-only claim payloads, actual version propagation, no automatic conflict overwrite, field/error mapping, cursor/filter continuity, loop protection, bounded structured search and safe redirect allowlisting. No test sends real credentials or contacts external users.

The Phase 3 browser suite requires the production app on `http://localhost:3000` and `node tools/phase2-preview.mjs` on loopback port 4173. Python Playwright uses `/usr/bin/chromium` unless `CHROMIUM_PATH` is set. Production checks mock the HTTP responses for public data while using real Next.js routing. Authenticated interactions run the real DOM views plus HTTP adapter in the isolated loopback harness with test-only identity/endpoint fixtures. Those fixtures persist in the test process; they do **not** demonstrate database persistence, session cookies or authorization enforcement. The unmocked production check verifies a safe unavailable state with no Supabase configuration. Screenshot: `/tmp/lostlink-phase3-search.png` (fixture-backed public screen), visually inspected at desktop width; the suite checks no page overflow at 320/768/1440px.

Not run: `npm run db:test`, `npm run test:live`, the real authenticated browser workflow, photo upload, hosted migrations/deployment and remote CI. Database startup was blocked, photos are absent from the dependency API, and no hosted credentials or configured target were supplied. Earlier Founder B reports describe their own local test results; those are not results of this run. No manual screen-reader audit or independent review was performed.

Installation notes: ordinary `npm ci` could not write the inherited npm cache; a temporary cache fixed that. Supabase's postinstall then failed direct DNS resolution. `npm ci --ignore-scripts --cache /tmp/lostlink-npm-cache` installed the locked dependencies; a pinned v2.75.0 CLI download through the configured proxy enabled the database-start attempt. No TLS verification, registry security or network restrictions were disabled. Runtime socket checks/tests used the tool's network permission, as required by this sandbox.

## Founder B — original photo/backend validation

Outcome: Founder B's local workflow backend is implemented and validated; no hosted or complete UI/browser sign-off is claimed.

### Executed checks

| Check | Result |
| --- | --- |
| Frozen dependency install | npm ci passed; Supabase installer reported Checksum verified; no verification bypass |
| Lint/typecheck | Passed |
| Unit tests |18 passed,0 failed/skipped; includes7 actual image-decoder cases |
| Existing Founder A mock tests |14 passed,0 failed/skipped; existing non-failing Node module-detection warning remains |
| Real database suites |114 passing assertions/expected denials:28 foundation,45 backend,41 photo |
| Production build | Passed with all photo/activity API routes |
| Production HTTP suites | Auth, backend and photo suites passed against real local services; fixture users/organizations/files removed |
| Migration history | Third migration recorded; migration up --local reports up to date; no reset |
| Local processor configuration | Helper run twice; second run preserved credential; ignored owner-readable file only |

The new dependency Sharp is explicitly pinned. No new external service was purchased. TLS, package integrity and artifact checksum verification remain enabled. The official Vercel Function4.5MB request/response limit was checked; the final4MiB processing/storage/delivery cap leaves multipart headroom.

### What the new tests demonstrate

Decoder tests exercise actual JPEG/PNG/WebP conversion; EXIF orientation and metadata removal; SVG/HTML/GIF rejection; malformed image errors; byte and20MP limits; bounded resize; PNG/WebP animation-control rejection; and dropping appended non-image data from the newly encoded output.

The real-photo HTTP suite creates isolated synthetic organizations/accounts and staff-created inventory. It verifies anonymous/foreign-staff/claimant upload denial, CSRF, strict single-file form validation, invalid-image reservation cleanup, streamed body limits and the exact4MiB file boundary. Actual Storage bytes are privately previewed, checked as metadata-free WebP, and published only with reviewed:true. Pending photos remain inaccessible through public URLs even with staff cookies.

Further checks verify public DTO URLs/alt values, client derivative overwrite denial, hash-tamper detection and recovery, public reads with processing credentials deliberately absent on a second production server, a concurrent three-slot race, private paginated activity without evidence, and idempotent publication audit count. The photographed item then receives private evidence, is approved/reserved and physically returned. Fresh API reads show the persisted returned/fulfilled state and public API/Storage photo access is denied at reservation and return. Staff review access remains scoped. Generated browser JS/JSON/HTML is checked for the processor credential without printing its value.

SQL tests independently verify service-only processing functions cannot be invoked/spoofed by client roles; live staff/org checks; missing object, incorrect metadata and over-cap byte denial; null integrity metadata rejected; pending/public visibility;3-photo cap;20-attempt/hour quota including aborts; idempotent begin/finish/publish; returned/unpublished revocation and membership removal. The foundation suite was strengthened to deny direct unprocessed staging ingress and uses verified metadata fixtures, adding one assertion. Existing tenant/claim/race suites still pass.

### Review and resolved findings

Separate implementation and review agents produced required phase reports. Review found and resolved two issues before handoff: public photo downloads must be explicitly anonymous so staff preview permissions cannot bypass a concurrent public-state change; nullable verification predicates must coalesce false. A later review confirmed the4MiB cap and local setup/test scripts. No remaining blocking review finding was reported. Review is not a production security certification.

### Limitations and saved state

No Playwright/browser UI, hosted migration/deployment, remote CI or new-task restore was executed. This task did not add semantic AI, a retention scheduler, per-photo removal or automated crash/orphan cleanup. Staff must inspect visible identifying clues before publication; EXIF stripping does not redact image content. Previously downloaded public copies cannot be revoked.

Normal failures attempt compensation; a killed process or failed cleanup can leave a private reservation/object needing operator attention. These cases remain documented operational work, not disabled tests or a claim of perfect cleanup.

Cloud draft saved: updated start_skill and hosted SUPABASE_SERVICE_ROLE_KEY requirement limited to ldhwtrxhmaanfcgmtsbp.supabase.co. Existing install/provider requirements were preserved. The current instance uses only the local stack credential in ignored .env.local. Review/save environment settings and publish the prepared cloud environment if desired; neither a draft save nor the source push deploys Vercel. Hosted access/migrations and the shared frontend gate remain outstanding.
