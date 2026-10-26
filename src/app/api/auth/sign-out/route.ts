import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  if (!isSameOrigin(request.headers.get("origin"), origin)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  const client = await createSupabaseServerClient();
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return NextResponse.json({ error: { code: "UNAVAILABLE", message: "Sign out failed. Please try again." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.redirect(new URL("/sign-in", origin), { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
