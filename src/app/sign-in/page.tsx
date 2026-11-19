import { safeReturnPath } from "@/lib/auth/security";
import Link from "next/link";
import { supabaseConfiguration } from "@/lib/supabase/server";
import PaperFrame from "../paper-frame";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; next?: string }> }) {
  const { error, returnTo, next } = await searchParams;
  const destination = safeReturnPath(returnTo ?? next);
  const configured = !!supabaseConfiguration();
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
    <p className="eyebrow">Your way back</p>
    <h1>Sign in</h1>
    <p>Use your confirmed LostLink account.</p>
    </section>
    {!configured ? <p role="status" className="notice">Sign-in is unavailable until Supabase is configured.</p> : <form method="post" action="/api/auth/sign-in" className="paper-form stack">
      {error && <p role="alert" className="error-summary">{error === "confirmation" ? "This confirmation link has expired, was already used, or was opened in a different browser. Try signing in if your email is confirmed. You can request a new link from the Check your email screen after signing up." : error === "unconfirmed" ? "Confirm your email using the link we sent before signing in. You can request a new link from the Check your email screen after signing up." : error === "unavailable" ? "Sign-in is temporarily unavailable. Please try again." : "Unable to sign in. Check your details and try again."}</p>}
      <label className="field">Email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label>
      <input type="hidden" name="next" value={destination} />
      <button className="button" type="submit">Sign in</button>
    </form>}
    <p><Link href={`/forgot-password?next=${encodeURIComponent(destination)}`} className="text-link">Forgot your password?</Link></p>
    <p>New to LostLink? <Link href={`/sign-up?next=${encodeURIComponent(destination)}`} className="text-link">Create an account</Link></p>
  </main></PaperFrame>;
}
