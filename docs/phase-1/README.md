# Founder B — Phase 1 foundation

Scope: existing repository, app skeleton, database foundation, authentication, security rules and repeatable validation. Use the existing checkout. The master plan lists LL-008–LL-014 for this phase but does not define their individual titles; no invented task-ID assignments are claimed here. Starting implementation does not imply Founder A or an overseer has approved all proposed product decisions.

## Implemented boundaries

- Next.js App Router with pinned dependencies/lockfile, TypeScript, Tailwind, lint/type checks, production build and CI definition.
- Supabase migrations for organizations, profiles, memberships, inventory, private details, photo metadata, claims and audit. Composite tenant foreign keys and active-claim constraints.
- RLS and explicit grants: private staff rows stay in their organization; claimant proof reads use an owner-safe RPC, excluding private staff notes. Public RPCs expose deliberately published inventory fields only.
- Private Storage staging/reviewed buckets and authorization policies. Actual upload validation, re-encoding and publication pipeline are Phase 3; bucket limits alone do not establish image safety.
- Supabase SSR email/password sign-in and sign-out, verified-user account page, session refresh, same-origin POST restrictions, body bounds and safe redirect handling. Public signup is disabled in local config.
- Two fictional organizations/items, operator demo account provisioning, SQL tests, Auth/REST/SSR HTTP smoke tests.

Direct application-table writes, including staff writes, are denied. Transactional inventory/claim/membership APIs are intentionally deferred. The landing page explains current development status instead of advertising unfinished controls as working. shadcn/ui component selection belongs with Founder A's Phase 2 design; the foundation already supports Tailwind. No semantic matching or external AI provider is configured.

## Hosted prerequisites and steps

The user identified the existing [Supabase project](https://supabase.com/dashboard/project/ldhwtrxhmaanfcgmtsbp) and [Vercel project](https://vercel.com/ddar2425s-projects/lost-link). Supabase API origin: `https://ldhwtrxhmaanfcgmtsbp.supabase.co`. Its Auth health endpoint responds 401 without an API key; the Vercel project API responds 403 with a missing-authentication-token error. Connectivity works, but authorized project inspection, migrations and deployment remain blocked. No hosted credentials are injected, no project is linked locally, and no remote migration, Git push or deployment is claimed.

To automate the remaining hosted steps, personal `SUPABASE_ACCESS_TOKEN` (Supabase management API) and `VERCEL_TOKEN` (Vercel API) requirements were saved in cloud environment settings. Enter tokens securely there, never in chat or Git. These are operator requirements; application runtime does not use them. Once supplied, first inspect existing database tables/policies and Vercel settings, confirm the target is appropriate for synthetic demo data, then plan changes against that state. Do not blindly apply the initial migration to an unknown existing schema. If founders prefer manual provider-dashboard setup, use the steps below instead; token-based automation is not required to run the local app.

1. Identify the intended Supabase project and Vercel project/account. Keep a separate test project with synthetic data. Confirm region and school/privacy requirements before real data.
2. Review the migration for the dedicated empty project. Use the pinned CLI to authenticate securely, `supabase link --project-ref <project-ref>`, then `supabase db push` against the verified target. `db push` does not install demo accounts; seed synthetic inventory intentionally only in the demo project. Never run a reset against hosted data. Existing projects with additional permissive policies require an explicit policy review.
3. In hosted Supabase Auth settings disable public signup for this controlled demo, set password minimum to 12+, configure the exact deployed site URL and approved redirect URLs, and provision confirmed synthetic users with the operator script. Local config.toml does not automatically apply these hosted settings.
4. Connect the existing repository to Vercel as a Next.js app (root is repository root, install `npm ci`, build `npm run build`, Node 24). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` to the exact HTTPS deployment origin. Preview URLs need their own exact origin settings; do not broaden the CSRF allowlist to arbitrary hosts. Application runtime never needs the service-role key.
5. Keep operator `SUPABASE_SERVICE_ROLE_KEY` and demo passwords in secure operator environment settings only. Do not put them in `NEXT_PUBLIC_*`, Git, UI, logs or chat. Public URL/publishable key identify the project; RLS supplies data protection.
6. Apply appropriate Supabase Auth rate limits and deployment abuse controls before exposing login publicly. Add shared application throttling before real-user release; this foundation is not a production security sign-off. Verify allowed API destinations/network access for the specific project host if the cloud runtime restricts egress.
7. Run hosted smoke checks with fresh synthetic accounts: successful sign-in/out, denied unauthenticated account access, correct staff membership, no cross-org private rows. Check deployed response headers and exact-origin CSRF behavior. Run future full claim workflow checks only after those endpoints exist.

No paid subscription or purchased infrastructure is necessary for the local foundation. Disclose actual AI/tool/hosting spending per the competition guidelines. Founders must understand and review AI-assisted code and retain evidence of personal contributions.

## Phase gate

The repository foundation can be validated locally. The full Phase 1 exit gate also requires an identified hosted test project, deployment configuration and hosted checks, plus the shared Founder A mock-data/contract handoff. Record executed results separately from planned commands. See [validation.md](validation.md) for current evidence; no remote CI or deployment success is implied by local results.

## Cloud runtime notes

This machine uses Docker's `vfs` storage driver. Standard pulls of the multi-layer Supabase PostgreSQL images exceeded the 32 GiB disk because vfs copies parent files into each layer. For this instance, PostgreSQL 15.8.1.085 was exported from the official image at platform digest `sha256:caae3d066f437332d593011e3e7ecf78ab005ce9b89378efd53f97f0410563ad` using checksum-verified Crane v0.20.6, then imported as a single-layer local image with the original environment, entrypoint, command, working directory and volumes. No image code or verification settings were changed; registry-layer reads used Crane's digest verification. This workaround changes the local Docker image ID; it is not a newly published registry image. The prepared local image is reused by `db:start`. A fresh machine using vfs without that image needs equivalent image preparation or a supported Docker storage driver with enough capacity; fresh-task restoration has not been tested.

Supabase CLI 2.75.0 is pinned for the tested local stack. Its upstream archive checksum was verified during installation. The CLI installer's tar dependency is overridden to 7.5.22; npm audit reported zero advisories during preparation. Re-evaluate updates deliberately with database/auth tests instead of silently changing local service versions.

For this proxy-based cloud shell, install using `npm_config_https_proxy="$HTTPS_PROXY" npm ci --cache /workspace/.cache/npm`; this references the existing proxy setting without storing its value. Normal machines and GitHub Actions can use `npm ci` directly. Keep TLS and checksum verification enabled.

## Phase3 superseding note

The statements above describe the Phase1 foundation. [Phase3](../phase-3/README.md) now adds a narrowly trusted server-only photo processor that requires SUPABASE_SERVICE_ROLE_KEY for uploads; ordinary user APIs still do not use it. Direct staging ingress is now denied, and only newly decoded/re-encoded derivatives enter Storage. The original foundation assertions were preserved and updated to this stricter permission boundary.
