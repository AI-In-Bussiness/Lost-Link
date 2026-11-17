import type { ReactNode } from "react";
import Link from "next/link";
import LegalLinks from "./legal-links";

/** The native account, administration and policy pages share the notebook shell. */
export default function PaperFrame({ children, owner = false }: { children: ReactNode; owner?: boolean }) {
  return (
    <div className="paper-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="LostLink home">
            <span className="brand-mark" aria-hidden="true">
              <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Lost<span>Link</span><span className="brand-dot" aria-hidden="true">.</span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link href="/">Find an item</Link>
            <Link href="/my/claims">My claims</Link>
            <Link href="/account">Your account</Link>
            {owner && <Link href="/admin" aria-current="page">Website administration</Link>}
          </nav>
          {owner && <form action="/api/auth/sign-out" method="post"><button className="plain" type="submit">Sign out</button></form>}
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand small" href="/">LostLink.</Link>
          <p>School lost &amp; found</p>
          <LegalLinks />
          <span>Staff verify every return.</span>
        </div>
      </footer>
    </div>
  );
}
