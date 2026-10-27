import { safeReturnPath } from "@/lib/auth/security";
import Link from "next/link";
import { supabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; next?: string }> }) {
  const { error, returnTo, next } = await searchParams;
  const destination = safeReturnPath(returnTo ?? next);
  const configured = !!supabaseConfiguration();
  return <main id="main" className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">Sign in</h1>
    <p className="mt-3">Use your confirmed LostLink account.</p>
    {!configured ? <p role="status" className="mt-6">Sign-in is unavailable until Supabase is configured.</p> : <form method="post" action="/api/auth/sign-in" className="mt-8 grid gap-4">
      {error && <p role="alert">{error === "confirmation" ? "This confirmation link has expired, was already used, or was opened in a different browser. Try signing in if your email is confirmed, or request a new link below." : error === "unconfirmed" ? "Confirm your email before signing in. You can request a new confirmation link below." : error === "unavailable" ? "Sign-in is temporarily unavailable. Please try again." : "Unable to sign in. Check your details and try again."}</p>}
      <label className="grid gap-1">Email<input name="email" type="email" autoComplete="username" maxLength={254} required className="rounded border p-3" /></label>
      <label className="grid gap-1">Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required className="rounded border p-3" /></label>
      <input type="hidden" name="next" value={destination} />
      <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Sign in</button>
    </form>}
    <p className="mt-6">New to LostLink? <Link href={`/sign-up?next=${encodeURIComponent(destination)}`} className="underline">Create an account</Link></p>
    <p className="mt-3"><Link href={`/resend-confirmation?next=${encodeURIComponent(destination)}`} className="underline">Resend confirmation email</Link></p>
  </main>;
}
