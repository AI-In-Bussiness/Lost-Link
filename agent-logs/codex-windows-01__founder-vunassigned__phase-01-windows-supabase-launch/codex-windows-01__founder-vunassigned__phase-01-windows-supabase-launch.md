# Phase Report: 01 — Windows Supabase launch

## Metadata
- **Agent:** codex-windows-01 (Codex)
- **Founder version:** unassigned; no Founder version supplied
- **Phase:** 01 — windows-supabase-launch (foundation maintenance)
- **Status:** Completed
- **Date (UTC):** 2026-10-26
- **Task / issue:** User requested repository fix after Windows CMD startup failures
- **Branch / commit:** codex/windows-supabase-launch; based on main b70777e12dc9b21c47c6c8a50e37fe311855e1e6

## Objective and scope
- **Goal:** Make db:start and local status consumers work on native Windows.
- **In scope:** Native CLI resolution, startup/status helpers, regression coverage, Windows setup instructions.
- **Out of scope:** Product behavior, database migrations, hosted deployment, dependency upgrades.

## Work performed
- Read repository instructions, coordination hub/state/integration and affected helpers.
- Registered WIN-001 ownership on the shared board before edits.
- Confirmed Supabase v2.75.0 installer writes bin/supabase.exe on Windows and bin/supabase elsewhere.
- **Files created or modified:** scripts/supabase-binary.mjs resolves that pinned executable using a file URL; scripts/start-database.mjs and scripts/local-supabase.mjs invoke it without a shell. tests/local-supabase.test.mjs exercises actual process spawning; .github/workflows/supabase-helpers.yml runs on Ubuntu and Windows plus a real installed CLI version check. README.md documents installer recovery and CMD password syntax. Shared board and this report record delivery.
- **Decisions made:** Avoid shell:true and npm .cmd shims. Absolute native paths handle spaces and shell characters, independent of shim installation or CMD slash parsing. Keep startup stdout suppressed and status output private.

## Validation and results
- **Commands / checks run:** node --test tests/local-supabase.test.mjs passed all five subtests plus their parent on Linux Node 24.19.0. Tests verify argument preservation, diagnostic stderr, suppressed startup key output, failure exit status, private status JSON, sanitized errors and actionable missing-installer diagnostics. Fixtures run from a temporary path containing spaces and an ampersand.
- The environment's process sandbox first returned EPERM for spawned Node processes; rerunning the focused suite with approved process execution passed without application/test changes.
- **Tests not run:** Actual Windows execution and real Supabase --version pending remote CI. Full application lint/build/DB/HTTP/browser suites not run locally: shell Git fetch failed because the environment proxy was unavailable, so validation used connector-fetched source snapshots in /tmp/lostlink-windows-check. No Docker or database operation performed.
- **Deliverables:** Focused PR into main, Windows/Linux helper workflow and the paths above.

## Thoughts and reflections
- **What worked well:** A shared native resolver repairs every localStatus consumer, including configuration and account provisioning.
- **What was difficult or surprising:** Adding shell:true alone would leave CMD interpreting forward slashes as command syntax; it also creates quoting concerns in paths with spaces and ampersands.
- **Trade-offs and alternatives considered:** Native binary layout is tied to the pinned Supabase 2.75.0 package; the CI version check will expose future layout changes.
- **What I would improve next:** Confirm native Windows CI and the user's Docker startup before claiming complete Windows database setup.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Foundation scripts retain their exports, arguments, excluded services and credential-output behavior; product APIs are unchanged.
- **Dependencies / assumptions:** npm's Supabase installer must run; Docker Desktop must use Linux containers.
- **Risks / integration concerns:** Future Supabase package upgrades must preserve or update the native resolver.
- **Questions / requested decisions:** Founder version remains unassigned; no decision is needed for this maintenance fix.

## Follow-up and handoff
- **Remaining work:** Remote checks and PR review; real local Windows Docker startup remains the user's environment check.
- **Recommended next steps:** Review/merge the PR, preserve the user's manual helper edits before updating their checkout, then retry db:start and environment configuration without a database reset.
- **Relevant references:** README.md; docs/coordination/task-board.csv; user-reported spawnSync EINVAL and CMD node_modules errors; https://github.com/supabase/cli/blob/v2.75.0/scripts/postinstall.js.
