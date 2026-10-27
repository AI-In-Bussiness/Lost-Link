import { NextRequest, NextResponse } from "next/server";
import { confirmationCode } from "@/lib/auth/confirmation";
import { safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const failed = () => NextResponse.redirect(new URL(`/sign-in?error=confirmation&next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
  const confirmation = confirmationCode(request.nextUrl.searchParams);
  if (!confirmation) return failed();
  try {
    const client = await createSupabaseServerClient();
    if (!client) return failed();
    const { error } = await client.auth.exchangeCodeForSession(confirmation.code, confirmation.flowId ? { flowId: confirmation.flowId } : undefined);
    if (error) return failed();
    return NextResponse.redirect(new URL(next, origin), { status: 303, headers });
  } catch {
    return failed();
  }
}
