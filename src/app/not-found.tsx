import Link from 'next/link';
import PaperFrame from './paper-frame';

export default function NotFound() {
  return <PaperFrame><main id="main" className="paper-page paper-page-narrow card">
    <section className="page-heading">
    <p className="eyebrow">404 · A loose page</p>
    <h1>Page not found</h1>
    <p>Check the address or return to LostLink.</p>
    </section>
    <Link className="button" href="/">Go home <span aria-hidden="true">↗</span></Link>
  </main></PaperFrame>;
}
