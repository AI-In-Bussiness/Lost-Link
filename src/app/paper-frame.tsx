import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import LegalLinks from "./legal-links";
import PaperMotion from "./paper-motion";

/** The native account, administration and policy pages share the notebook shell. */
export default function PaperFrame({ children, owner = false, account = false }: { children: ReactNode; owner?: boolean; account?: boolean }) {
  return (
    <PaperMotion>
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
            <Link href="/account" aria-current={account ? "page" : undefined}>Your account</Link>
            {owner && <Link href="/admin" aria-current="page">Website administration</Link>}
          </nav>
          {owner && <form className="account" action="/api/auth/sign-out" method="post"><button className="plain" type="submit">Sign out</button></form>}
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand small" href="/"><span className="brand-mark" aria-hidden="true"><Image src="/icon.svg?brand=notebook-v1" width={40} height={40} alt="" unoptimized /></span>LostLink.</Link>
          <p>School lost &amp; found</p>
          <LegalLinks />
          <span>Staff verify every return.</span>
          <button className="motion-toggle plain" type="button" aria-pressed="false" hidden>Pause animations</button>
        </div>
      </footer>
    </PaperMotion>
  );
}

/** Unavailable and access-denied states share the standard page heading and card. */
export function PaperMessage({ title, children }: { title: string; children: ReactNode }) {
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
      <p className="eyebrow">A note from LostLink</p>
      <h1>{title}</h1>
    </section>
    {children}
  </main></PaperFrame>;
}
