import Link from "next/link";
import { getRecoverySession } from "@/lib/auth/recovery-session";
import { safeReturnPath } from "@/lib/auth/security";
import LegalLinks from "../legal-links";

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
  return <main id="main" className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">{status === "updated" ? "Password updated" : "Choose a new password"}</h1>
    {status === "updated" ? <>
      <p role="status" className="mt-6">Your password has been changed. Use your new password the next time you sign in. Your account access is unchanged.</p>
      <p className="mt-6"><Link href={destination} className="underline">Continue to LostLink</Link></p>
    </> : unavailable ? <p role="alert" className="mt-6">Password reset is temporarily unavailable. Please try again later.</p> : !recovery ? <>
      <p role="alert" className="mt-6">Open a valid password reset link in the browser where you requested it. Reset links and this form expire; request a fresh link if needed.</p>
      <p className="mt-6"><Link href={`/forgot-password?next=${encodeURIComponent(destination)}`} className="underline">Request a new password reset link</Link></p>
    </> : <>
      <p className="mt-3" id="password-guidance">Use 12–256 characters. Choose a unique LostLink password. Complete this form within 15 minutes.</p>
      {error && <p role="alert" className="mt-6">{Object.hasOwn(errors, error) ? errors[error] : errors.unavailable}</p>}
      <form method="post" action="/api/auth/reset-password" className="mt-8 grid gap-4">
        <label className="grid gap-1">New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} aria-describedby="password-guidance" required className="rounded border p-3" /></label>
        <label className="grid gap-1">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={256} required className="rounded border p-3" /></label>
        <button type="submit" className="rounded bg-slate-900 px-4 py-3 text-white">Save new password</button>
      </form>
    </>}
    <p className="mt-6"><Link href={`/sign-in?next=${encodeURIComponent(destination)}`} className="underline">Back to sign in</Link></p>
    <LegalLinks />
  </main>;
}
