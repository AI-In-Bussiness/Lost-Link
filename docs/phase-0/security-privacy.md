# LL-005 — Security and privacy contract

Status: **Review**. Proposed MVP defaults for Founder A, Founder B and the overseer to approve. This document specifies future behavior; security controls and tests have not been implemented or executed. Competition requirements are mapped in competition-alignment.md; school policy and legal requirements have not been supplied.

## Scope and trust boundaries

Use fictional inventory and test identities for one fictional school in the competition demo. The data model must support multiple organizations so isolation can be tested with a second fixture organization. Do not import real student records, identifying photos or real ownership evidence for the demo.

Next.js server handlers validate inputs and enforce workflow rules. Supabase Auth identifies users; PostgreSQL row-level security (RLS) and Storage policies enforce access independently of UI visibility. Vercel holds server-only configuration. Never expose the Supabase service-role credential to a browser. Prefer user-scoped database requests; any privileged job must validate scope explicitly and have narrowly defined access.

## Roles and permissions

| Role | Permitted access |
| --- | --- |
| Visitor | Search deliberately public, sanitized listings within an explicitly selected organization. Cannot read private item details, claims, identities or internal notes. |
| Claimant | Visitor access plus authenticated claim submission and read access to their own claims. Cannot see competing claims or grant themselves staff membership. |
| Staff | Active organization membership permits inventory management and claim review only in that organization. May see ownership evidence needed for return. Auth email is not exposed to staff in MVP. |
| Organization admin | Staff capabilities plus managing staff membership within their organization. Cannot administer other organizations. |

Roles belong to organization memberships, not a user-editable profile or client-supplied JWT field. Users can be claimants in one organization and staff in another. Provision the initial admin through a controlled operator process; no public admin signup. Membership removal must deny subsequent requests without waiting for stale UI state to clear.

Public organization search is an intentional disclosure of approved listings, not access to arbitrary organization data. Every search selects an organization slug resolved by the server. No cross-organization search endpoint is in MVP. RLS must still allow only published public fields; a supplied `organization_id` alone grants no private access. Search and matching must filter by organization before ranking or explanation generation.

## Information boundaries

| Information | Visibility and handling |
| --- | --- |
| Public listing | Broad category, general color, safe description, found calendar date and public location label, sanitized photo. Use an explicit public projection rather than returning an item row. |
| Private item facts | Serial numbers, unique marks, contents, exact recovery location, finder identity, storage/pickup location and staff notes stay staff-only. Keep at least one distinguishing fact private for verification. |
| Claim | Claimant ID and proof are visible only to that claimant and authorized staff. Staff decision notes are staff-only. Expose only a generic decision reason to the claimant. |
| Internal operations | Audit events, membership details and abuse signals are staff/admin-only as appropriate. Never include proof, tokens or personal details in logs or analytics. |

Use separate public and private storage representations or database projections with explicit privileges. A hidden field in a component is not protection. Public photos must not reveal identification cards, addresses, student names, serial numbers, distinctive proof or document contents. Staff review and crop/redact before publication. Preserve private originals only if operationally necessary. Strip EXIF and location metadata from derivatives.

## Claim and item lifecycle invariants

1. An authenticated claimant submits private text evidence against an available item in the selected organization. Derive claimant ID from the session and organization from the item; never trust either from submitted JSON. MVP evidence is text only; evidence-file uploads are deferred.
2. Allow at most one submitted or approved claim per claimant/item pair. Multiple people may have submitted claims. Return a stable conflict response for duplicate submissions.
3. Staff compare private distinguishing facts. Additional-proof messaging is deferred; it has no MVP endpoint. An AI similarity score is a discovery aid and never proves ownership or approves a claim.
4. Review transitions are submitted → approved or rejected; a claimant may withdraw their own submitted claim. Only staff may approve/reject. Prevent staff from approving their own claim; another authorized staff member must review it.
5. Approving a claim atomically reserves the item and prevents a second approved claim. Concurrent approvals must be resolved with a database transaction and uniqueness constraints/locking, not only an application precheck. Reject other submitted claims atomically with a generic item-unavailable reason; do not disclose the winning claimant.
6. Staff mark an approved claim fulfilled and the associated item returned in one transaction after in-person proof/pickup verification. Competing claims remain rejected and the winning claimant's identity stays private. Returned items leave public results.
7. Archiving an available item atomically rejects its submitted claims with a generic item-unavailable reason. A no-show reservation is reopened only by staff through an explicit audited action that marks the approved claim cancelled and releases the item. Rejected claims may be resubmitted explicitly; they do not reopen automatically. Returned records cannot silently become available; correction requires an explicit audited administrative procedure.

Server-side authorization and database enforcement must agree on these rules. Read/check/write operations on item and claim records must verify matching organization IDs, including composite foreign-key constraints where appropriate.

## Upload and request safety

MVP uploads are staff-only item photos: JPEG, PNG or WebP; maximum 5 MiB per file, 3 photos per item and 20 megapixels per image. Verify actual file signatures and successful decoding, enforce dimensions, and re-encode to an allowed format. Reject SVG, HTML, executables, animation and malformed images. Do not trust filename extensions or browser MIME headers. Generate random object keys and enforce organization/item ownership in Storage policies. Upload originals to a private staging bucket; publish only reviewed sanitized derivatives. Private objects use short-lived signed URLs (proposed maximum 5 minutes), issued after authorization. URLs must not appear in analytics or durable logs.

Use schema validation, length limits, parameterized database queries and plain-text rendering for descriptions and proof. Proposed limits: search 300 characters, listing description 1,000 characters and claim evidence 20–2,000 characters. Authenticated mutations require same-origin/CSRF protection suitable to the session mechanism. Never interpolate user input into SQL, HTML or a model instruction with privileged capabilities.

Proposed initial rate limits: 30 searches/minute per client, 5 new claims/hour per user, and 20 uploads/hour per staff account, with shared server-side counters and explicit `429` responses. Tune after testing; an in-memory counter per serverless instance is insufficient. Add request body limits and timeouts. For embeddings, send only sanitized public listing text and the search query, never private proof or identity data; validate provider retention terms before enabling external AI. Keep keyword/attribute search usable when AI fails.

## Audit and retention proposals

Record actor, organization, target IDs, action, previous/new status, UTC timestamp and request correlation ID for inventory publication, membership changes, claim review, reservation release and return. Make events append-only to ordinary users and staff; define a controlled operator path for required deletions. Avoid logging raw proof, search queries, credentials or signed URLs. Record enough metadata to investigate denials without leaking private content to the client.

Proposed retention defaults, pending school policy approval:

- Remove claim evidence 30 days after claim closure; expire inactive submitted or approved claims after 90 days, cancelling them atomically and releasing any reservation. Remove their evidence 30 days after closure. Retain only minimal status metadata until approved deletion/anonymization. Staff access is for return operations only.
- Remove private images and identifying item details 90 days after return or archive. Keep only anonymous aggregate counts beyond that period.
- Retain minimal audit metadata for 180 days, then delete or irreversibly anonymize actor references according to approved policy.
- Delete orphaned staging uploads within 24 hours. Remove related storage objects when their parent data is deleted.
- Before admitting real users, define an admin-assisted deletion operational procedure; verify identity and any approved retention exception without exposing other records. An in-product deletion-request route is outside MVP. Document backup expiry separately: deletion from active tables does not immediately erase backups. Provider backup retention must be selected and disclosed before real users are admitted.

A scheduled job must enforce retention, including Storage cleanup; a policy in documentation alone is insufficient. Use synthetic demo accounts, reset demo data reproducibly and do not publish reusable production credentials.

## Threats and required verification

These are acceptance scenarios for later implementation, **not passing test results**. Run them through both application routes and direct Supabase client access where applicable, using two organizations, two claimants and staff with distinct memberships.

| Threat | Required check |
| --- | --- |
| Cross-organization ID substitution | Staff A cannot read/mutate B's private items, claims, membership, storage or audit data by changing IDs, filters or URLs. |
| Public-field disclosure | Anonymous search/detail responses and photos contain only the approved public projection; private columns cannot be fetched directly. Returned/draft items do not appear. |
| Claim theft | Claimant A cannot read B's proof, modify claim ownership/status, or obtain private image URLs. |
| Privilege escalation | A claimant cannot create or modify their own membership; a removed staff member immediately loses protected access. |
| Race conditions | Two concurrent approvals yield exactly one reservation; return updates both item and winning claim atomically; invalid transitions fail. |
| Fraudulent verification | Matching never auto-approves. Self-review fails. Staff must explicitly verify proof before return. |
| Upload abuse | Spoofed MIME, oversized files, decompression bombs, unauthorized object paths and unreviewed public uploads are rejected. Sanitized output has no EXIF. |
| Injection and request abuse | Script/SQL payloads remain inert, cross-origin mutation attempts fail, and configured rate limits return `429` without disabling ordinary searches. |
| AI leakage/failure | Provider requests exclude private data; organization filtering precedes ranking; provider timeout produces a usable structured-search fallback. |
| Retention and audit gaps | Closure creates sanitized audit records; scheduled cleanup removes expired proof and objects without deleting unrelated organizations' records. |

## Review decisions still required

Confirm the audience and organization visibility with Founder A; approve public fields, reservation UX in the shared architecture contract. Confirm whether real minors' data will ever be used, applicable school policy, retention periods, AI provider terms before a real-user launch. This document is not evidence of legal compliance or a completed security review.
