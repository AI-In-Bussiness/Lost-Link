import { NextRequest, NextResponse } from 'next/server';
import { refreshSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Existing React layout styles use attributes, not executable content.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
  ].join('; ');
  // Overwrite client-supplied values. Next reads this request policy to nonce
  // its own scripts; the browser must receive the identical response policy.
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const securedRequest = new NextRequest(request, { headers });
  const response = request.nextUrl.pathname === '/sign-in' || /^\/account(?:\/|$)/.test(request.nextUrl.pathname)
    ? await refreshSession(securedRequest)
    : NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  // A cached document would reuse a nonce or mismatch its scripts and policy.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/|favicon\\.ico$|icon\\.svg$|design/|mock-assets/).*)'],
};
