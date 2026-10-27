# Repair email confirmation redirects

Resolved on 2026-10-27 after the task owner saved the dashboard settings below.
A fresh `auth:check` passes all three redirect cases on the public origin,
including the return-destination query. The instructions remain for future URL
changes; real-account/email sign-in is separate from this redirect diagnostic.

The deployed application origin is `https://lost-link-beta.vercel.app` and its
Supabase project is `ldhwtrxhmaanfcgmtsbp`. On 2026-10-27, public invalid-token
probes for `/auth/callback` and `/auth/callback?next=%2Faccount` both returned
HTTP 303 to `http://localhost:3000/`. A same-origin, empty sign-in POST returned
to the correct public application origin. This isolates the observed problem
to hosted Auth URL selection rather than email delivery or the app's origin.
The account may already be confirmed; the failed redirect alone cannot tell.

## Apply the hosted fix

In [Supabase Authentication → URL Configuration](https://supabase.com/dashboard/project/ldhwtrxhmaanfcgmtsbp/auth/url-configuration),
set **Site URL** to:

```text
https://lost-link-beta.vercel.app
```

Keep existing redirect entries and add these **Redirect URLs**:

```text
https://lost-link-beta.vercel.app/auth/callback
https://lost-link-beta.vercel.app/auth/callback?next=**
```

The second entry is needed because registration includes a validated `next`
query parameter in `emailRedirectTo`. Signup and resend also append the SDK's
`sb_flow_id` so each email uses its own browser verifier; `next=**` covers that
trailing parameter as well. Supabase matches the entire URL. An exact
callback entry alone does not cover that query. The wildcard covers the query
value on this exact callback and origin; it does not allow arbitrary hosts.
Save the settings. Keep email confirmation enabled. No database reset,
migration or app redeployment is needed for this provider configuration change.
Changing local `supabase/config.toml` does not change this hosted project.

Alternatively, with `SUPABASE_ACCESS_TOKEN` supplied through secure execution
environment settings, run:

```sh
npm run auth:configure -- https://lost-link-beta.vercel.app ldhwtrxhmaanfcgmtsbp
```

This reads the current settings, patches only `site_url` and `uri_allow_list`,
preserves existing redirect entries, reads back the result, then runs the public
redirect diagnostic. It is safe to rerun. Management tokens remain operator-only;
never place them in `NEXT_PUBLIC_*`, command arguments, Git or chat. The helper
does not print the full configuration, which may contain email-provider secrets.

If Vercel's application origin changes later, set `NEXT_PUBLIC_SITE_URL` to the
new exact HTTPS origin and rebuild/redeploy, then update these hosted Auth URLs.
The current deployed application's origin was already correct during diagnosis.

## Verify and recover

Run the credential-free check:

```sh
npm run auth:check -- https://lost-link-beta.vercel.app ldhwtrxhmaanfcgmtsbp
```

It tests the Site URL fallback, the bare callback and the callback with `next`.
All three must remain on the public origin with the expected path and return
destination. It uses intentionally invalid tokens, sends no email, creates no
accounts and never follows redirects or consumes a real confirmation link. A
nonzero exit detects this configuration regression. It does not establish that
a real account or session was verified.

Then test registration with a fresh test address on the iPhone. Open the email
in the same Safari browser used to register so its PKCE verifier cookie is
available. Confirm that the callback reaches the account or intended claim page.
For the previous account, try signing in first: Supabase may have confirmed it
before the bad redirect. If still unconfirmed or the old link is expired/used,
use **Resend confirmation email** from the check-email or sign-in screen and
use its newest link. The resend action sends confirmation for pending accounts
and an email sign-in link for confirmed accounts; it never creates an unknown
account or resets an existing password. With the original password, a
confirmed account can sign in through either sign-in or repeated registration.

The local regression suite is `npm run test:release`; Foundation CI runs it.
Live configuration repair requires authorized Supabase access. A passing local
test suite does not mean the hosted settings have been updated.
