# Founder B — Phase 3 workflow backend

2026-10-26 follow-up: live photo upload/review/publication and item activity are now wired through the integrated interface, alongside date filters and separate rejection explanations. The original backend-only scope below is preserved. See the [Overseer response](../coordination/overseer-response.md) for combined validation and the [implemented contract](../coordination/implemented-contract.md) for current behavior.

Founder B's Phase3 backend now covers found-item creation, real photo processing/publication/delivery, organization-scoped search, private claim submission/review, persistent return state and staff activity history. Inventory/claim transactions were implemented in Phase2 and remain the same user-scoped APIs. This phase fills their photo and activity gaps; it does not claim Founder A's interface has been connected or the whole team's browser/deployment gate has passed.

## Local setup

From the existing repository checkout, with Node24 and Docker:

```sh
npm ci
npm run db:start
npx supabase migration up --local
npm run env:local
npm run env:photos
npm run dev
```

Skip env:local if .env.local already exists; it refuses overwrites. env:photos works only for a verified local Supabase target, preserves existing processor credentials and stores the local key only in ignored owner-readable .env.local. This is the narrowly trusted processor credential described below, never a NEXT_PUBLIC_ key. Existing demo accounts/passwords remain preserved. No database reset is needed.

For the proxy-based cloud shell use the npm install command documented in Phase1. Docker vfs still needs the prepared database image. Never replace --local with a hosted target unless that target's existing state and migration plan have been reviewed.

## Photo API for Founder A

Paths below are prefixed `/api/v1`. All mutations require an authenticated same-organization staff/admin session and the exact configured Origin. IDs are server-generated UUIDs; paths and caller identity are never accepted from the form.

| Operation | Method and path | Behavior |
| --- | --- | --- |
| Upload | POST `/organizations/:slug/staff/items/:itemId/photos` | multipart/form-data with exactly one field named file; returns201 `{data:{id,status:"pending"}}` |
| Staff review list | GET `/organizations/:slug/staff/items/:itemId/photos` | `{data:[{id,status,alt,url}]}` of processed pending/published images |
| Staff preview | GET `/organizations/:slug/staff/items/:itemId/photos/:photoId/content` | Same-org authenticated image/webp bytes |
| Publish after review | POST `/organizations/:slug/staff/items/:itemId/photos/:photoId/publish` | JSON `{reviewed:true}`; returns `{data:{id,status:"published"}}`; safe to repeat |
| Public delivery | GET `/organizations/:slug/items/:itemId/photos/:photoId/content` | Bytes only if organization is published, item available, photo published and verified |
| Staff history | GET `/organizations/:slug/staff/activity` | Safe audit metadata, limit1–50/default20, opaque cursor; optional itemId includes only that item and its claim/photo events; same-org staff/admin only |

Public item DTOs and structured search now include real `{url,alt}` photo entries after publication. Before publication those arrays remain empty. Alt text uses the public item title, never filenames or private verification facts. Staff review content should use returned URLs directly in the browser. Use an ordinary image element or unoptimized Next Image: server image optimization/CDN caching would omit staff cookies or retain images after authorization changes. Content routes use private,no-store, inline image/webp and nosniff.

Staff must inspect the preview and verify the visible picture reveals no names, ID cards, addresses, serial numbers or private ownership clues before sending reviewed:true. The boolean records an explicit staff decision; it does not prove a human inspected the image or perform automated redaction. Publication never verifies ownership. Already-downloaded public copies cannot be recalled; future API/Storage reads are denied when the item becomes reserved, returned, archived or the organization is unpublished. Archive the item to withdraw its public listing/photos if a published photo needs urgent correction; per-photo deletion/replacement is not yet implemented.

Search and claim API shapes remain as documented in Phase2. A normal journey is: staff creates item → uploads and privately previews photo → explicitly publishes → visitor discovers public listing → authenticated claimant submits private proof → staff approves → public item/photo access disappears → staff confirms physical return → item returned and claim fulfilled persist. Approval/return and competing-claim behavior are transactional.

## Validation and resource limits

The earlier proposed5MiB ceiling is narrowed to4MiB for this implementation. [Vercel Functions limit both request and response payloads to4.5MB](https://vercel.com/docs/functions/limitations);4MiB plus bounded multipart overhead fits that limit. This is a deliberate platform-compatibility decision, not an unverified promise that5MiB uploads work on Vercel.

- Only actual JPEG, PNG or WebP binary formats are decoded. Filename/MIME labels are untrusted and never determine output paths or content. Unsupported/corrupt bytes, SVG/HTML/GIF and animation are rejected. Harmless trailing data is discarded by constructing a new image, not copied to Storage.
- Maximum input4MiB; multipart overhead bounded to16KiB. Streaming limits do not rely on Content-Length. Only one file/form field is allowed.
- Maximum decoded20 megapixels, one frame. Orientation is applied; EXIF/ICC metadata is stripped. Valid images are resized inside2000×2000 without enlargement and encoded as fresh WebP, with maximum4MiB output size and protected SHA-256/length metadata.
- At most3 processing/pending/published photos per item. Twenty reserved processing attempts per staff identity per rolling hour, across items/organizations; failures/aborts count. The database serializes reservations so concurrent requests cannot bypass either limit. Quota/cap/configuration checks precede expensive decoding.
- Photos are written with immutable random server-generated names to a private bucket. Direct client uploads, overwrites and derivative publication remain denied; old staging uploads are now denied too. No raw originals are retained by this workflow.
- Serving a derivative verifies its stored size/hash. Public delivery uses an anonymous Storage request even if the caller has a staff cookie, so staff preview privileges cannot broaden public access during state changes. Staff previews use user-scoped Storage policies.

Errors retain the safe code/message/requestId/no-store contract. Upload failures can return400/413/415 for invalid data,401 for no session,404 for inaccessible resources,403 for origin/review permissions,409 for cap/state conflict,429 with Retry-After3600 for hourly quota, or503 for unavailable processing/dependencies. If a success response is lost, inspect the staff photo list before retrying: a pending committed photo is deliberately preserved.

## Explicit processor trust decision

Phase0/Phase1 proposed that ordinary app handlers would never use service-role credentials. Photo processing now adds a narrow, documented exception in server-only src/lib/photos/service.ts: after session/membership verification, a trusted processor reserves a slot through service-only RPCs, decodes/re-encodes bytes, inserts immutable Storage data, and finalizes a pending photo. It does not provide generic privileged CRUD or use a browser-provided organization/user/path. SQL independently rechecks actor membership, tenant, item state, quota/cap, object presence and integrity metadata. Public/staff reads, publication, inventory, search, claims and activity remain caller scoped and do not require the processor credential.

The credential itself remains a broad Supabase service-role key; code isolation narrows how the application uses it, not its underlying privileges. Keep it server-only and rotate it through provider settings if necessary. It is never returned in DTOs, stored in tracked files or bundled into browser assets. Without it uploads return503, while public listings and verified photo reads still work. A separate restricted processor deployment could replace this boundary later without granting client Storage writes.

In hosted deployments set SUPABASE_SERVICE_ROLE_KEY securely alongside the public project settings; the local helper never configures hosted secrets. The cloud environment requirement is scoped to ldhwtrxhmaanfcgmtsbp.supabase.co. The deployed Vercel processor also needs its own secure environment binding. Provider authentication, remote migrations and hosted checks remain outstanding; this phase has not deployed the site.

## Compensation and remaining work

An ordinary decoding/upload/finalization failure aborts its processing reservation and attempts Storage removal. Abort is checked before removal: a photo already finalized before a lost response remains intact. If the process is killed, abort cannot run; if removal fails, an unreachable object may remain. A trusted operator must inspect stale processing rows/orphaned objects and clean them deliberately. Those rows count toward the cap until cleanup. No automated cleanup/retention scheduler or per-photo deletion is claimed here. Review these operational cases and public-search/login edge throttling before real-user release.

Semantic matching is Phase4. Founder A still owns UI wiring, loading/empty/error/accessibility states and actual browser journeys. Preserve the integration differences recorded in Phase2; no mock contract has been silently rewritten. See [validation](validation.md) and [the root Phase3 report](../../agent-logs/codex-founder-b__founder-vb__phase-03-workflows/codex-founder-b__founder-vb__phase-03-workflows.md) for executed evidence and handoff.
