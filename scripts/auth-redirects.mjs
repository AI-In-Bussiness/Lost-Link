import { pathToFileURL } from 'node:url';
import { releaseOrigin } from './release-smoke.mjs';

function hostedOrigin(value) {
  const origin = releaseOrigin(value);
  const url = new URL(origin);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost')) {
    throw new Error('Supply the deployed HTTPS application origin.');
  }
  return origin;
}
function projectOrigin(projectRef) {
  if (!/^[a-z0-9]{20}$/.test(projectRef || '')) throw new Error('Supply the intended Supabase project reference.');
  return `https://${projectRef}.supabase.co`;
}
export function authUrlConfiguration(current, value) {
  const origin = hostedOrigin(value);
  if (current.uri_allow_list != null && typeof current.uri_allow_list !== 'string') throw new Error('Unexpected Supabase redirect configuration.');
  const urls = (current.uri_allow_list || '').split(',').map(url => url.trim()).filter(Boolean);
  // Supabase compares the whole URL, including the validated next-path query.
  // Keep the wildcard within this exact origin and callback path.
  urls.push(`${origin}/auth/callback`, `${origin}/auth/callback?next=**`);
  return { site_url: origin, uri_allow_list: [...new Set(urls)].join(',') };
}

// Invalid tokens exercise Auth's redirect selection without registering users,
// sending email, consuming a real confirmation link or following the redirect.
export async function checkAuthRedirects(value, projectRef, fetcher = fetch) {
  const origin = hostedOrigin(value);
  const authOrigin = projectOrigin(projectRef);
  const checks = [];
  for (const callback of [null, '/auth/callback', '/auth/callback?next=%2Fmy%2Fclaims']) {
    const expected = new URL(callback || '/', origin);
    const url = new URL('/auth/v1/verify', authOrigin);
    url.search = new URLSearchParams({ token: 'invalid-lostlink-redirect-check', type: 'signup', ...(callback ? { redirect_to: expected.href } : {}) }).toString();
    const row = { name: callback || 'Site URL fallback', passed: false, status: null, redirectOrigin: null, redirectPath: null };
    try {
      const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      row.status = response.status;
      const location = response.headers.get('location');
      const target = location ? new URL(location) : null;
      row.redirectOrigin = target?.origin || null;
      row.redirectPath = target?.pathname || null;
      row.passed = response.status === 303 && target?.origin === origin && target.pathname === expected.pathname && target.searchParams.get('next') === expected.searchParams.get('next');
      await response.body?.cancel();
    } catch { /* Never expose response bodies, confirmation parameters or transport errors. */ }
    checks.push(row);
  }
  return { check: 'hosted-auth-redirects', origin, projectRef, passed: checks.every(row => row.passed), checks };
}

export async function configureAuthRedirects(value, projectRef, token, fetcher = fetch) {
  const origin = hostedOrigin(value);
  projectOrigin(projectRef);
  if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN securely in the execution environment; never pass it as an argument.');
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  async function request(method, body) {
    let response;
    try {
      response = await fetcher(url, {
        method, redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error(`Supabase configuration ${method} could not connect.`); }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Supabase configuration ${method} failed (HTTP ${response.status}).`);
    }
    try { return await response.json(); }
    catch { throw new Error(`Supabase configuration ${method} returned an invalid response.`); }
  }
  const current = await request('GET');
  const desired = authUrlConfiguration(current, origin);
  const changed = Object.entries(desired).some(([key, value]) => current[key] !== value);
  if (changed) await request('PATCH', desired);
  const actual = changed ? await request('GET') : current;
  if (actual.site_url !== desired.site_url || actual.uri_allow_list !== desired.uri_allow_list) throw new Error('Supabase URL configuration readback did not match; check for concurrent changes.');
  // Never return the full management response: it can contain SMTP secrets.
  return { changed, siteUrl: origin, projectRef, verified: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, origin, projectRef, ...extra] = process.argv.slice(2);
    if (!['check', 'configure'].includes(command) || !origin || !projectRef || extra.length) throw new Error('Usage: auth-redirects.mjs check|configure <https-site-origin> <supabase-project-ref>');
    if (command === 'configure') console.log(JSON.stringify(await configureAuthRedirects(origin, projectRef, process.env.SUPABASE_ACCESS_TOKEN)));
    const report = await checkAuthRedirects(origin, projectRef);
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
