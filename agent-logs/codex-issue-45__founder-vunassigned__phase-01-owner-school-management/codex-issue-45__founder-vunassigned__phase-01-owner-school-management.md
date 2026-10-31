# Phase Report: 01 — Owner school management

## Metadata
- **Agent:** codex-issue-45 (Codex)
- **Founder version:** unassigned; the task did not supply a Founder version.
- **Phase:** 01 — Owner school management
- **Status:** Completed
- **Date (UTC):** 2026-10-30
- **Task / issue:** https://github.com/AI-In-Bussiness/Lost-Link/issues/45
- **Branch / commit:** fix/issue-45-owner-school-management, based on main 441fe6f

## Objective and scope
- **Goal:** Let the two existing owners edit existing schools and permanently delete schools.
- **In scope:** Owner administration, strict commands, transactional SQL, photo cleanup, tests and deployment documentation.
- **Out of scope:** Provisioning actual owner accounts, deleting real school data, hosted database configuration and unrelated feature changes.

## Work performed
- Verified current main already supports renaming and editing school settings for both owners. Added explicit Edit school links.
- The task owner explicitly chose permanent deletion of a school and all its records, including populated schools.
- Added a typed school-address confirmation, checkbox and current settings version. Rechecked confirmation, scope and owner permissions in the database.
- Added forward migration 008: delete claims, inventory/private details/photo metadata, school activity, memberships and prior school admin events in one transaction. Retain only a minimal owner-visible deletion receipt. Auth accounts and other schools remain intact.
- Queue exact stored/reserved photo paths transactionally; remove bytes through Storage after commit. Owners can retry cleanup in batches of 100. In-flight uploads remove their bytes or queue a cleanup retry when their school was deleted.
- **Files created or modified:** src/app/admin/page.tsx; src/lib/admin/{contracts,handler,photo-cleanup}.ts; src/lib/photos/service.ts; migration 008; repeatable supabase/setup/administration.sql; SQL/contract/browser acceptance; scripts/test-admin.mjs; .env.example; administration/current-state/board documentation; this report.
- **Decisions made:** Permanent deletion rather than hiding, per the owner's explicit answer. Use an outbox because database transactions cannot atomically delete Storage bytes. Keep a minimal deletion receipt rather than retaining private school records.

## Validation and results
- **Commands / checks run:** npm ci --ignore-scripts --cache /tmp/lostlink-npm-cache; npm run lint; npm run typecheck; npm test (76/76); npm run test:mocks; npx next build --webpack; git diff --check — passed.
- Six SQL suites (foundation, backend, photos, overseer, platform-admin, school-admin) passed against disposable PostgreSQL 15 with the repository's minimal Auth/Storage test interfaces, auth.role(), Storage metadata and service-role grants. All migrations applied successfully. These checks establish SQL/RLS behavior, not real Auth/Storage HTTP integration.
- Fresh SQL Editor setup, repeat setup and platform-admin SQL suite passed in a second disposable database.
- **Tests not run locally:** Full Supabase/browser integration: the full Postgres image exhausted the environment's disk quota. Model download was unavailable through this environment's network; direct webpack build passed without prebuild. Full persisted checks remain assigned to PR CI.
- **Deliverables:** Implementation, migration, updated SQL Editor setup, administration guide and expanded owner browser acceptance (including actual database and Storage-byte deletion assertions).

## Thoughts and reflections
- **What worked well:** Existing owner authorization and versioned settings could be reused without granting any new roles.
- **What was difficult or surprising:** Renaming already existed, while permanent deletion needed coordinated database and file cleanup. Full local Supabase installation exceeds this environment's storage budget.
- **Trade-offs and alternatives considered:** Empty-school-only deletion was proposed; the owner requested complete deletion instead. The durable outbox supports retry when Storage is unavailable without retaining accessible school content.
- **What I would improve next:** Larger deployments may prefer a scheduled cleanup worker; current owner UI explicitly exposes pending cleanup and bounded retries.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Apply pending migration 008 before using the new owner controls. The SQL Editor setup also installs 008 and remains repeatable. Previous migrations are preserved.
- **Dependencies / assumptions:** The existing two owner rows remain the authority; the trusted server service key already used by uploads is needed to delete photo bytes. Ordinary browser data operations continue to use the caller session.
- **Risks / integration concerns:** Deletion is irreversible. Storage failures leave a durable pending task visible on /admin. Deploy database and application source together. No hosted schema or actual school data was changed here.
- **Questions / requested decisions:** Founder version is unspecified; recorded as unassigned without blocking authorized implementation.

## Follow-up and handoff
- **Remaining work:** Verify full persisted PR CI and integrate the PR; hosted migration/deployment remains separate unless operator access is available.
- **Recommended next steps:** Merge after required verification, close issue 45 and apply pending migration 008 to the intended hosted database before using deletion.
- **Relevant references:** docs/administration.md; upstream codex-founder-b phase-08-owner-administration report; issue 45; migration 202610300008_owner_school_deletion.sql.

## PR verification follow-up — 2026-10-30 UTC

PR #47 publishes the implementation. During final review, scoped the browser's
expand-delete selector to `summary` because the confirmation button has the same
visible text. This prevents a Playwright strict-locator collision; application
behavior is unchanged. Full persisted CI is running against the updated source.

The physical-file acceptance assertion additionally requires a successful Storage
listing without the deleted file and an empty cleanup entry for that path. This
prevents a transient Storage download error from being mistaken for removal.


## Integration with issue #46 — 2026-10-31 UTC

The task owner asked to finish. Commit 33e46bb passed the complete Foundation PR
workflow 41110203330, security checks, Windows/Linux helpers and Vercel preview,
including real Auth/Storage and permanent school deletion. Main then advanced to
dff9614 (PR #48, owner claim Review access), causing conflicts in the shared
coordination entries and owner browser-fixture script. Resolved by retaining both
issues' documentation and rows, both sets of school fixtures, and cleanup for all
fixture schools. The incoming owner authorization repair and Review browser
scenario are preserved. Combined-source validation is recorded in PR #47.

Combined-source local validation: lint, TypeScript, all 76 unit tests, JavaScript
syntax, Python compilation and diff checks pass. No tests or assertions from
either issue were removed. A merge commit preserves both histories.
