import Link from 'next/link';

export default function LegalLinks() {
  return <nav className="legal-links" aria-label="Policies">
    <Link href="/privacy">Privacy policy</Link>
    <Link href="/terms">Terms and conditions</Link>
  </nav>;
}
