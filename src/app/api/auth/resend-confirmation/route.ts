import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { confirmationCallback, pendingSignupCookieOptions, pendingSignupEmailCookie, registrationError } from "@/lib/auth/confirmation";
import { confirmationEmailFromForm, isSameOrigin, readAuthForm, safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOrigin(request.headers.get("origin"), origin)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers });
  const form = await readAuthForm(request);
  const email = form && confirmationEmailFromForm(form);
  const next = safeReturnPath(form?.get("next"));
  const redirect = (query: string) => NextResponse.redirect(new URL(`/resend-confirmation?${query}&next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
  if (!email) return redirect("error=invalid");
  try {
    (await cookies()).set(pendingSignupEmailCookie, email, pendingSignupCookieOptions(origin));
    const client = await createSupabaseServerClient();
    if (!client) return redirect("error=unavailable");
    // Auth's /resend endpoint still emits implicit links on supported server
    // versions. /otp supports PKCE: it sends confirmation for a pending account
    // or a sign-in link for a confirmed one, preserving the original password.
    // Never enroll a new account through this email-only recovery endpoint.
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: confirmationCallback(origin, next) } });
    if (error && !["otp_disabled", "user_not_found", "user_already_exists"].includes(error.code || "")) return redirect(`error=${registrationError(error)}`);
    // Never disclose whether the submitted address has an account.
    return redirect("status=sent");
  } catch {
    return redirect("error=unavailable");
  }
}
