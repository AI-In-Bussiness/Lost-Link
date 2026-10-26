# Phase 1 validation record

Outcome: local foundation implemented and validated in the current cloud instance. Hosted linkage and deployment remain blocked on provider authentication. This is not a complete Phase 1 sign-off across both founders.

## Executed and passed

| Check | Evidence |
| --- | --- |
| Frozen dependency install | `npm ci` completed from package-lock.json; Supabase installer reported `Checksum verified.` |
| Dependency audit | `npm audit`: zero reported advisories; not an OS/container vulnerability assessment |
| Static checks | `npm run lint` and `npm run typecheck`: exit 0, no lint warnings in final run |
| Auth helper tests | `npm test`: 5 passed, 0 failed/skipped; origin, redirect, duplicate/unknown fields and body-size bounds |
| Production build | `npm run build`: successful Next.js build with configured local Supabase |
| SQL integration | `npm run db:test`: 27 passing assertions/expected denials against actual local Supabase PostgreSQL; fixtures rolled back |
| HTTP integration | `npm run test:live`: temporary confirmed users sign in through real Auth, REST staff reads stay in each tenant, claimant private inventory reads are empty, direct role escalation denied, public projection safe, public signup denied, protected page redirects, cross-origin auth rejected, session cookies work, safe redirects/no-store and sign-out verified |
| Repeatability | Demo provisioning run twice; existing passwords/memberships preserved. SQL suite rerun with demo accounts present. `db:start` rerun successfully against running stack; services stopped/restarted with persisted data during auth configuration correction |
| Development startup | `npm run dev` starts; home and sign-in render HTTP 200, unauthenticated account returns redirect |
| Repository checks | Markdown links resolve; `git diff --check` clean; `.env.local` and `.env.demo.local` confirmed ignored |

SQL scenarios cover anonymous public-only reads, pending photo exclusion, same-org staff access, foreign staff denial, safe claimant proof projection, competing claimant denial, direct state mutation denial, role escalation denial, staging path scope, derivative publication denial, immediate membership revocation, cross-org foreign keys, active/approved claim uniqueness, future date rejection, returned-item hiding/photo read revocation and unpublished organization hiding. These are foundation assertions, not concurrent claim approval or full business-workflow tests.

The database seed contains two organizations and two items. Four confirmed synthetic demo accounts are provisioned; their generated password is in ignored owner-readable `.env.demo.local`, never committed or printed. Temporary integration users are removed in cleanup. Development services are running locally; no browser preview link was published.

## Diagnosed setup failures and corrections

- npm's default home cache was read-only: install used a workspace cache.
- Current Supabase CLI PostgreSQL images exceeded the 32 GiB disk with Docker's vfs driver. Supabase CLI 2.75.0 and PostgreSQL 15 were pinned; the official database image was imported as a single layer with original startup configuration. See runtime notes for exact source digest and verification. No TLS, checksum or registry-integrity verification was disabled.
- Older CLI postinstall did not automatically use the injected HTTPS proxy. The supported npm HTTPS proxy setting fixed download access; archive checksum verification passed. Tar was overridden to 7.5.22.
- An initial SQL run before migration completion failed because tables were not yet created; the completed startup applied migrations and the suite then passed, including a later rerun.
- Initial HTTP Auth login failed with `email_provider_disabled`: local `[auth.email].enable_signup` was corrected to enable the email provider while global `[auth].enable_signup=false` keeps public signup disabled. Restarted stack and real sign-in/signup-denial tests passed.
- Independent review found a stale-server risk in the integration runner. It now rejects an occupied port and checks its spawned server remains alive.

## Independent review

A separate reviewer examined migration/RLS/RPC grants, auth handlers and setup/test scripts. No blocking auth/privacy finding remained in the current foundation. Rate limiting beyond provider limits remains required before public real-user access. No completed production security review is claimed.

## Not executed / deferred

- Hosted Supabase migrations, hosted policy/Auth checks, Vercel configuration/deployment and remote GitHub Actions execution.
- Browser/Playwright, visual accessibility audit, complete inventory/claim/return journey, concurrency tests, upload decoding/re-encoding, rate-limit deployment and retention scheduler. Those features are not implemented yet.
- New-task restoration/publication validation. Saving cloud install/start instructions does not publish an environment or deploy an application.

## Hosted target evidence and next prerequisite

User-supplied targets: Supabase project `ldhwtrxhmaanfcgmtsbp`; Vercel project `ddar2425s-projects/lost-link`. Read-only connectivity checks returned Supabase Auth HTTP 401 (`No API key found in request`) and Vercel project API HTTP 403 (`missing authentication token`). The process has no Supabase or Vercel token bindings. These responses establish reachability, not authorized project readiness.

Cloud environment draft saved: `install_script`, `start_skill`, personal `SUPABASE_ACCESS_TOKEN` requirement restricted to `api.supabase.com`, and personal `VERCEL_TOKEN` requirement restricted to `api.vercel.com`. No secret values were supplied or saved in repository files. Review/save the changes in environment settings and publish the prepared cloud environment when desired; this does not deploy Vercel. Supply provider credentials securely there to resume hosted inspection and setup. Preserve the local verified configuration until hosted targets are inspected.
