# Phase Report: 03 — workflows

## Metadata
- **Agent:** codex-founder-b (Codex integration owner)
- **Founder version:** B, supplied by user; normalized to b in path
- **Phase:** 03 — workflows
- **Status:** Completed — local Founder B backend scope
- **Date (UTC):** 2026-10-25
- **Task / issue:** User: Start on Founder B Phase3
- **Branch / commit:** codex/founder-b-phase-3; corresponding commit contains this report

## Objective and scope
- **Goal:** Complete Founder B's real found-item/photo/search/claim/review/return/activity backend, reusing Phase2's transactional workflows.
- **In scope:** Secure photo processing and Storage delivery/review, activity API, decoder and integrated workflow tests, local setup, required reports and frontend handoff.
- **Out of scope:** Founder A screens, semantic AI, hosted rollout, real personal data, per-photo deletion and automated orphan/retention jobs.

## Work performed
- Read repository rules, prior phase reports, contracts and the installed Next route-handler guide. Worked in the existing isolated checkout and preserved earlier files/accounts.
- Delegated SQL boundaries to codex-founder-b-security and HTTP/service adapters to codex-founder-b-auth; codex-founder-b-review independently checked the implementation. Each recorded a uniquely named Phase03 report.
- Added bounded actual-image decoding/orientation/re-encoding using Sharp, EXIF/ICC removal, animation rejection,20MP input limit and fresh WebP output. No raw originals or user filenames enter Storage.
- Added server-only processing with service-only reservation/finalization/abort RPCs, live tenant checks, shared20-attempt/hour quota, transactional3-photo cap, pending staff review and explicit publication.
- Added public/staff verified photo delivery and safe paginated staff activity. Public delivery uses anonymous Storage authorization even with staff cookies. Hash/size verification prevents serving altered objects; availability/unpublication revokes future public reads.
- Applied/recorded the new local migration without a reset; preserved demo passwords/accounts. Updated the original foundation fixture to verified photo metadata and a stronger direct-staging-write denial, retaining its original security assertions.
- Added local-only credential configuration, frozen-install/CI support, real Storage/HTTP scenarios and documentation. Saved updated startup instructions and the hosted processor requirement in the cloud draft.
- **Files created or modified:** src/lib/photos/, photo/activity routes under src/app/api/v1/, supabase/migrations/202610250003_photos.sql, supabase/tests/photos.sql, foundation fixture, tests/photo-image.test.ts, scripts/configure-photo-worker.mjs, scripts/smoke-photos.mjs, suite runners/CI/package files, docs/phase-3/ and superseding notes in prior handoffs.
- **Decisions made:** Narrow service-key processing is a documented exception to the earlier no-app-service-key proposal; ordinary APIs remain caller scoped. Final input/output cap is4MiB, explicitly narrower than the proposed5MiB ceiling, because official Vercel Functions documentation limits request AND response bodies to4.5MB. Multipart overhead is separately bounded16KiB. Staff review is required but does not constitute automated PII detection.

## Validation and results
- **Commands / checks run:** Frozen npm ci completed with upstream Supabase archive checksum verification; npm run lint and npm run typecheck passed; npm test18/18; npm run test:mocks14/14; npm run db:test114 checks (foundation28/backend45/photos41); npm run build passed; npm run test:live passed against its own production servers and actual local Auth/PostgreSQL/Storage. npx supabase migration up --local reports up to date. env:photos run twice preserved existing configuration.
- **Tests not run:** Hosted migration/auth/Storage/Vercel checks and remote CI; provider access absent. Full browser UI/accessibility/load tests not run; screens not integrated.
- **Deliverables:** docs/phase-3/README.md and validation.md; the three other Phase03 agent reports under agent-logs/.

## Thoughts and reflections
- **What worked well:** Existing Phase2 lifecycle tests made it possible to extend the real flow with a photo and verify persisted return plus public revocation. Storage bytes, not only database rows, were exercised.
- **What was difficult or surprising:** A staff session can broaden Storage access even after a public metadata check; explicitly anonymous public delivery fixes that race. Nullable integrity predicates needed false-coalescing. Vercel's4.5MB boundary required a smaller advertised photo limit despite locally accepting more.
- **Trade-offs and alternatives considered:** Direct client derivative publication would bypass validation. A separate restricted processor deployment avoids app service-key access but adds infrastructure unavailable here. This implementation isolates the existing broad key to an auditable server module, verifies identity in both app and SQL, and documents the privilege boundary rather than pretending RLS protects service-role writes.
- **What I would improve next:** Add trusted stale-reservation/orphan cleanup, per-photo withdrawal/replacement, production edge abuse controls and deployed/browser checks after the shared interface contract is reconciled.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Founder A should use the returned protected image URLs directly/unoptimized; do not cache or optimize private images through a service that omits session cookies or preserves revoked data. Use pending preview then reviewed:true publish. Phase2 contract differences remain explicit; no mock was silently rewritten.
- **Dependencies / assumptions:** Node24, the dedicated local Supabase stack, server-only matching processor credentials and the three applied migrations. Hosting requires all project settings/key bindings to match the same reviewed target.
- **Risks / integration concerns:** The service-role credential retains broad underlying privileges despite narrow code use. Process crashes or failed compensation can leave private processing slots/orphans; automated cleanup is not implemented. Previously downloaded public bytes cannot be recalled. An explicit review flag is not proof that a human checked identifying clues.
- **Questions / requested decisions:** Founders/integrator reconcile UI/backend contract differences. Supply hosted access and processor binding securely in provider/environment settings when ready; no secrets in Git/chat.

## Follow-up and handoff
- **Remaining work:** UI integration and browser verification, hosted rollout, semantic matching, operational cleanup/retention and shared public search/login throttling. Full team Phase3 gate remains pending those other owners/prerequisites.
- **Recommended next steps:** Connect Founder A's screens to the Phase2/3 APIs, verify a fresh-account browser journey, then inspect the hosted project's existing state before migration/deployment. Review/save the cloud environment draft and publish its snapshot when desired; this does not deploy Vercel.
- **Relevant references:** docs/phase-3/README.md; docs/phase-3/validation.md; docs/phase-2/integration-notes.md; the other Phase03 reports; https://vercel.com/docs/functions/limitations

## 2026-10-26 UTC addendum — Phase 3 Overseer response

- **Agent / Founder / branch:** codex-founder-b / B / codex/overseer-phase-0-3-fixes, based on main dc58f92.
- **Scope / work:** Connected real photo upload/private processed preview/review/publication and public image DTOs; item-scoped chronological activity; date controls and separate claimant explanation/private note controls. Added disposable real browser runner and CI evidence upload. Text intake saves first; photo upload/review happens on management screen and can recover after refresh without duplicate text creation.
- **Validation and results:** Real persisted Chromium workflow passed with fresh four-account/two-school fixtures, all twelve routes at 320/768/1440px, axe on each route, photo publication/revocation, private claim/approval/return refresh persistence, foreign-school/other-owner denials and public-versus-private rejection text. Builder visually inspected mobile management and desktop public item screenshots; manual assistive-technology and independent acceptance not performed.
- **Reflection:** The Overseer reviewed an older tree. Rechecking against integrated main exposed concrete integration gaps; a passing mock/build alone could not establish the real product journey. Evidence is now reproducible without fabricating independent approval.
- **Cross-phase handoff:** See [Overseer response](../../docs/coordination/overseer-response.md) and [implemented contract](../../docs/coordination/implemented-contract.md). New clients must send claimantReason on explicit rejection and apply the fourth migration in order; do not edit/reset earlier migrations or leak privateNote. Coordinate with the separate PR10 visual redesign.
- **Remaining work / decisions:** Independent re-review and joint founder acceptance; external competition facts; hosted validation; operational retention/deletion/throttling before real-user release. No remote deployment or manual screen-reader audit claimed.
