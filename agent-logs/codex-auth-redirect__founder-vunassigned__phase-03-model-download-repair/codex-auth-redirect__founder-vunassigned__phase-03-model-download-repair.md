# Phase Report: 03 — Model download repair

## Metadata
- **Agent:** codex-auth-redirect (Codex)
- **Founder version:** unassigned
- **Phase:** 03 — Model download repair
- **Status:** Completed (implementation/local validation; CI and production deployment pending)
- **Date (UTC):** 2026-10-27
- **Task / issue:** Finish deploying the registration recovery/resend change after the owner supplied Vercel build logs.
- **Branch / commit:** work checkout; existing codex/founder-b-phase-7 source branch; main baseline d82c1adc6d21cb224739425c2e2603a4d41b683a.

## Objective and scope
- **Goal:** Prevent a single transient model-asset failure from aborting the production build, then release and verify the recovery button.
- **In scope:** Pinned model downloader resilience, verified build-cache reuse, regression coverage, CI integration and deployment verification.
- **Out of scope:** Changing model/revision/hash pins, disabling semantic matching, auth/provider settings, database changes or production account data.

## Work performed
- Preserved the Phase 02 local report/coordination addenda, refreshed main/source refs and recorded this follow-up on the board. Read the installed Next.js build-cache guide; Vercel automatically persists .next/cache.
- Diagnosed the owner log: the three JSON assets completed, then the single quantized ONNX download failed before Next compilation. The old diagnostic omitted HTTP status, so no specific upstream failure code is claimed.
- Used public HEAD/range probes without logging signed redirect query strings. The pinned binary currently responds HTTP 206 to a one-byte range and downloads successfully in full; the original failure is no longer reproducible here.
- Added at most three attempts for transient HTTP/network/transfer failures, bounded delay, fresh canonical upstream requests on retries and useful asset/status errors without raw provider bodies or signed URLs.
- Retained exact byte-count and SHA-256 enforcement, atomic publication, cleanup of partial files, manifest/revision pins and license/notice packaging. Corrupt/oversize/truncated downloads never become installed assets.
- Added revision-scoped .next/cache reuse, validating cached files before restoring them. Existing valid runtime assets seed the reusable cache. A cache-write failure cannot invalidate an already verified model.
- Added 11 focused downloader tests and a Foundation step before real asset download. Documented behavior in Phase 4 operations guidance. Included the prior CI/merge/deployment-failure report addenda for a complete handoff.
- **Files created or modified:** scripts/download-search-model.mjs; tests/model-download.test.mjs; package.json; .github/workflows/ci.yml; docs/phase-4/README.md; docs/coordination/current-state.md; docs/coordination/task-board.csv; agent-logs/README.md; Phase 02 report and this report.
- **Decisions made:** Keep required model integrity and offline runtime behavior. Retry/restore verified assets rather than silently skipping the failed download or weakening the model requirement.

## Validation and results
- **Commands / checks run:** npm run test:model-download passed 11/11; npm run lint passed; npm run model:download downloaded and verified all four real assets; npm run test:search:model passed real normalized-vector/semantic/concurrency checks; npm run build passed prebuild verification, Next compilation, typechecking and route generation; npm run check:search:bundle passed actual inference from traced files with runtime network disabled; node scripts/download-search-model.mjs --verify-only passed; git diff --check passed.
- **Regression scope:** Transient HTTP 503/403 retry, fresh redirect requests, cache-only restoration without network, corrupt cache rejection, existing-file reuse, checksum/truncation/oversize failure, interrupted-stream cleanup, bounded 429 backoff, immediate permanent 404 failure, timeout/network retries, raw-error/response redaction, verify-only behavior and optional cache-write failure.
- **Tests not run:** No redundant local Auth/database/browser rerun: those app sources are unchanged from the two full passing Phase 02 Foundation runs. Full exact-head CI still runs before integration of this follow-up. No successful new production deployment or actual user email session is claimed yet.
- **Deliverables:** Resilient verified downloader, test/CI coverage, operations documentation and phase handoff; deployment evidence to be appended after publication.

## Thoughts and reflections
- **What worked well:** The user log isolated the unrelated prebuild dependency, and real model plus traced-bundle verification confirms that retry/cache changes preserve semantic inference.
- **What was difficult or surprising:** The old failure provided neither HTTP status nor a retry. A healthy preview build did not guarantee the subsequent production model download would succeed.
- **Trade-offs and alternatives considered:** Vendoring weights, disabling semantic matching or adding a third-party mirror would change release assumptions. The existing pinned upstream plus bounded retries and Vercel's normal cache are sufficient and preserve integrity.
- **What I would improve next:** Verify the new Vercel build and public recovery form, keeping the actual outcome separate from local/preview success.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Build cache is optional and verified; runtime model files remain under models/all-MiniLM-L6-v2 and runtime remote loading is still disabled. Do not rely on a successful cached build as proof that a cold upstream download is always available.
- **Dependencies / assumptions:** A cold build needs the public pinned upstream to respond within the bounded attempts. Vercel automatically restores .next/cache for subsequent builds; missing cache falls back to verified download.
- **Risks / integration concerns:** Persistent upstream or integrity failures still stop the build intentionally. Diagnostics now identify asset/status safely. No account/password/data mutation is part of this repair.
- **Questions / requested decisions:** Founder version remains an unassigned metadata question; no implementation decision or provider credential blocks publishing the fix.

## Follow-up and handoff
- **Remaining work:** Publish the focused follow-up PR, inspect exact-head checks, integrate and verify the new production deployment and resend page.
- **Recommended next steps:** Require a public 200 with the actual resend form plus bounded/CSRF rejection checks; do not claim a real user's account/email session was verified automatically.
- **Relevant references:** Phase 02 report; PR #29; owner Vercel build log for d82c1ad; docs/phase-4/README.md; installed Next.js ci-build-caching guide.
