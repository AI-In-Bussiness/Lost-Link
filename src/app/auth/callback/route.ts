import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { confirmationCode } from "@/lib/auth/confirmation";
import { createRecoveryGrant, recoveryCookie, recoveryCookieOptions } from "@/lib/auth/recovery";
import { safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const recovery = request.nextUrl.searchParams.get("recovery") === "1";
  const failed = () => NextResponse.redirect(new URL(`${recovery ? "/forgot-password?error=link" : "/sign-in?error=confirmation"}&next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
  const confirmation = confirmationCode(request.nextUrl.searchParams);
  if (!confirmation) return failed();
  try {
    const client = await createSupabaseServerClient();
    if (!client) return failed();
    const { data, error } = await client.auth.exchangeCodeForSession(confirmation.code, confirmation.flowId ? { flowId: confirmation.flowId } : undefined);
    if (error) return failed();
    if ("redirectType" in data && data.redirectType === "recovery" && data.session) {
      (await cookies()).set(recoveryCookie, createRecoveryGrant(data.session, next), recoveryCookieOptions(origin));
      return NextResponse.redirect(new URL(`/reset-password?next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
    }
    // A query flag alone can never authorize a password reset form.
    if (recovery) return failed();
    return NextResponse.redirect(new URL(next, origin), { status: 303, headers });
  } catch {
    return failed();
  }
}
