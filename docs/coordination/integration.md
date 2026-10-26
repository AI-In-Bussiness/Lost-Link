# Integration checklist

This checklist records the original contract differences. The interface adapter
and backend are now integrated on the common main baseline; see
[current state](current-state.md) for remaining work and the Phase 3 handoffs for
the implemented mappings. Historical proposals do not establish acceptance.
Sources: [Founder A proposal](../phase-0/shared-contract-proposal.md),
[mock guide](../phase-1/frontend-mock-guide.md), and
[Founder B's inspected integration notes](https://github.com/AI-In-Bussiness/Lost-Link/blob/5be324e220528d6d6fcef070c177c42dde6be040/docs/phase-2/integration-notes.md).

The [implemented contract](implemented-contract.md) records the current field/state/privacy mappings and the additive fixes. The table below preserves the original discrepancy inventory; it is not a list of missing implementation.

## Original reconciliation inventory

| Topic | Founder A mock/interface | Founder B backend | Required integration decision |
| --- | --- | --- | --- |
| Runtime | Standalone DOM views with injected LostLinkApi | Next.js App Router | Choose route/component adaptation and one production composition root |
| Session | Demo persona switch | Supabase cookie session | Replace demo session with verified session; keep fixtures out of production |
| Claim state | pending | submitted | Explicit mapping and status copy |
| Fields | ownershipEvidence, foundLocation, verificationNotes | evidenceText, publicLocation, identifyingDetails | Document input/output translation and private-field boundaries |
| Contact | contactEmail in submission | Identity derived from Auth | Agree claimant contact/receipt behavior |
| Photos/category | One placeholder photo; accessory category | photos currently empty; no accessory category | Agree supported intake behavior; track real uploads separately |
| Pagination | page/pageSize | limit/opaque cursor; ranked search limit | Adapt navigation without inventing page totals |
| Approval | Competing pending claims remain pending | Competing submitted claims rejected atomically | Agree lifecycle and update UI, tests, and docs together |
| Duplicate claim | Existing receipt returned | 409 conflict; quota may return 429 | Specify recovery, retry, and receipt lookup |
| Seeds | Cedar Grove mock IDs/slugs | Different backend seed IDs/slugs | Use resolved organization identity; do not hardcode mock IDs |
| Writes | Mock method calls | Same-origin JSON, strict fields and expectedVersion on transitions | Propagate versions and handle stale conflicts |
| Rejection | Free-text claimant-visible reason required | Safe reason codes; staff note private | Agree safe claimant explanation; never expose staff-only note |

## Review sequence

1. Refresh from current main and review the existing handoffs. Preserve all
   original reports and coordinate affected files on the shared PR.
2. Record joint contract choices with affected fields, states, routes, owner,
   reviewer, and evidence. Update the shared board; do not mark agreement by inference.
3. Review the backend foundation as its own change against current main. Keep
   original migrations and original agent reports intact.
4. Make further interface integration changes through the shared PR into main.
   Preserve the standalone preview as reference until the task owner decides its
   future. Replace the mock/session composition with the agreed production adapter.
5. Run a combined build and the relevant unit, mock, SQL, HTTP, browser and
   accessibility checks using the shared integration setup. Record actual
   command results and any environment blockers.
6. Have an independent reviewer verify the full staff intake → scoped search →
   private claim → approval → physical return workflow, including refresh
   persistence, other-user/other-school denials and competing claim decisions.
7. Update state/board, attach phase reports, and hand off. Hosted deployment,
   real uploads, retention jobs, semantic matching and external competition
   evidence remain separately scoped work.

Do not run database-reset or data-removal commands just to organize the repo.
Historical contract proposals and phase acceptance remain distinct from the
repository consolidation. Photo/activity UI wiring and live browser builder checks are delivered in the [Overseer response](overseer-response.md). Independent acceptance and hosted validation remain outstanding.
