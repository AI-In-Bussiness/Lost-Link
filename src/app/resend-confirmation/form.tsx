export default function ResendConfirmationForm({ email, next }: { email: string; next: string }) {
  return <form method="post" action="/api/auth/resend-confirmation" className="paper-form stack">
    <label className="grid gap-1">Confirmation email address<input name="email" type="email" autoComplete="email" defaultValue={email} maxLength={254} required className="paper-input" /></label>
    <input type="hidden" name="next" value={next} />
    <button className="button" type="submit">Resend confirmation email</button>
    <p>Wait at least a minute between requests. Open the newest email link in this browser.</p>
  </form>;
}
