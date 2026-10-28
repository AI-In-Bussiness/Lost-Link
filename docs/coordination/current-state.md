# Issue #32 correction — 2026-10-28 UTC

The shared Phase 7 branch adds object/color eligibility to public POST search,
including disabled/busy/error fallback and fresh-inventory recovery. SQL remains
a high-recall candidate source; the HTTP layer overfetches up to 50 before
filtering and applying the requested limit. Frozen labels/assessment thresholds
and cosine gates are unchanged. The frozen gate passes 16/16 core positives with
zero false positives/leaks; 27 additional known regression cases pass 19/19
positives with zero false positives. The original 12-case calibration remains
8/8 with zero negative/trap results. Actual local HTTP checks cover enabled and
disabled inference, absent objects, real matching objects, scope and limit=1.
See [issue evidence](../phase-7/issue-32.md). Await PR merge/deployment before
claiming the production issue resolved. Earlier failure records below remain
historical; this correction does not approve other release gates.

# Founder B Phase 7 closeout — 2026-10-28 UTC

Fresh public checks pass 17/17 and both schools provide hybrid inference.
All three redirect diagnostics and six auth-page visibility/continuation checks
pass. Main ae883e6 has successful exact-commit Foundation/helper runs and a
successful GitHub Vercel status. The actual-model frozen evaluation still exits
1 with 16/16 core hits and five false positives; fallback retains two keyword
false positives, with zero school/filter leaks. Current quality tracking is #32.
Issues #20/#21/#23 are closed; historical references below retain their original
context and do not establish unrecorded hosted acceptance. Updated candidate
and raw results live in docs/phase-7/. Hosted account/photo/SMTP/rollback work
still requires secure operator access; no release lock or independent approval
is claimed. Prior local report/email-diagnosis changes are preserved.

# Confirmation resend visibility — 2026-10-27 UTC

The owner requests resend only after submitting signup. Removed initial
sign-in/signup recovery links; the Check your email state retains its form and
remembered email. Updated error guidance and existing browser acceptance.
Lint, full build and six local rendered-page checks pass. PR #31 merged as
ae883e6 after both exact-source Foundation/browser runs and helper/preview
checks passed. Production deployment HRapJJVMpscFimyrGsybdgqqGFR2 succeeded;
all six public rendered-page assertions pass, including remembered email and
safe continuation. No production email sent. Provider/account behavior is unchanged.

# Production model download repair — 2026-10-27 UTC

Released and publicly verified at main
`7001b395eee48ac32d879f4359465d9af8c121aa` via merged PR #30. Both exact-head
Foundation runs (40593399104 and 40593461319), helper checks and the preview
build passed. Production Vercel deployment `68HSvBNpsbmwEvKopRk2XWbPu9sS`
succeeded. Both recovery/waiting pages now return 200 with the actual resend
button; unconfirmed sign-in guidance, invalid-email rejection, CSRF rejection,
no-store and safe return paths pass against production without sending email.
Public release smoke passes 17/17 and both schools report hybrid search with
semantic inference available. The previous production deployment blocker is
resolved. Actual user email/session completion remains for the owner to try
with a fresh link in the same Safari browser used to request it.

The owner supplied the failed production log: npm prebuild downloaded the three
JSON assets, then `download-search-model.mjs` aborted on the quantized ONNX
asset's single failed response. The original log did not include its HTTP status.
The same pinned binary is currently reachable and downloaded successfully here.
Added three-attempt download recovery with fresh redirect requests, atomic
size/SHA-verified publication, safe status/file diagnostics and verified reuse
from Vercel's persisted `.next/cache`. Integrity failures still stop the build.
No model/version, search behavior, signup logic or provider settings changed.

Eleven downloader regressions, lint, a real pinned model download, actual model
inference, the complete npm build and traced offline inference bundle all pass.
The repair reuses the existing source branch for a follow-up PR from main
`d82c1ad`; its exact-head CI and production verification passed as recorded
above. The earlier lack of build-log access is resolved by the owner's log;
no further user information is needed to publish this repair.

# Registration recovery and confirmation resend — 2026-10-27 UTC

PR #29 is merged at `d82c1adc6d21cb224739425c2e2603a4d41b683a` after both
exact-head Foundation runs (40581456336 and 40581467873), including real
Auth/database/photo/browser checks, passed. Linux/Windows helper checks and
the Vercel preview build passed too. Production Vercel deployment
`dpl_FkgHkFSosqAzRKZXXz6cq7jARRh4` then failed; the public recovery page remains
404 and the new button is not live. The build log is not accessible without
Vercel credentials; the owner was asked for its first error. No production
failure cause is inferred from the successful preview/source checks.

The owner's remaining failure is repeated registration with the original email
after its first link reached Auth but redirected to localhost. That account may
already be confirmed, so another signup need not send mail and the old link may
be consumed. Added same-password duplicate signup sign-in, explicit unconfirmed
sign-in recovery, and a **Resend confirmation email** form on the waiting screen
plus a recovery page linked from sign-in/signup. Recovery sends a PKCE email
link for an existing account (`shouldCreateUser: false`), confirming pending
accounts or signing confirmed accounts in without changing their passwords.
Auth's pinned `/resend` implementation emits implicit links, so it cannot be
used for the existing server-side code exchange. Flow-specific verifier cookies
and validated `sb_flow_id` callbacks keep earlier links usable after throttled
requests; legacy callbacks remain supported.

Lint, 51 unit tests, 14 release tests and a production build pass. An isolated
real Auth v2.186.0/Postgres 15/Mailpit lab verifies lost-callback recovery,
duplicate registration, both email-link paths, original-password preservation,
throttled resend, cookies, safe redirects and request validation. It does not
establish application database/RLS or browser acceptance; the existing CI
Auth/browser suites have new scenarios. The public allowlist also accepts the
flow-aware callback. Source is delivered through the same PR #29/source branch;
production deployment and real-user testing are not inferred from local checks.
The deployment failure above supersedes the earlier pending-release status.

# Email confirmation localhost redirect — 2026-10-27 UTC

The task owner saved the hosted Supabase URL configuration fix. A fresh
`npm run auth:check -- https://lost-link-beta.vercel.app ldhwtrxhmaanfcgmtsbp`
passes all three cases: the Site URL fallback and both callback variants now
redirect to `https://lost-link-beta.vercel.app` with the correct paths and
preserved return destination. The previous localhost redirect is resolved.
The deployed application's same-origin sign-in origin was already correct. Prepared
`auth:configure` to repair only the hosted Site URL and callback allowlist,
preserving other Auth settings, plus credential-free `auth:check` to detect this
regression. See [the repair guide](auth-email-redirects.md) for exact dashboard
values, commands and recovery. Eight new regression tests pass in the existing
release suite (14 total); lint, typecheck and 47 application unit tests pass.
The owner applied the fix through the provider dashboard; no management token,
app redeployment or database change was required. A real fresh-email/iPhone
PKCE sign-in remains to be checked by the owner; invalid-token probes do not
verify a user's account or session. Source delivery is [PR #29](https://github.com/AI-In-Bussiness/Lost-Link/pull/29)
on reused `codex/founder-b-phase-7` from main `476232f`.

# Issue #27 — website registration — 2026-10-27 UTC

Claimant registration is prepared on the reused `codex/convert-plan-markdown`
branch from main `567ad42`. `/sign-up` submits a same-origin bounded form to
Supabase Auth; email confirmation returns through a PKCE callback and the
existing application-path allowlist. New accounts receive no staff memberships.
The sign-in page links registration and preserves claim destinations. Local
Auth signup is enabled with confirmation and a 12-character minimum; hosted
Auth settings and email delivery must be configured separately as described in
README. No database migration or hosted configuration change is included.
See the [implementation report](../../agent-logs/codex-issue-27__founder-vunassigned__phase-01-signup/codex-issue-27__founder-vunassigned__phase-01-signup.md)
for checks and delivery evidence. Existing release issues remain separately owned.

# Founder B Phase 7 hosted setup update — 2026-10-27 UTC

PR #22 is merged at main `567ad420f62f6b7c8e6c0580dc9994dc8a89928e`.
Foundation 40558339465 and Linux/Windows helpers 40558339463 pass there.
The task owner found no application tables/function in hosted Supabase and
reported installing all four migrations and the synthetic seed. Fresh public
smoke passes 17/17; both schools report hybrid search with local model available.
See [hosted evidence](../phase-7/public-smoke-after-setup.json).

The original 503 incident below is historical. Issue #23 is resolved; #20 now
tracks remaining hosted accounts/photo/return/rollback verification. No provider
credentials or demo password are configured in this workspace, so those checks
and deployment identity/rollback lock remain blocked. [Secure access setup](../phase-7/hosted-access.md)
explains the required operator-only secrets. No hosted authenticated test,
rollback rehearsal or locked release is inferred from public smoke/CI success.

# Founder B Phase 7 release checkpoint — 2026-10-27 UTC

Started from current main `77e46af122db4b566113345c167cca3b9bff5f39`, whose
Foundation and Linux/Windows helper workflows pass. The public production pages
load but school APIs return 503; [issue #20](https://github.com/AI-In-Bussiness/Lost-Link/issues/20)
blocks hosted acceptance. [Phase 7](../phase-7/README.md) adds a credential-free
public smoke check, observed evidence, candidate dependency/model/migration pins
and a rollback runbook. No verified deployment/rollback ID or release tag is
claimed. The existing failed proposed relevance gate is recorded in
[issue #21](https://github.com/AI-In-Bussiness/Lost-Link/issues/21). Hosted access,
account/photo workflow, rollback rehearsal and independent acceptance remain
open; source preparation does not complete the production gate.

# Repository state snapshot

## Founder A Phase 7 review — 2026-10-27 UTC

Review of current-main application `77e46af` joins Founder B's existing PR #22
on `codex/founder-b-phase-7`; no new branch was created. Fresh checks passed:
46 unit, 14 mock, eight relevance-tooling and 17 browser/axe scenarios, plus
98 link activations across twelve screens and Next/Previous pagination. The
additional single-school live-mode navigation probe fails; [#24](https://github.com/AI-In-Bussiness/Lost-Link/issues/24)
records that P2 defect. [#25](https://github.com/AI-In-Bussiness/Lost-Link/issues/25)
records P1 missing submission evidence. Existing production #20, relevance #21
and final-head CI #23 remain separately owned. See [the full review](../phase-7/founder-a-review.md)
for all seven phase verdicts, actual evidence and limits. This is delivered
review work, not approval of the hosted release, external facts or submission.

## Issue #17 branch integration audit — 2026-10-26 UTC

At `main` commit `2b898c869af091d0ee6bd1d861bde6a3e64ccaeb`, all seven
non-main remote branch heads are already ancestors of `main`. The union of
file paths at all eight branch heads contains 236 paths, all present on
`main`; no additional code merge or file restoration is needed. No files or
branches were deleted. PRs #10–#16 are integrated; the older checkpoints below
describe their original delivery states, not outstanding merges.

[Issue #17](https://github.com/AI-In-Bussiness/Lost-Link/issues/17) also requires
agents to stop creating branches. AGENTS.md now prohibits new agent branches
and requires PRs targeting `main` using a suitable existing source branch.
This guidance change reuses `codex/founder-b-phase-5`, whose previous head was
already merged by PR #14; there were no open PRs at inspection. See the
[preservation report](../../agent-logs/codex-issue-17__founder-vunassigned__phase-00-branch-integration/codex-issue-17__founder-vunassigned__phase-00-branch-integration.md)
for exact branch SHAs, ancestry and path checks. This repository audit does not
establish hosted deployment or independent product acceptance.

## Founder B Phase 5 started — 2026-10-26 UTC

A focused branch `codex/founder-b-phase-5` starts from current main `b70777e`. It adds bounded request-stream deadlines and a backend security coverage matrix. See [Phase 5](../phase-5/README.md). Main advanced to f18076d during publication and merged Phase 4 PR12. That update is preserved in this branch; Founder B engineering is complete at 10061df with Foundation run 40402040638 passing backend/security and persisted-browser checks; independent phase acceptance remains separate.

## Founder A Phase 6 presentation checkpoint — 2026-10-26 UTC

Delivered for review on `codex/founder-a-phase-6` after PR15 merged: homepage privacy copy, pending-first
staff dashboard with collection guidance, responsive wrapping from Phase 5,
and brand/demo/pitch drafts. See [Founder A handoff](../phase-6/founder-a-handoff.md).
Local lint/type/format checks, 38 unit tests, 14 mocks and 14 browser scenarios
including axe passed. Home/dashboard also passed four-width/200% text probes.
These are builder presentation checks in the mock harness, not hosted evidence.
The task owner excluded the competition summary. Independent acceptance,
real-app timed rehearsal, team/research/disclosure inputs and final combined
hosted release verification remain open. Founder B's demo runbook and scripts
retain their own ownership and evidence.

## Founder B Phase 6 completed — 2026-10-26 UTC

PR15 provides repeatable seed/account checks, operational preflight and the demo/evidence/recovery runbook. Final code f7b6c75 includes main e913f89 and passes Foundation run 40405351921 and Windows/Linux helper run 40405351767. See [Phase 6](../phase-6/README.md). Founder A presentation and independent judging remain separate; Phase5 PR14 integration and hosted Phase7 verification are still release dependencies.


## Founder B Phase 4 checkpoint — 2026-10-26 UTC

Based on integrated main `b70777e`, draft PR #12 (`codex/founder-b-phase-4`) now runs local CPU MiniLM embeddings with no paid inference API/key. Public-only scoped retrieval, hybrid ranking and keyword fallback remain. The unmerged paid-provider quota migration was removed. Pinned model assets download during build; inference disables network access. Real local-model evaluation on twelve fixed synthetic queries with ten inventory items found 8/8 positive queries in top three versus 5/8 for the keyword counterpart, zero false positives on four negative/trap cases and zero school leaks. These are calibration results, not held-out accuracy. See [Phase 4](../phase-4/README.md); hosted verification and independent acceptance remain open.

## Overseer remediation — 2026-10-26 UTC

Work starts from current main `dc58f92` on `codex/overseer-phase-0-3-fixes`.
The live interface now maps published photographs, uploads and reviews processed
photos, and displays item-scoped activity. An additive migration supports
inclusive date filters and a required claimant-visible rejection explanation
separate from private staff notes. Earlier migrations and reviewer reports are
preserved. See the [implemented contract](implemented-contract.md) and
[Overseer response](overseer-response.md) for evidence and remaining acceptance
boundaries. Formal joint approval and external competition facts remain open.
PR #10's visual redesign is separate and has not been overwritten or merged by
this remediation; coordinate interface conflicts when integrating those PRs.

## Consolidation update — 2026-10-26 UTC

The combined tree is based on main `be015f7` (including PRs #4 and #8)
and merges Founder B Phase 3 `af5609f`. All other eight non-main branch heads
were already ancestors of that main commit. Every file path from all ten
observed branch heads is present; original reports, source documents, fixtures,
standalone preview, Next.js interface, backend and all migrations are retained.
README and Phase 3 validation conflicts were combined with both founders'
evidence preserved. See the consolidation report linked from the agent index
for exact checks and the integration PR.

Use current main as the common baseline. Assignments deliver through PRs from
existing source branches as specified in AGENTS.md; do not create new branches
per founder, phase, or task. Original branches remain available as historical
references; no branch was deleted or force-pushed.

The live interface covers search, private claims, staff intake/review and return.
Photo processing/publication/content and staff activity APIs are now present.
The live adapter still uses placeholder photos and an unavailable activity
feed: UI wiring and independent real-browser acceptance remain follow-up work.
A merge does not establish hosted deployment or phase-gate approval.

## Historical inspection (preserved)

Inspected 2026-10-25 UTC through the GitHub connection. Re-check live refs and
pull requests before integrating; this is a dated snapshot, not a live monitor.

## Branches inspected

| Branch | Inspected commit | Observed contents |
| --- | --- | --- |
| main | `412010ccaf6a2af77cf3abc6ed260676d557b86e` | Agent rules, product README/license, original PDF/deck, Phase 0/1 Founder A docs, TypeScript mock package and placeholder asset |
| codex/founder-a-phase-2 | `5fc10076d21b609294accde9dc712a8965c4a36c` | Adds standalone DOM interface, loopback preview, browser checks, Phase 2 docs and reports |
| codex/founder-b-phase-2 | `5be324e220528d6d6fcef070c177c42dde6be040` | Next.js foundation, auth, API routes, Supabase migrations/tests, CI, Phase 0–2 backend docs and reports |

Other observed branches: `Cole-Weems-agents`, `founder-a-phase-0`, and
`founder-a-phase-1`. They are preserved. Their full contents were not audited
in this pass.

At inspection, [PR #4](https://github.com/AI-In-Bussiness/Lost-Link/pull/4) was
the only open PR returned. It is a draft for Founder A's Phase 2 interface.
No open Founder B PR was returned. A branch existing does not mean it is merged.

## What agents can rely on

- Main has a dependency-free mock package. Its documented check requires Node
  24+: `node --experimental-strip-types src/mocks/client.test.ts`.
- Main at the inspected commit has no root package manifest, application build,
  Supabase migrations, or Phase 2 interface.
- Founder A's preview uses in-memory data and demo personas; it is not production
  authentication or persistence.
- Founder B's branch has a real application/backend foundation, but it does not
  include the Founder A Phase 2 interface. Its API differs from the mock contract.
- Local success reports on either branch do not establish a combined product
  build, hosted deployment, or independent approval of the joint phase gates.

Founder A's handoff says the foundation is absent **in its own branch**.
Founder B's foundation exists **on its separate branch**. Read these statements
with their branch/commit context.

## Verification boundary

The existing handoffs report 14 mock tests and 8 browser tests for Founder A,
and lint/type/build, 11 unit tests, 72 SQL assertions and live local HTTP suites
for Founder B. These are attributed reports; this organization pass did not
re-run those implementation suites.

The local workspace checkout initially pointed to `b52dd4c` with only README
and LICENSE. Shell fetch failed because its proxy was unreachable. Remote
inspection and publication use the GitHub plugin, based on current main;
the old local checkout is not used as the publication base.

## Concurrent update preserved

During publication, main advanced to `d1b68a1aa74ae6ddda6e0ea6537935e041ec4b3e`.
It added an Overseer report index and Phase 0–2 reports reviewing `412010c`.
Those original reports and their index content are retained unchanged. Their
blocked gate findings describe that reviewed main commit; the founder feature
branches still require the relevant independent re-review.
