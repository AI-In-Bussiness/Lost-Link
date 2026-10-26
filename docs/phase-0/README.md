# Founder B — Phase 0 handoff

2026-10-26 follow-up: the design-only statements below describe the original Phase 0 handoff. The [implemented contract](../coordination/implemented-contract.md) now supplies schema/auth/RLS/Storage/transaction decisions and MVP traceability; [Overseer response](../coordination/overseer-response.md) records current checks. Joint acceptance and external competition facts remain pending.

Status: **Review**, not approved. Based on the supplied LostLink master plan; the referenced 56-task workbook was not included. Competition guidelines were supplied subsequently and are mapped below. No task IDs or acceptance criteria from that unavailable workbook have been invented.

## Deliverables

- [LL-005: Security and privacy](security-privacy.md): permissions, private ownership evidence, organization isolation, uploads, threats and proposed retention.
- [LL-006: Architecture and shared contracts](architecture-contract.md): entities, page names, API shapes, matching boundary, lifecycle and future validation.
- [Competition alignment (LL-001 contribution)](competition-alignment.md): actual submission requirements and judging priorities.
- [Review record](review.md): independent document review and remaining decisions.

This is strategy/design work. No Next.js application, database migrations, security policies, authentication, deployment or application tests have been implemented. Those start in Phase 1. The repository was inspected before editing and contained only a README and license.

## Proposed MVP checklist (LL-003, shared)

- [ ] Home explains Search → Match → Claim → Return.
- [ ] Visitors search available, sanitized listings within a published organization.
- [ ] Structured search provides relevant results; no AI ownership guarantee.
- [ ] Authenticated claimants submit private text proof and view their own claims.
- [ ] Staff create inventory, review photos, approve/reject claims and confirm pickup.
- [ ] Approval/reservation/return persist atomically and survive refresh.
- [ ] Direct database and Storage access enforce organization and ownership permissions.
- [ ] Mobile, accessible loading/empty/error states work throughout the journey.
- [ ] Critical workflow and permission tests pass before launch.

Unchecked means not implemented or verified. Semantic matching and explanations are P1 after P0 works; all other enhancements are deferred unless founders change scope.

## Decisions for founders/overseer

| Decision | Proposed default | Who resolves |
| --- | --- | --- |
| LL-001 rubric and submission deadline | Rubric mapped; exact dates and paid-track rule adoption still unknown | Both founders confirm with organizer |
| LL-002 audience | Fictional school, synthetic data only | Founder A confirms |
| LL-003 scope/priorities | Checklist above; structured matching first | Both founders |
| LL-004 screens/user stories | Proposed page map in LL-006; original workbook task definition unavailable | Founder A/overseer reconcile |
| Public disclosure | Published org inventory with broad identifying facts; private distinguishing evidence | Both founders |
| Account flow | Confirmed synthetic email/password accounts for demo | Both founders |
| Claim reservation UX | Approval reserves and rejects competing claims; staff cancellation allows explicit resubmission | Both founders |
| Retention | Proposed periods in LL-005; real-user rollout requires school policy review | Founders with organization owner |
| LL-007 progress board | This handoff tracks Founder B design only; shared board not created | Founder A/overseer |

## Phase 1 entry and work order

After scope/contract agreement, pin framework/runtime versions and scaffold Next.js. Create Supabase migrations, restricted grants/RLS, synthetic two-organization fixtures and confirmed demo accounts. Test direct tenant/owner permissions before adding inventory, sanitized uploads and claim transactions. Build Founder A's mocks from the agreed public DTOs and lifecycle names. Configure CI and hosting only in Phase 1; do not add real personal data or secrets to Git. Local `.env` values belong in ignored local configuration and deployment secret settings.

Phase 0 exit gate remains pending: Founder A and Founder B accept the MVP and contracts; overseer reconciles page names, fields and behavior against the actual rubric. An independent document review can find design gaps but cannot substitute for founder approval or runtime security tests.
