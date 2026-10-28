import Link from "next/link";
import { cookies } from "next/headers";
import { pendingSignupEmailCookie } from "@/lib/auth/confirmation";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";
import ResendConfirmationForm from "./form";
import LegalLinks from '../legal-links';

export const dynamic = "force-dynamic";

export default async function ResendConfirmationPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; next?: string }> }) {
  const { error, status, next } = await searchParams;
  const destination = safeReturnPath(next);
  const email = (await cookies()).get(pendingSignupEmailCookie)?.value || "";
  const errors: Record<string, string> = {
    invalid: "Enter a valid email address.",
    "rate-limit": "Too many confirmation emails have been requested. Please wait a few minutes before trying again.",
    "email-delivery": "Confirmation email delivery is not available for this address. Please contact the LostLink team.",
    disabled: "Account registration is currently unavailable. Please contact the LostLink team.",
    unavailable: "We could not request a confirmation email right now. Please try again later.",
  };
  return <main id="main" className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">Confirm your email</h1>
    <p className="mt-3">Request a new email link without creating another account. It confirms your email if needed, then signs you in.</p>
    {!supabaseConfiguration() ? <p role="status" className="mt-6">Confirmation email is unavailable until sign-in is configured.</p> : <>
      {status === "sent" && <p role="status" className="mt-6">If this address has an account, a new email link has been requested. Check your inbox and spam folder. If your email is already confirmed, the email may say “Sign in” or “Magic Link”. Your original password still works.</p>}
      {error && <p role="alert" className="mt-6">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <ResendConfirmationForm email={email} next={destination} />
    </>}
    <p className="mt-6"><Link href={`/sign-in?next=${encodeURIComponent(destination)}`} className="underline">Sign in</Link></p>
    <LegalLinks />
  </main>;
}
