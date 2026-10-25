# Phase 3 validation evidence

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
