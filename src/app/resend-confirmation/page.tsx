import Link from "next/link";
import { cookies } from "next/headers";
import { pendingSignupEmailCookie } from "@/lib/auth/confirmation";
import { safeReturnPath } from "@/lib/auth/security";
import { supabaseConfiguration } from "@/lib/supabase/server";
import ResendConfirmationForm from "./form";
import PaperFrame from "../paper-frame";

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
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
    <p className="eyebrow">One more step</p>
    <h1>Confirm your email</h1>
    <p>Request a new email link without creating another account. It confirms your email if needed, then signs you in.</p>
    </section>
    {!supabaseConfiguration() ? <p role="status" className="notice">Confirmation email is unavailable until sign-in is configured.</p> : <>
      {status === "sent" && <p role="status" className="notice">If this address has an account, a new email link has been requested. Check your inbox and spam folder. If your email is already confirmed, the email may say “Sign in” or “Magic Link”. Your original password still works.</p>}
      {error && <p role="alert" className="error-summary">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <ResendConfirmationForm email={email} next={destination} />
    </>}
    <p><Link href={`/sign-in?next=${encodeURIComponent(destination)}`} className="text-link">Sign in</Link></p>
  </main></PaperFrame>;
}
