# Password reset

Issue [#41](https://github.com/AI-In-Bussiness/Lost-Link/issues/41) adds
**Forgot your password?** to sign-in. Claimants, school staff, school admins and
website owners use the same recovery flow:

1. Open sign-in on the canonical LostLink domain and select **Forgot your password?**.
2. Enter the email address for the existing LostLink account.
3. Open the newest password reset email in the same browser that requested it.
4. Enter and confirm a unique 12–256 character password within 15 minutes of
   opening the link. Continue to the original account, claim or admin destination.

Only the account password changes. Memberships, school scope and website-owner
access remain assigned to the same user ID. Requesting a reset does not create
accounts or change an existing password until the new password is submitted.
The recovery session remains signed in after success. Session lifetime and
revocation follow the Supabase project's Auth policy; this feature does not
claim to invalidate every previously issued access token.

## Hosted configuration

No database migration, owner bootstrap rerun, extra environment variable or
service-role key is needed for password reset. Deploy the PR and retain working
Supabase email delivery and the existing PKCE callback configuration:

- Application `NEXT_PUBLIC_SITE_URL` and Supabase **Authentication → URL
  Configuration → Site URL**: `https://www.lost-link.me`.
- Allowed redirect URLs: `https://www.lost-link.me/auth/callback` and
  `https://www.lost-link.me/auth/callback?next=**`.
- Supabase **Reset Password** email template must retain its `{{ .ConfirmationURL }}`
  link. Do not replace it with a fixed application URL or an implicit/hash flow.
- Auth email delivery/SMTP must allow the intended recipients. Supabase enforces
  email and request throttling; default SMTP restrictions can prevent delivery.

Recovery uses the same allowlisted callback path as signup and confirmation.
The validated continuation is the first query parameter; `recovery=1` and the
SDK's `sb_flow_id` remain inside the exact-origin callback query wildcard.
The recovery flag alone does not authorize changing a password.

If a link is expired, used, missing its browser verifier or opened in another
browser, request a fresh link on `/forgot-password`. Wait at least a minute
between requests. Unknown email addresses receive the same generic status as
known addresses and are never registered. A generic “requested” status does
not establish email delivery; inspect the provider's Auth/email logs if mail
does not arrive. Never share passwords, verification links or access tokens.

## Implementation and verification

- `/api/auth/forgot-password` accepts a bounded same-origin email form and calls
  `resetPasswordForEmail` with PKCE and per-request verifier slots. A throttled
  browser retry cannot discard the verifier for an earlier email. A one-minute
  HttpOnly cooldown stores only the last address's hash and expiry; it prevents
  accidental repeat requests from replacing the provider's pending challenge.
  This is a browser UX guard, not a shared abuse limiter; Auth's rate limits
  remain authoritative.
- `/auth/callback` exchanges the code and recognizes the SDK's recovery result.
  It issues a 15-minute HttpOnly, SameSite=Lax (Secure on HTTPS) form grant bound
  by HMAC to the exact session token, user and safe destination. The grant holds
  no password or bearer token and requires no added server secret.
- `/reset-password` and `/api/auth/reset-password` verify the user against Auth
  and validate the grant on every request. A normal sign-in session alone,
  forged flag or unauthenticated request cannot open/submit the reset form.
  Supabase still independently authorizes updating the current user's password.
- Input fields cannot assign identity, email, roles or metadata. Passwords are
  confirmed, bounded, never put in URLs or redisplayed after validation errors.
  Responses and documents are private/no-store; CSP and HttpOnly sessions remain.
- Success removes the recovery grant. Reused callbacks or another submission
  require a fresh recovery flow. Signup and confirmation callbacks keep their
  existing behavior.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then
`npm run test:password-reset` against the running local Supabase stack. The last
command uses real local mail, Auth and Chromium, four temporary account roles,
old/new password sign-in, unchanged ownership/memberships, denial/replay checks
and responsive axe checks. Its randomly generated fixtures exist only in a
private temporary file and are cleaned up afterwards. CI runs it after the
existing persisted Auth, product and admin suites.

Local/CI tests do not establish actual hosted email delivery or a founder's
successful password reset; those require a real account/browser acceptance run.
