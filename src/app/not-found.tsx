import Link from 'next/link';
import PaperFrame from './paper-frame';

export default function NotFound() {
  return <PaperFrame><main id="main" className="paper-page paper-page-body paper-page-narrow">
    <p className="eyebrow paper-page-eyebrow">404 · A loose page</p>
    <h1 className="paper-page-title">Page not found</h1>
    <p>Check the address or return to LostLink.</p>
    <Link className="button" href="/">Go home <span aria-hidden="true">↗</span></Link>
  </main></PaperFrame>;
}
