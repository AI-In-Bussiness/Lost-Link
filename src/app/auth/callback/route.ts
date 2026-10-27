import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const failed = () => NextResponse.redirect(new URL(`/sign-in?error=confirmation&next=${encodeURIComponent(next)}`, origin), { status: 303, headers });
  const codes = request.nextUrl.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048 || request.nextUrl.searchParams.has("error")) return failed();
  try {
    const client = await createSupabaseServerClient();
    if (!client) return failed();
    const { error } = await client.auth.exchangeCodeForSession(codes[0]);
    if (error) return failed();
    return NextResponse.redirect(new URL(next, origin), { status: 303, headers });
  } catch {
    return failed();
  }
}
