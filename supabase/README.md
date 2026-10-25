# Supabase foundation (Founder B, Phase 1)

Run from the repository root with Docker and the Supabase CLI installed:

```sh
npx supabase start
npx supabase db reset
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/tests/foundation.sql
```

The database URL above is the Supabase local-development default, never a production credential. `db reset` destroys **local** data and applies the migration and synthetic seed. Do not run it against a shared or hosted project. For a hosted project, review the migration, link the intended project and use the CLI migration deployment flow; do not reset production. Configure the app from local `supabase status` output or the project's public URL/publishable key. Never commit service-role keys.

## Provisioning

Public signup is disabled in local config. Use Supabase Auth's administrative API from a trusted local script/operator context to create confirmed synthetic demo users with fresh passwords supplied through secure environment input. Do not insert production users directly into `auth.users`. After obtaining their UUIDs, a database operator inserts `memberships(organization_id,user_id,role)` for the intended fictional school. Bootstrap the first admin this way; clients cannot grant roles. `profiles` are self-readable but provisioning is an operator operation in Phase 1. Admin membership-management endpoints are deferred; there is no insecure direct-table shortcut.

The seed contains two fictional published organizations and two items with synthetic private facts; it creates no accounts or passwords. Seed insertions are repeatable by ID. Integration tests create temporary auth identities and memberships inside a rolled-back transaction; those identities cannot sign in and never become demo credentials.

## Boundary and supported operations

Every application table uses RLS and explicit grants. Staff/admin may read their own organization, inventory, proof and audit records. Claimants receive their own claims through `list_own_claims()`; raw claims are staff-only so staff notes cannot leak via column selection. Public access is restricted to `get_public_organization(org_slug)` and `list_public_items(org_slug,page_size)` RPCs. These security-definer functions have fixed empty search paths, explicit safe projections and limited execute grants. The latter returns published photo **paths**, not signed URLs: an application adapter must produce authorized Storage download URLs when photos are implemented. It is a foundation RPC, not the final HTTP search/pagination contract.

All direct application-table writes are deliberately denied to client roles in this phase, including to staff. Transactional inventory/claim/membership endpoints and audit writers belong to later work. There is no implemented claim submission, review, return, retention scheduler or AI provider. The database constrains tenant links, statuses and active claim uniqueness now; it does not claim to implement future lifecycle orchestration.

`item-staging` and `item-public` are both private buckets. The latter name denotes reviewed derivatives, not a public-bucket flag. Anonymous clients can download only metadata-linked published derivatives for available items in published organizations; returned items lose this read permission. Staff can upload into their organization's existing item path in staging (`organizationUUID/itemUUID/randomFilename`). Direct client derivative publication, metadata writes, overwrite and deletion are denied. A future trusted image processing/review workflow must decode/re-encode, strip metadata, enforce dimension/photo-count limits and publish the approved derivative atomically. Bucket MIME/5 MiB limits alone do not establish image safety. No upload endpoint is advertised as complete.

Storage policies assume this dedicated project's normal Supabase storage grants and no additional permissive policies. Review all policies before deploying into an existing project. Removing an organization membership revokes subsequent authorization immediately. Short-lived signed URLs, if later issued, remain usable until expiry; avoid caching them and use the proposed five-minute maximum.

## Validation

`tests/foundation.sql` runs against the real local Supabase database as postgres, uses `SET ROLE` and `auth.uid()` JWT-subject settings to exercise anonymous, claimant, both organizations' staff and admin access. It checks public projection privacy, unpublished/returned visibility, own-claim projection, cross-tenant reads/uploads, role escalation denial, direct lifecycle-write denial, storage publication denial, membership revocation, tenant foreign keys and active-claim uniqueness. Fixtures roll back. It does not test Auth HTTP login, browser cookie handling, Storage HTTP decoding or concurrent Phase 3 transitions.

`tests/bootstrap.sql` is an optional test-only minimal auth/storage schema for an **empty disposable PostgreSQL database**, when the actual Supabase stack is unavailable. Never execute it against Supabase or a shared database. Such a harness run validates SQL/RLS only and must be reported separately from full Supabase integration.
