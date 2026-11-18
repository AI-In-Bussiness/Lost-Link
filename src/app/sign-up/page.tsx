import Link from "next/link";
import { cookies } from "next/headers";
import { pendingSignupEmailCookie } from "@/lib/auth/confirmation";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";
import ResendConfirmationForm from "../resend-confirmation/form";
import PaperFrame from "../paper-frame";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; returnTo?: string; next?: string }> }) {
  const { error, status, returnTo, next } = await searchParams;
  const destination = safeReturnPath(returnTo ?? next);
  const configured = !!supabaseConfiguration();
  const signIn = `/sign-in?next=${encodeURIComponent(destination)}`;
  const email = (await cookies()).get(pendingSignupEmailCookie)?.value || "";
  const errors: Record<string, string> = {
    invalid: "Enter a valid email address and a password of 12 to 256 characters.",
    "rate-limit": "Too many sign-up attempts. Please wait a few minutes and try again.",
    disabled: "Account registration is currently unavailable. Please contact the LostLink team.",
    "email-delivery": "Confirmation email delivery is not available for this address. Please contact the LostLink team.",
    unavailable: "Unable to create an account right now. Please try again later.",
  };
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
    <p className="eyebrow">A place for your belongings</p>
    <h1>Create an account</h1>
    <p>Sign up to claim your belongings and track your requests. Staff access is assigned separately by your organization.</p>
    </section>
    {!configured ? <p role="status" className="notice">Sign-up is unavailable until Supabase is configured.</p> : status === "sent" ? <section>
      <h2>Check your email</h2>
      <p role="status" className="notice">If this address has an unconfirmed account, we have requested a confirmation link. Check your inbox and spam folder, then open the newest link in this browser.</p>
      <p>If you opened a confirmation link earlier, your email may already be confirmed. Try signing in with your original password. Registering again does not change an existing account or its password.</p>
      <ResendConfirmationForm email={email} next={destination} />
    </section> : <form method="post" action="/api/auth/sign-up" className="paper-form stack">
      {error && <p role="alert" className="error-summary">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <label className="field">Email<input name="email" type="email" autoComplete="email" defaultValue={email} maxLength={254} required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} aria-describedby="password-help" required /></label>
      <p id="password-help">Use at least 12 characters.</p>
      <input type="hidden" name="next" value={destination} />
      <button className="button" type="submit">Create account</button>
    </form>}
    <p>Already have an account? <Link href={signIn} className="text-link">Sign in</Link></p>
  </main></PaperFrame>;
}
