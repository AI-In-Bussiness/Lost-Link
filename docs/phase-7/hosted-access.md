# Secure hosted access for finishing Founder B Phase 7

The public site now passes all 17 deployment checks, including hybrid search.
The remaining work requires operator access: inspect the current deployment and
Auth settings, prepare the four synthetic demo accounts, verify real photos and
claim/return, and rehearse a compatible rollback before locking the release.

## Connect the execution workspace

Add these as **Secrets in this task's execution-environment settings**, then
restart/resume the environment if those settings require it. These operator
tokens do not belong in the Vercel application's environment variables.

| Workspace secret | Source and purpose |
| --- | --- |
| VERCEL_TOKEN | Create in [Vercel account token settings](https://vercel.com/account/settings/tokens), with access to the team/project `ddar2425s-projects/lost-link`. Used to inspect deployment configuration, environment names, aliases and compatible rollback targets. |
| SUPABASE_ACCESS_TOKEN | Create in [Supabase account token settings](https://supabase.com/dashboard/account/tokens), using the account authorized for project `ldhwtrxhmaanfcgmtsbp`. Used to inspect the intended project's configuration and securely obtain the project credentials required by the existing operator provisioning script. |
| LOSTLINK_DEMO_PASSWORD | Choose a unique 12+ character password for the four fictional demo accounts. If they already exist, supply their original password; provisioning preserves existing passwords rather than rotating them. |

Give tokens the access needed for the identified targets and an appropriate
expiry. Paste values directly into the secure settings; never into chat, Git,
issue/PR bodies, screenshots or shell command arguments. The environment status
must report the configured bindings ready before automation uses them.

The website's public URL/key and server photo processor key are separate:
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public
Config; `SUPABASE_SERVICE_ROLE_KEY` is a Vercel Production server-only Secret.
No management token or demo password is required by the website runtime.

## What the operator will verify

1. Confirm the intended project/production alias and inspect current settings,
   existing Auth users, memberships and migration history before making changes.
   The task owner already installed the four migrations and seed through SQL
   Editor; never blindly replay the initial DDL or reset hosted data.
2. Inspect/configure the required server photo credential and hosted Auth URL,
   redirect, signup and password settings; preserve correct existing values.
3. Use `npm run demo:accounts` with securely supplied project/operator settings,
   then `npm run demo:check -- --app` with the public settings and original demo
   password. Preserve existing users, roles and passwords; report mismatches.
4. Complete the real deployed photo → private preview → publication → scoped
   discovery → private claim → approval → physical return journey. Verify refresh
   persistence, account/school denials and public photo/item revocation. Use a
   fresh fictional item and preserve the seed listings and audit trail.
5. Record exact deployment/SHA/config/model/schema references; establish and
   rehearse a compatible rollback target, restore the intended candidate and
   rerun the checks. Lock only after the actual hosted checks and independent
   acceptance succeed. The known relevance review in #21 remains explicit.

If operator credentials cannot be connected, the same steps can be performed
through the provider dashboards with a reviewer retaining the evidence. A local
CI test or public smoke cannot substitute for those authenticated operations.
