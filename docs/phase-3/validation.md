# Phase3 validation record

Outcome: Founder B's local workflow backend is implemented and validated; no hosted or complete UI/browser sign-off is claimed.

## Executed checks

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

## What the new tests demonstrate

Decoder tests exercise actual JPEG/PNG/WebP conversion; EXIF orientation and metadata removal; SVG/HTML/GIF rejection; malformed image errors; byte and20MP limits; bounded resize; PNG/WebP animation-control rejection; and dropping appended non-image data from the newly encoded output.

The real-photo HTTP suite creates isolated synthetic organizations/accounts and staff-created inventory. It verifies anonymous/foreign-staff/claimant upload denial, CSRF, strict single-file form validation, invalid-image reservation cleanup, streamed body limits and the exact4MiB file boundary. Actual Storage bytes are privately previewed, checked as metadata-free WebP, and published only with reviewed:true. Pending photos remain inaccessible through public URLs even with staff cookies.

Further checks verify public DTO URLs/alt values, client derivative overwrite denial, hash-tamper detection and recovery, public reads with processing credentials deliberately absent on a second production server, a concurrent three-slot race, private paginated activity without evidence, and idempotent publication audit count. The photographed item then receives private evidence, is approved/reserved and physically returned. Fresh API reads show the persisted returned/fulfilled state and public API/Storage photo access is denied at reservation and return. Staff review access remains scoped. Generated browser JS/JSON/HTML is checked for the processor credential without printing its value.

SQL tests independently verify service-only processing functions cannot be invoked/spoofed by client roles; live staff/org checks; missing object, incorrect metadata and over-cap byte denial; null integrity metadata rejected; pending/public visibility;3-photo cap;20-attempt/hour quota including aborts; idempotent begin/finish/publish; returned/unpublished revocation and membership removal. The foundation suite was strengthened to deny direct unprocessed staging ingress and uses verified metadata fixtures, adding one assertion. Existing tenant/claim/race suites still pass.

## Review and resolved findings

Separate implementation and review agents produced required phase reports. Review found and resolved two issues before handoff: public photo downloads must be explicitly anonymous so staff preview permissions cannot bypass a concurrent public-state change; nullable verification predicates must coalesce false. A later review confirmed the4MiB cap and local setup/test scripts. No remaining blocking review finding was reported. Review is not a production security certification.

## Limitations and saved state

No Playwright/browser UI, hosted migration/deployment, remote CI or new-task restore was executed. This task did not add semantic AI, a retention scheduler, per-photo removal or automated crash/orphan cleanup. Staff must inspect visible identifying clues before publication; EXIF stripping does not redact image content. Previously downloaded public copies cannot be revoked.

Normal failures attempt compensation; a killed process or failed cleanup can leave a private reservation/object needing operator attention. These cases remain documented operational work, not disabled tests or a claim of perfect cleanup.

Cloud draft saved: updated start_skill and hosted SUPABASE_SERVICE_ROLE_KEY requirement limited to ldhwtrxhmaanfcgmtsbp.supabase.co. Existing install/provider requirements were preserved. The current instance uses only the local stack credential in ignored .env.local. Review/save environment settings and publish the prepared cloud environment if desired; neither a draft save nor the source push deploys Vercel. Hosted access/migrations and the shared frontend gate remain outstanding.
