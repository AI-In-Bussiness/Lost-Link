import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { confirmationCallback, pendingSignupCookieOptions, pendingSignupEmailCookie, registrationError } from "@/lib/auth/confirmation";
import { isSameOrigin, readAuthForm, safeReturnPath, signupCredentialsFromForm, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOrigin(request.headers.get("origin"), origin)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers });
  }
  const form = await readAuthForm(request);
  const credentials = form && signupCredentialsFromForm(form);
  const next = safeReturnPath(form?.get("next"));
  const destination = (query: string) => new URL(`/sign-up?${query}&next=${encodeURIComponent(next)}`, origin);
  const failed = (reason: string) => NextResponse.redirect(destination(`error=${reason}`), { status: 303, headers });
  if (!credentials) return failed("invalid");
  try {
    (await cookies()).set(pendingSignupEmailCookie, credentials.email, pendingSignupCookieOptions(origin));
    const client = await createSupabaseServerClient();
    if (!client) return failed("unavailable");
    // No role, membership or privileged key is accepted by this route.
    const { data, error } = await client.auth.signUp({
      ...credentials,
      options: { emailRedirectTo: confirmationCallback(origin, next) },
    });
    // Supabase masks confirmed duplicates with an empty identities list (or
    // user_already_exists). Authenticate with the supplied password rather than
    // leaving an existing account waiting for an email that will not be sent.
    // Failed authentication keeps the same generic response as new registration.
    if (error?.code === "user_already_exists" || (!error && data.user?.identities?.length === 0)) {
      const { error: signInError } = await client.auth.signInWithPassword(credentials);
      if (!signInError) return NextResponse.redirect(new URL(next, origin), { status: 303, headers });
      return NextResponse.redirect(destination("status=sent"), { status: 303, headers });
    }
    if (error) {
      return failed(registrationError(error));
    }
    // Projects that disable confirmation return a session immediately.
    if (data.session) return NextResponse.redirect(new URL(next, origin), { status: 303, headers });
    return NextResponse.redirect(destination("status=sent"), { status: 303, headers });
  } catch {
    return failed("unavailable");
  }
}
