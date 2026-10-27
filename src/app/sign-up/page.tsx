import Link from "next/link";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; returnTo?: string; next?: string }> }) {
  const { error, status, returnTo, next } = await searchParams;
  const destination = safeReturnPath(returnTo ?? next);
  const configured = !!supabaseConfiguration();
  const signIn = `/sign-in?next=${encodeURIComponent(destination)}`;
  const errors: Record<string, string> = {
    invalid: "Enter a valid email address and a password of 12 to 256 characters.",
    "rate-limit": "Too many sign-up attempts. Please wait a few minutes and try again.",
    unavailable: "Unable to create an account right now. Please try again later.",
  };
  return <main id="main" className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">Create an account</h1>
    <p className="mt-3">Sign up to claim your belongings and track your requests. Staff access is assigned separately by your organization.</p>
    {!configured ? <p role="status" className="mt-6">Sign-up is unavailable until Supabase is configured.</p> : status === "sent" ? <section role="status" className="mt-6">
      <h2 className="text-xl font-semibold">Check your email</h2>
      <p>If this address can be registered, we have sent a confirmation link. Open it in this browser to finish signing up. If you already have an account, sign in instead.</p>
    </section> : <form method="post" action="/api/auth/sign-up" className="mt-8 grid gap-4">
      {error && <p role="alert">{errors[error] ?? errors.unavailable}</p>}
      <label className="grid gap-1">Email<input name="email" type="email" autoComplete="email" maxLength={254} required className="rounded border p-3" /></label>
      <label className="grid gap-1">Password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} aria-describedby="password-help" required className="rounded border p-3" /></label>
      <p id="password-help">Use at least 12 characters.</p>
      <input type="hidden" name="next" value={destination} />
      <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Create account</button>
    </form>}
    <p className="mt-6">Already have an account? <Link href={signIn} className="underline">Sign in</Link></p>
  </main>;
}
