# Website administration

Website owners sign in normally and open `/admin`. School admins open
`/o/<school-slug>/staff/settings` from their account or school workspace navigation.
Signup grants neither role.

| Role | Access |
| --- | --- |
| Website owner (the two founders) | Create/delete schools; manage settings, access, inventory, photos and claims across every school, including hidden schools |
| School admin | Manage settings, staff/admin assignments, inventory and claims only in their assigned school |
| School staff | Manage inventory, photos and claims only in their assigned school |
| Claimant | Browse public listings and manage their own claims |

School admins cannot create schools, open the website-wide `/admin`, change
another school's settings or memberships, or grant website ownership. School
admins must leave at least one school admin assigned when removing or demoting
admins. Website owners can restore or override school access when necessary.

## Available controls

- Create schools with a permanent URL slug; new schools default to hidden.
- Edit school name, time zone, public office email and collection instructions.
- Permanently delete a school and all its inventory, claims, private proof, photos,
  school activity and staff assignments. Type its exact web address and confirm
  the irreversible action. User accounts and other schools are retained; a minimal
  owner-visible deletion receipt is kept. School admins cannot delete schools.
- Publish/hide public listings without deleting inventory, claims or staff access.
- Assign/change/remove a confirmed registered account's school staff or school-admin access.
- View the two website owners and the latest 100 owner changes.

Published schools appear in the homepage directory without environment edits or
redeployment. The directory also includes an authenticated staff member's hidden
schools so their workspace remains usable, but hides those schools from the public
homepage. Contact emails appear on school search pages; collection instructions
appear on approved claim receipts. Public settings must not contain private item
proof, staff storage information or personal contact details.

Website owners have full access to every school workspace without adding individual
memberships. School admins and staff stay scoped to their memberships. School
settings/access changes are audited; school admins see only their school's admin
activity. Neither school role changes the protected website-owner assignment.
Account deletion, billing, provider keys and arbitrary code editing remain
operator tasks. Password recovery is available from sign-in.

## One-time owner setup

For the dashboard SQL Editor, use the [combined administration setup](../supabase/setup/administration.sql).
Copy the entire file and run it first, then run the two-email bootstrap query below.
The combined script supports earlier PR40 setup already being installed and can
be repeated. It contains no personal emails, passwords or keys. The individual
migration instructions below are the alternative for the CLI migration workflow;
do not replay those individual migrations blindly after manual dashboard setup.


1. Confirm the intended Supabase/Vercel targets and back up the database under the
   existing operational policy. Apply the reviewed **pending** migration
   `supabase/migrations/202610290005_platform_admin.sql`, then
   `202610290006_owner_only_administration.sql`, then
   `202610290007_school_admin_scope.sql`, then
   `202610300008_owner_school_deletion.sql`. Apply only the pending ones in order;
   these support installations that already ran the initial PR40 setup. Migration
   007 implements the two-level permissions; 008 adds owner-only permanent school
   deletion and its photo cleanup outbox. Earlier migrations stay intact.
   Do not reset hosting or replay migrations already recorded as applied.
2. Deploy the corresponding application source. Keep `SUPABASE_SERVICE_ROLE_KEY`
   configured on the trusted server for photo cleanup (as for existing uploads).
   Keep `NEXT_PUBLIC_SITE_URL`
   matched to the actual canonical HTTPS address and the Supabase callback URLs.
3. Each person registers on the website and confirms their email, using their own
   password. Existing confirmed accounts can be reused. An operator can instead
   create the two accounts through Supabase's trusted user-management dashboard,
   where each person chooses their password privately.
4. In the intended project's **Supabase SQL Editor**, run this as the trusted
   operator, replacing the example emails with the two agreed owner addresses:

   ```sql
   select public.bootstrap_platform_admins(array[
     'first-owner@example.test',
     'second-owner@example.test'
   ]);
   ```

   The result must be `2`. Both accounts must already exist and be confirmed.
   The command preserves passwords. Repeating it with the same pair is safe;
   substituting another pair after setup is rejected. Website users, including
   school admins, cannot execute this bootstrap. Owner recovery/replacement is
   deliberately an operator task rather than a browser role picker.
5. Both people sign in and open `/admin`. Test creating a hidden synthetic school,
   settings, publication, staff assignment and removal before using real school
   data. Sign in as an ordinary user too and verify owner controls are denied.

The equivalent operator CLI is `npm run admin:bootstrap`, using securely supplied
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `LOSTLINK_OWNER_EMAILS`
(two comma-separated confirmed addresses). The service key is used only by this
operator script, never by the owner web routes. Do not commit these settings,
share passwords or place secret keys in chat, forms or `NEXT_PUBLIC_*` variables.
The script does not send invitations or reset passwords.

## Security and validation

Owner mutations require a verified Auth user, exact configured same-origin POST,
bounded strict form fields and a current school settings version. A separate
security-definer RPC checks the owner table for every operation; it does not trust
client role claims or user-editable metadata. RLS denies ordinary owner-table reads
and all direct client mutation of roles/settings/audit. Audit entries are inserted
transactionally. Errors retain form entries; stale versions require refreshing.

Permanent deletion checks owner permissions, the current settings version and the
exact typed school address again in the database. It removes school records in one
transaction. Deleting one school never deletes Auth accounts or another school's
memberships or records. Photo paths are queued transactionally and bytes are removed
through the Storage API after commit. If Storage is unavailable, files are no longer
accessible through the app; `/admin` shows **Retry photo cleanup** until removal
succeeds. Each retry removes up to 100 files. Keep retrying for larger schools.
In-flight uploads clean up their own bytes if their school was deleted, and queue a
retry if that cleanup fails. No storage table rows are deleted directly with SQL.

Removing a school membership or owner row takes effect on the next operation,
including with an existing session. The role labels/navigation are display only.
There is no public endpoint for arbitrary account lookup: only verified owners can
look up a confirmed email when assigning school access.

Local checks:

```sh
npm test
npm run db:test
npm run build
npm run test:admin
```

`test:admin` needs the matched local Supabase stack, the production build, Python
Playwright/Chromium, axe-core from `tools/phase2`, and free port 3000. It creates
random confirmed test users/owner rows and synthetic schools, checks both owner accounts and denial of every owner action for
ordinary and school-admin accounts at the website-wide endpoint, then cleans up its own records. It never resets the
database or provisions the actual founders. Foundation CI runs it after existing
persisted browser acceptance. The dashboard loads the complete small school and
membership directory and the latest 100 events; larger deployments will need
paginated school/member management.

Hosted migration, account assignment and actual deployment are distinct from local
verification and require the project's authorized operator access.
