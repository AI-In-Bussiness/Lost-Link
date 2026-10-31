# Implemented contract for Phases 0–3

Recorded 2026-10-26 by `codex-founder-b`, Founder B, on `codex/overseer-phase-0-3-fixes`, based on integrated main `dc58f92`. This is the single current implementation reference. The original Founder A proposal and Founder B designs remain historical inputs. Their differences are resolved below in code, with formal joint scope acceptance still awaiting the founders and Overseer. Starting a phase did not supply that acceptance.

| Topic | Current behavior and source |
| --- | --- |
| Scope | Fictional school workflow: intake → scoped structured search → private claim → staff review → physical return. Semantic matching/explanations are Phase 4; no claim that keyword matching is semantic AI. No claimant image input, image recognition, notifications or public registration. |
| Application | Next.js App Router mounts `src/interface/app.ts` through `live-page.tsx`/`live-client.tsx`. Standalone demo/mocks remain development references and never authorize production users. |
| Identity/provisioning | Supabase verified cookie sessions; confirmed fictional accounts provisioned by the operator. `memberships` holds staff/admin rights by organization. Clients cannot assign roles or write application tables directly. Admin UI for membership management remains outside this phase. |
| Tenancy/privacy | Composite organization foreign keys, RLS, narrowly projected RPCs and exact Origin checks. Public DTOs contain public facts and reviewed photo URLs only. Own claims exclude claimant IDs and staff notes; staff proof/history is limited to their organization. |
| Field mapping | UI `ownershipEvidence` → API `evidenceText`; `foundLocation` → `publicLocation`; `verificationNotes` → `identifyingDetails`. Claim identity derives from Auth; email is read-only account display and is not submitted or copied into claims. |
| States | DB `submitted` maps to UI Pending. Approval atomically reserves and rejects competing submitted claims with `item_unavailable`; return separately marks item returned and winning claim fulfilled. Staff cannot approve/return their own claim. Withdrawn/cancelled remain distinct. |
| Conflict/retry | Mutations send the rendered version. Stale changes require refresh; duplicate active claim returns 409 with My claims recovery. Original-version approval/return retries are idempotent. No automatic approval overwrite. |
| Rejection | Explicit reject now requires `claimantReason`, 5–500 trimmed characters. Optional `privateNote`, at most 1,000 characters, stays staff-only. UI labels them separately. Existing rejected records retain generic fallback; private notes are never backfilled into public explanations. Automatic competing/archive rejections retain a generic safe reason. This is an intentional validation change for callers of `review_claim`; update clients together. |
| Search | Public structured search/browse supports category, color and inclusive ISO `from`/`to` found dates. Calendar/range validation runs in HTTP and DB; date filters run before ranking and limits. Unsupported `accessory` stays absent; use Other. |
| Paging | Backend lists use limit/opaque UUID cursor. UI scans fresh, bounded batches (maximum 5,000), then slices page numbers. Incomplete/cyclic scans fail visibly. Ranked search is bounded to 50 and labeled Top results; no invented full-match total. Separate reads are not a snapshot. |
| Photos | Save item text, then upload on its management screen; text listing is public before a photo is added. Browser automatically compresses JPEG/PNG/WebP sources over 4 MiB (maximum 32 MiB and 40 megapixels) to an oriented JPEG inside 2000×2000 and at most 4 MiB; transparent areas become white. Smaller files pass through unchanged. POST multipart `file` still requires maximum 4 MiB, JPEG/PNG/WebP. Server decodes, strips metadata and re-encodes; staff inspects processed private preview and checks review before publication. Max three slots/item, twenty attempts/actor/hour. Public DTO maps the first reviewed photograph; staff can see every processed photo. Alt uses public title. No original is retained. |
| Processor trust | Only the server-only photo processor uses the broad service-role credential for reservation/immutable Storage writes/finalization/abort. Other operations and all reads stay caller scoped. Code isolation does not reduce the key's underlying provider privileges. Missing processor key prevents uploads but permits public reads. |
| Photo revocation | Direct browser image URLs use no-store and retain staff cookies for private previews. Public URLs use anonymous Storage authorization even with staff cookies. Reservation, return, archive and unpublished organizations revoke future public reads. Downloaded copies cannot be recalled. |
| Activity | `GET /organizations/:slug/staff/activity?itemId=:uuid` returns bounded safe events for the target item and its claims/photos, with the same opaque cursor. DB rechecks staff/tenant; notes/evidence are absent. Management screen displays them chronologically. |
| Synthetic seeds | Maple/Cedar backend organizations are resolved by slug; mock Cedar Grove IDs are not production IDs. Configured directory is discovery, never authorization. Tests create separate random organizations. |
| Retention/cleanup | Synthetic data only is the current operating scope. Phase 0's 30/90-day periods remain proposed pending school approval. No automatic retention/deletion scheduler is implemented. Failed requests compensate; crashes can leave private processing/orphan objects. Operator inspects those deliberately; do not reset shared data. Real-user launch remains blocked on approved retention, backup expiry, deletion procedure and enforced jobs. |
| Hosting | Existing Supabase/Vercel project URLs identify intended targets. Local migration/build/browser checks do not establish matching hosted settings, remote migrations or deployed behavior. Provider credentials and target validation remain deployment prerequisites. |

## MVP traceability

| Acceptance | Implementation/verification |
| --- | --- |
| MVP-01 home/school navigation | Live homepage, school directory and real sign-in continuation; live browser screenshots/axe |
| MVP-02 staff intake with safe photo | Text save → upload → processed preview → explicit publish → refresh; decoder/Storage SQL+HTTP and real browser checks |
| MVP-03 scoped search/filter | Structured ranking, category/color/date filters; SQL/HTTP tests and real browser date-boundary search |
| MVP-04 signed-in private claim/receipt | Account identity, private text and real cookie login/receipt refresh; browser + HTTP tests |
| MVP-05 staff review/rejection | Same-org evidence and versioned decision; separate required claimant-safe explanation; SQL/HTTP/browser privacy assertions |
| MVP-06 reservation/return durability | Item-first row locks, uniqueness, competing approval tests, explicit physical handover and refreshed persisted states |
| MVP-07 isolation | Real two-school/owner SQL and HTTP denials plus independently signed-in browser contexts |
| MVP-08 UI states/accessibility | Existing standalone failure/loading/keyboard/resize/reduced-motion tests plus live routes at three widths/axe. Builder evidence only; independent and manual assistive-technology review pending. |
| MVP-09/MVP-10 semantic showcase | Deferred to Phase 4; no evaluation results claimed. |

The dates, submission destination, spend/entitlements, member contributions and real demand research require team/organizer evidence. Neither this record nor passing tests invents those facts or marks the joint phase gates Done.

## Website-owner extension

`/admin` and `platform_admin_dispatch` add a separate website-owner role, with
school settings, publication, school memberships and admin audit. School `admin`
continues to mean school-scoped staff access. The operator assigns the two
confirmed founders with `bootstrap_platform_admins`; signup cannot self-promote.
The public directory discovers published schools dynamically and includes hidden
schools only for their assigned staff. See [administration](../administration.md)
for migration order, setup, privacy boundaries and actual validation limits.

### Final two-level administration clarification

The founders are website owners with all-school administration and workspace
access. School `admin` memberships manage settings and staff/admin access only
for their school through `/o/<slug>/staff/settings` and `school_admin_dispatch`.
Ordinary staff retain inventory/claim access. `/admin` and the platform RPC remain
owner-only. Migration 007 enforces the final scope after migration 006. School
admins cannot grant owners, create schools or cross school boundaries; the last
school-admin removal/demotion is blocked except for a website owner recovery.
