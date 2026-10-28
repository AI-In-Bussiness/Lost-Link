import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registrationError } from "@/lib/auth/confirmation";
import { isRecoveryCoolingDown, recoveryCallback, recoveryCookieOptions, recoveryRequestCookie, recoveryRequestInterval, recoveryRequestMarker } from "@/lib/auth/recovery";
import { confirmationEmailFromForm, isSameOrigin, readAuthForm, safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOrigin(request.headers.get("origin"), origin)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers });
  const form = await readAuthForm(request);
  const email = form && confirmationEmailFromForm(form);
  const next = safeReturnPath(form?.get("next"));
  const redirect = (query: string) => NextResponse.redirect(new URL(`/forgot-password?${query}&next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
  if (!email) return redirect("error=invalid");
  try {
    const cookieStore = await cookies();
    // Some Auth versions replace the recovery challenge even on a throttled
    // repeat. Avoid burning the email already sent on an accidental double
    // request. This browser cooldown supplements Auth's actual rate limiting.
    if (isRecoveryCoolingDown(cookieStore.get(recoveryRequestCookie)?.value, email)) return redirect("error=rate-limit");
    const client = await createSupabaseServerClient();
    if (!client) return redirect("error=unavailable");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: recoveryCallback(origin, next) });
    if (error && error.code !== "user_not_found") return redirect(`error=${registrationError(error)}`);
    cookieStore.set(recoveryRequestCookie, recoveryRequestMarker(email), { ...recoveryCookieOptions(origin), maxAge: recoveryRequestInterval });
    // Identical response for unknown accounts. Recovery never enrolls a user.
    return redirect("status=sent");
  } catch { return redirect("error=unavailable"); }
}
