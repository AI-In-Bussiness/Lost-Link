# Founder B Phase 7 — deployment and release

Scope: plan.md LL-052–LL-056, live deployment/environment validation, rollback,
locked demo release, and an audit of automated checks. Founder A owns final UX
and the requested Phase 0–6 review; the independent Overseer owns final
production smoke and rubric acceptance.

Founder A's [final UX and Phase 0–6 Overseer review](founder-a-review.md) joins
the same PR. It records fresh browser/link evidence, the supported-school
navigation defect (#24), missing submission evidence (#25), and the existing
production, relevance and final-head CI blockers. The review does not approve
the production release or submission.

**Status: public deployment checks pass; authenticated release verification is
blocked on secure operator access.** The task owner confirmed in Supabase that
`backend_dispatch` was missing and public application tables were absent, then
reported successfully running all four repository migrations and the synthetic
seed. A fresh check at 2026-10-27 19:25 UTC passes **17/17** public contracts;
both schools report `mode: hybrid`, `semanticStatus: available`.
See [current hosted evidence](public-smoke-after-setup.json). The
[original failing smoke](public-smoke.json) is preserved as incident history.

PR #22 is merged into main `567ad420f62f6b7c8e6c0580dc9994dc8a89928e`.
[Foundation 40558339465](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40558339465)
and [Linux/Windows helpers 40558339463](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40558339463)
pass on that exact SHA. Registry issue #23 is resolved.

[Issue #20](https://github.com/AI-In-Bussiness/Lost-Link/issues/20) now tracks the
remaining hosted account/photo/rollback verification. Public success does not
verify demo passwords, memberships, server photo credentials or the returned
item journey. This workspace still has no Vercel/Supabase management credentials
or demo password; use the [secure access instructions](hosted-access.md) to allow
those tasks to proceed. No hosted authenticated write or rollback is claimed.

## Production setup

Target: https://lost-link-beta.vercel.app, Vercel project
`ddar2425s-projects/lost-link`. The historically identified Supabase project is
`ldhwtrxhmaanfcgmtsbp`; confirm it is still the intended fictional demo project
before any operator action. This session has no provider credentials or
authenticated provider browser access, so it cannot inspect or modify settings.

Use Vercel **Production** scope and redeploy after saving environment changes.
Use the **Next.js** framework preset, repository root, default build command and
default output directory. The old Other-framework deployment is not a rollback
target: it returned a Vercel 404.

| Variable | Classification | Value/source |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Config | Intended hosted project's HTTPS Project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Config | Same project's publishable key; legacy anon key may use NEXT_PUBLIC_SUPABASE_ANON_KEY instead |
| NEXT_PUBLIC_SITE_URL | Config | https://lost-link-beta.vercel.app |
| SUPABASE_SERVICE_ROLE_KEY | Secret | Same project's trusted server credential for photo processing; never a NEXT_PUBLIC variable |
| LOSTLINK_ORGANIZATION_SLUGS | Config, optional | maple-school,cedar-school |
| LOSTLINK_SEMANTIC_SEARCH | Config, optional | true normally; false only for a disclosed keyword-only demonstration |

The four synthetic accounts' existing `LOSTLINK_DEMO_PASSWORD` is an operator
secret, not required by the website runtime. Management credentials are also
operator-only. Copy credentials directly between secure settings; do not put
them in commits, reports, chat, shell history or screenshots. Never put the
service-role key in the public key setting.

If a 503 recurs, inspect Vercel server logs for the failing request ID and
Supabase project health, URL/key pairing, migration history and the
`public.backend_dispatch` RPC. Public errors intentionally hide database detail.
Do not weaken those errors or policies to diagnose the release.

Inspect existing schema/policies and migration history first. On the confirmed
target, apply only reviewed pending migrations using the pinned Supabase CLI;
do not reset hosted data or blindly replay initial DDL. Intentionally install
`supabase/seed.sql` only into the fictional demo project, then provision the
Phase 6 accounts with `npm run demo:accounts` and securely supplied operator
credentials. Provisioning preserves existing passwords and memberships.
Configure hosted Auth's exact site/redirect URLs and controlled-demo signup,
password and rate-limit settings; local config.toml does not configure hosting.

## Executable verification

From Node 24 / npm 11, with dependencies installed:

```sh
npm run test:release
npm run release:check -- https://lost-link-beta.vercel.app
```

The release check needs no key/password. It checks 17 public HTTP contracts:
homepage/sign-in; each school, public inventory, preserved showcase item,
same-origin search and top-three showcase discovery; wrong-school item denial;
anonymous staff/claim denial; cross-origin auth denial and canonical auth origin.
It checks response headers/private public projections, records actual search
mode, rejects redirects/protection pages, and exits nonzero on any failure.
Requests are sequential, bounded to 20 seconds/1 MiB each. They read public
records, perform search, and send invalid/unauthenticated auth probes; they do
not submit credentials or mutate application records. No response bodies,
cookies, keys or upstream exception text are written into the report.

To save clean JSON (without npm banners), run:

```sh
node --use-env-proxy scripts/release-smoke.mjs https://lost-link-beta.vercel.app > /tmp/lostlink-production-smoke.json
```

This smoke is also included in Foundation's real local `test:live` suite, after
the existing Auth/backend/photo checks. The six release-check regression tests
cover unavailable APIs behind HTML 200, projections, wrong-school data,
redirects, missing headers, transport-error redaction and origin restrictions.

On a trusted operator machine, securely supply the intended hosted public
settings, site URL and original demo password, then run:

```sh
npm run demo:check -- --app
```

Use a clean operator environment without a stale local `.env.local`; confirm
the target before running. This public-key preflight checks sign-in/out for all
four accounts, exact memberships, private receipt access, cross-school staff
denial and public seed projections. It does not establish browser-cookie login
or hosted photo processing.

Complete the [Phase 6 real-site journey](../phase-6/README.md#rehearsal-and-recovery)
in separate staff/claimant profiles: fresh fictional intake, sanitized photo,
private preview and publication, scoped discovery, private ownership proof,
staff approval, physical-return confirmation and persistence after refresh.
Check another account/school cannot see private claims, notes or photos. Record
IDs/statuses without private proof, passwords, cookies or identifying details.
Do not run the existing local-only fixture-mutating suites against hosting.

## Automated-check audit

The merged main checks above supersede the historical pre-merge evidence below.

Baseline `77e46af122db4b566113345c167cca3b9bff5f39` has successful
[Foundation 40444642079](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40444642079)
and [Linux/Windows helpers 40444642093](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40444642093).
The latest applicable main interface and relevance workflows at `2b898c8` are
[40410170406](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40410170406)
and [40410170378](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/40410170378);
their paths have not changed since that commit. New PR checks must pass on the
final Phase 7 head; baseline success is not a substitute.

[PR #22](https://github.com/AI-In-Bussiness/Lost-Link/pull/22) tracks current
Phase 7 checks. Initial Foundation attempts stopped before tests because GHCR
rate-limited the pinned Supabase image pull; retrying did not resolve it.
[Issue #23](https://github.com/AI-In-Bussiness/Lost-Link/issues/23) records that
CI blocker. Foundation now authenticates GHCR using the built-in job token with
read-only packages permission; no personal registry token is needed. Since
authenticated GHCR can also throttle, startup falls back once to Supabase's
original official public ECR registry only on a rate-limit error. CLI-pinned
versions remain the same; other startup errors and all test failures still fail. Full
post-mitigation results are recorded in PR #22; no database check is skipped.

The frozen additional relevance evaluator still exits 1: 16/16 core positives,
five negative/trap false positives, proposed gate false. Its workflow explicitly
allows this diagnostic step to fail, so a successful workflow is not quality
acceptance. [Issue #21](https://github.com/AI-In-Bussiness/Lost-Link/issues/21)
records this as required by the updated plan. Calibration remains 8/8 positives
against 5/8 keyword and zero four negative/trap results; these are synthetic
capability checks, not general accuracy. Thresholds/tests were not loosened.

## Freeze the demo release

[release-candidate.json](release-candidate.json) pins the inspected source,
dependency lock, model manifest and ordered migration hashes. It is explicitly
**blocked**, with no claimed deployment ID, verified rollback deployment or
release tag. The source revision is the integrated application baseline; the
Phase 7 PR adds verification/operations only. After merging, record the final
merge SHA and regenerate its pins before selecting the deployed build.

Before marking a release locked, capture in a reviewed release record:

1. Exact deployed Git SHA, immutable Vercel deployment ID/URL, public alias,
   runtime/region, and successful checks for that SHA.
2. Migration history and hashes matching the approved schema, model manifest
   revision/hash, lockfile hash and active search mode.
3. Environment variable **names/scopes**, secure configuration version
   references and target project reference; never credential values.
4. Passing timestamped public smoke, secure account preflight and hosted
   photographed-item-to-return evidence, plus independent acceptance.
5. A known-good immutable deployment/configuration reference and the completed
   rollback rehearsal below. If none exists, establish and verify one first.

Only then create the agreed demo tag/release pointing to that exact accepted
commit. Preserve a stable competition alias and keep unrelated changes out
during judging. Do not infer a locked release from a branch, merge, Ready status
or an HTML 200. Founder A/Overseer submission work remains separately owned.

## Rollback and recovery

Operator sequence for a confirmed regression:

1. Pause the demo and staff writes; record current deployment ID/SHA, timestamp
   and failing public checks. Preserve audit and existing claims/photos.
2. Confirm the previously verified immutable deployment is compatible with the
   current forward-only database schema and its model/configuration references.
   Vercel rollback must not be assumed to restore current project environment
   settings. If compatibility is unknown, fix forward or use a separately
   verified build; do not downgrade the database.
3. In Vercel Deployments select that verified deployment and use the available
   production rollback/promote action. Check the production alias actually
   points to the intended deployment. Restore only the reviewed configuration
   bindings if needed, without copying values into logs.
4. Rerun public smoke and secure account checks. Use a fresh fictional intake
   for the full photo/claim/return journey. Confirm earlier receipts remain
   readable and no private rows become visible. Resume only after this passes.
5. For a rehearsal, perform the same switch on an isolated staging alias/demo
   project with compatible schema; verify before/after, then restore the intended
   candidate and repeat the checks. Record both IDs and results. A staging
   rehearsal alone does not verify the production alias switch.

No hosted rollback was executed here: there is no verified rollback target
or provider access. This is an executable operator runbook, not a claim of a
successful rehearsal. No hosted migrations, accounts, data or aliases were
modified by this assignment.
