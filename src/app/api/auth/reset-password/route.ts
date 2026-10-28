import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { newPasswordFromForm, recoveryCookie, recoveryCookieOptions } from "@/lib/auth/recovery";
import { getRecoverySession } from "@/lib/auth/recovery-session";
import { isSameOrigin, readAuthForm, siteOrigin } from "@/lib/auth/security";

export async function POST(request: NextRequest) {
  const origin = siteOrigin();
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOrigin(request.headers.get("origin"), origin)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request origin is not allowed." } }, { status: 403, headers });
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin), { status: 303, headers });
  try {
    const recovery = await getRecoverySession();
    if (!recovery) return redirect("/forgot-password?error=link");
    const suffix = `&next=${encodeURIComponent(recovery.next)}`;
    const form = await readAuthForm(request);
    const password = form ? newPasswordFromForm(form) : "invalid";
    if (typeof password === "string") return redirect(`/reset-password?error=${password}${suffix}`);
    // Only the verified account's password can change. No email, user ID,
    // metadata, memberships or administrative credentials are accepted here.
    const { error } = await recovery.client.auth.updateUser(password);
    if (error) {
      const code = error.code === "same_password" ? "same" : error.code === "weak_password" ? "weak" : error.status === 429 ? "rate-limit" : "unavailable";
      return redirect(`/reset-password?error=${code}${suffix}`);
    }
    (await cookies()).set(recoveryCookie, "", { ...recoveryCookieOptions(origin), maxAge: 0 });
    return redirect(`/reset-password?status=updated${suffix}`);
  } catch { return redirect("/reset-password?error=unavailable"); }
}
