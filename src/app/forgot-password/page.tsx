import Link from "next/link";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";
import PaperFrame from "../paper-frame";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; next?: string }> }) {
  const { error, status, next } = await searchParams;
  const destination = safeReturnPath(next);
  const errors: Record<string, string> = {
    invalid: "Enter a valid email address.",
    link: "This password reset link has expired, was already used, or was opened in a different browser. Request a new link and open it in this browser.",
    "rate-limit": "Too many requests. Please wait a few minutes before trying again.",
    "email-delivery": "Password reset email delivery is unavailable for this address. Please contact the LostLink team.",
    unavailable: "We could not request a password reset email right now. Please try again later.",
  };
  return <PaperFrame><main id="main" className="paper-page paper-page-body paper-page-narrow">
    <p className="eyebrow paper-page-eyebrow">Account recovery</p>
    <h1 className="paper-page-title">Reset your password</h1>
    <p className="mt-3">Enter the email address for your LostLink account. This works for personal, school staff, school admin and website-owner accounts.</p>
    {!supabaseConfiguration() ? <p role="status" className="mt-6">Password reset is unavailable until sign-in is configured.</p> : <>
      {status === "sent" && <p role="status" className="mt-6">If this address has an account, a password reset link has been requested. Check your inbox and spam folder. Open the newest link in this browser.</p>}
      {error && <p role="alert" className="mt-6">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <form method="post" action="/api/auth/forgot-password" className="paper-form stack">
        <label className="grid gap-1">Email<input name="email" type="email" autoComplete="username" maxLength={254} required className="paper-input" /></label>
        <input type="hidden" name="next" value={destination} />
        <button type="submit" className="button">Send password reset link</button>
        <p>Wait at least a minute between requests. Keep this browser open until you have changed your password.</p>
      </form>
    </>}
    <p className="mt-6"><Link href={`/sign-in?next=${encodeURIComponent(destination)}`} className="underline">Back to sign in</Link></p>
  </main></PaperFrame>;
}
