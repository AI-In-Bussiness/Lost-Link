import Link from "next/link";
import { cookies } from "next/headers";
import { pendingSignupEmailCookie } from "@/lib/auth/confirmation";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";
import ResendConfirmationForm from "../resend-confirmation/form";
import LegalLinks from '../legal-links';

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
  return <main id="main" className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">Create an account</h1>
    <p className="mt-3">Sign up to claim your belongings and track your requests. Staff access is assigned separately by your organization.</p>
    {!configured ? <p role="status" className="mt-6">Sign-up is unavailable until Supabase is configured.</p> : status === "sent" ? <section className="mt-6">
      <h2 className="text-xl font-semibold">Check your email</h2>
      <p role="status">If this address has an unconfirmed account, we have requested a confirmation link. Check your inbox and spam folder, then open the newest link in this browser.</p>
      <p className="mt-3">If you opened a confirmation link earlier, your email may already be confirmed. Try signing in with your original password. Registering again does not change an existing account or its password.</p>
      <ResendConfirmationForm email={email} next={destination} />
    </section> : <form method="post" action="/api/auth/sign-up" className="mt-8 grid gap-4">
      {error && <p role="alert">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <label className="grid gap-1">Email<input name="email" type="email" autoComplete="email" defaultValue={email} maxLength={254} required className="rounded border p-3" /></label>
      <label className="grid gap-1">Password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} aria-describedby="password-help" required className="rounded border p-3" /></label>
      <p id="password-help">Use at least 12 characters.</p>
      <input type="hidden" name="next" value={destination} />
      <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Create account</button>
    </form>}
    <p className="mt-6">Already have an account? <Link href={signIn} className="underline">Sign in</Link></p>
    <LegalLinks />
  </main>;
}
