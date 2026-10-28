import { siteOrigin } from '../auth/security';

/** Classify configured keys only; Auth still verifies every user's identity. */
function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role === 'anon';
  } catch { return false; }
}

export function publicSupabaseConfiguration(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
) {
  if (!url || !key) return null;
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error('Supabase URL must be a valid origin.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (!['http:', 'https:'].includes(parsed.protocol) || (!local && parsed.protocol !== 'https:') ||
    parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Supabase URL must be an HTTPS origin (HTTP is allowed for loopback development).');
  }
  // A misplaced service-role/secret key must never become the public client's
  // fallback identity or a NEXT_PUBLIC_ value available for browser bundling.
  if (!isPublicKey(key)) throw new Error('Public Supabase configuration requires a publishable or anon key.');
  return { url: parsed.origin, key };
}

export function sessionCookieOptions(origin = process.env.NEXT_PUBLIC_SITE_URL) {
  // This app uses server-only Supabase clients and same-origin HTTP endpoints;
  // browser JavaScript never needs to read its access or refresh tokens.
  return { httpOnly: true, secure: new URL(siteOrigin(origin)).protocol === 'https:', sameSite: 'lax' as const, path: '/' };
}
