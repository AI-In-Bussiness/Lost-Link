import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import LegalLinks from "./legal-links";

/** The native account, administration and policy pages share the notebook shell. */
export default function PaperFrame({ children, owner = false }: { children: ReactNode; owner?: boolean }) {
  return (
    <div className="paper-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="LostLink home">
            <span className="brand-mark" aria-hidden="true"><Image src="/icon.svg?brand=notebook-v1" width={40} height={40} alt="" unoptimized /></span>
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
          <Link className="brand small" href="/"><span className="brand-mark" aria-hidden="true"><Image src="/icon.svg?brand=notebook-v1" width={40} height={40} alt="" unoptimized /></span>LostLink.</Link>
          <p>School lost &amp; found</p>
          <LegalLinks />
          <span>Staff verify every return.</span>
        </div>
      </footer>
    </div>
  );
}
