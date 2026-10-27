export default function ResendConfirmationForm({ email, next }: { email: string; next: string }) {
  return <form method="post" action="/api/auth/resend-confirmation" className="mt-6 grid gap-4">
    <label className="grid gap-1">Confirmation email address<input name="email" type="email" autoComplete="email" defaultValue={email} maxLength={254} required className="rounded border p-3" /></label>
    <input type="hidden" name="next" value={next} />
    <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Resend confirmation email</button>
    <p>Wait at least a minute between requests. Open the newest email link in this browser.</p>
  </form>;
}
