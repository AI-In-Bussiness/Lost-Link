import Link from "next/link";
import { getRecoverySession } from "@/lib/auth/recovery-session";
import { safeReturnPath } from "@/lib/auth/security";
import PaperFrame from "../paper-frame";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; next?: string }> }) {
  const { error, status, next } = await searchParams;
  const destination = safeReturnPath(next);
  let recovery = null;
  let unavailable = false;
  try { recovery = await getRecoverySession(); } catch { unavailable = true; }
  const errors: Record<string, string> = {
    invalid: "Use a password between 12 and 256 characters.",
    mismatch: "The passwords do not match. Enter the same new password in both fields.",
    same: "Choose a password different from your current password.",
    weak: "Choose a stronger password that meets the account password requirements.",
    "rate-limit": "Too many requests. Please wait a few minutes before trying again.",
    unavailable: "Your password could not be updated right now. Please try again.",
  };
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
    <p className="eyebrow">Account recovery</p>
    <h1>{status === "updated" ? "Password updated" : "Choose a new password"}</h1>
    </section>
    {status === "updated" ? <>
      <p role="status" className="notice">Your password has been changed. Use your new password the next time you sign in. Your account access is unchanged.</p>
      <p><Link href={destination} className="text-link">Continue to LostLink</Link></p>
    </> : unavailable ? <p role="alert" className="error-summary">Password reset is temporarily unavailable. Please try again later.</p> : !recovery ? <>
      <p role="alert" className="error-summary">Open a valid password reset link in the browser where you requested it. Reset links and this form expire; request a fresh link if needed.</p>
      <p><Link href={`/forgot-password?next=${encodeURIComponent(destination)}`} className="text-link">Request a new password reset link</Link></p>
    </> : <>
      <p id="password-guidance">Use 12–256 characters. Choose a unique LostLink password. Complete this form within 15 minutes.</p>
      {error && <p role="alert" className="error-summary">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <form method="post" action="/api/auth/reset-password" className="paper-form stack">
        <label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} aria-describedby="password-guidance" required /></label>
        <label className="field">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={256} required /></label>
        <button type="submit" className="button">Save new password</button>
      </form>
    </>}
    <p><Link href={`/sign-in?next=${encodeURIComponent(destination)}`} className="text-link">Back to sign in</Link></p>
  </main></PaperFrame>;
}
