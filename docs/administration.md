# Website administration

Website owners sign in normally and open `/admin`. School admins open
`/o/<school-slug>/staff/settings` from their account or school workspace navigation.
Signup grants neither role.

| Role | Access |
| --- | --- |
| Website owner (the two founders) | Create schools; manage settings, access, inventory, photos and claims across every school, including hidden schools |
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
Account/school deletion, password resets, billing, provider keys and arbitrary code
editing remain operator tasks rather than website controls.

## One-time owner setup

1. Confirm the intended Supabase/Vercel targets and back up the database under the
   existing operational policy. Apply the reviewed **pending** migration
   `supabase/migrations/202610290005_platform_admin.sql`, then
   `202610290006_owner_only_administration.sql`, then
   `202610290007_school_admin_scope.sql`. Apply only the pending ones in order;
   these support installations that already ran the initial PR40 setup. Migration
   007 implements the final two-level permissions. Earlier migrations stay intact.
   Do not reset hosting or replay migrations already recorded as applied.
2. Deploy the corresponding application source. Keep `NEXT_PUBLIC_SITE_URL`
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
