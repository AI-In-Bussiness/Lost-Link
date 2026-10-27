import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pendingSignupCookieOptions, pendingSignupEmailCookie } from "@/lib/auth/confirmation";
import { credentialsFromForm, isSameOrigin, readAuthForm, safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  if (!isSameOrigin(request.headers.get("origin"), origin)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  const form = await readAuthForm(request);
  const credentials = form && credentialsFromForm(form);
  const next = safeReturnPath(form?.get("next"));
  const failed = (reason: string) => new URL("/sign-in?error=" + reason + "&next=" + encodeURIComponent(next), origin);
  if (!credentials) return NextResponse.redirect(failed("invalid"), { status: 303, headers: { "Cache-Control": "private, no-store" } });
  const client = await createSupabaseServerClient();
  if (!client) return NextResponse.redirect(failed("unavailable"), { status: 303, headers: { "Cache-Control": "private, no-store" } });
  try {
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error?.code === "email_not_confirmed") {
      (await cookies()).set(pendingSignupEmailCookie, credentials.email, pendingSignupCookieOptions(origin));
      return NextResponse.redirect(failed("unconfirmed"), { status: 303, headers: { "Cache-Control": "private, no-store" } });
    }
    if (error) return NextResponse.redirect(failed("invalid"), { status: 303, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.redirect(new URL(safeReturnPath(form!.get("next")), origin), { status: 303, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.redirect(failed("unavailable"), { status: 303, headers: { "Cache-Control": "private, no-store" } });
  }
}
