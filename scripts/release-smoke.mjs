import { pathToFileURL } from 'node:url';

const schools = [
  { slug: 'maple-school', id: '10000000-0000-4000-8000-000000000001', item: '20000000-0000-4000-8000-000000000001', query: 'black athletic backpack' },
  { slug: 'cedar-school', id: '10000000-0000-4000-8000-000000000002', item: '20000000-0000-4000-8000-000000000002', query: 'blue water bottle' },
];
const privateFields = new Set(['identifyingDetails', 'storageLocation', 'evidenceText', 'privateNote', 'claimantId', 'identifying_details', 'storage_location', 'evidence_text', 'private_note', 'claimant_id']);
function requireCheck(value, reason) { if (!value) throw new Error(reason); }
function publicProjection(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    requireCheck(!privateFields.has(key), 'private field present in public response');
    publicProjection(child);
  }
}
export function releaseOrigin(value) {
  const url = new URL(value);
  requireCheck(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'Supply an origin without credentials, path, query or fragment');
  requireCheck(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)), 'Remote release checks require HTTPS');
  return url.origin;
}
export async function releaseSmoke(value, fetcher = fetch) {
  const origin = releaseOrigin(value);
  const checks = [];
  const modes = {};
  async function check(name, path, status, verify, init = {}) {
    let actualStatus = null;
    try {
      const response = await fetcher(new URL(path, origin), { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      actualStatus = response.status;
      requireCheck(actualStatus === status, `expected HTTP ${status}`);
      requireCheck(response.headers.get('x-content-type-options') === 'nosniff', 'missing nosniff header');
      requireCheck(response.headers.get('x-frame-options') === 'DENY', 'missing frame protection');
      if (path.startsWith('/api/')) requireCheck(/(?:^|,)\s*no-store\s*(?:,|$)/.test(response.headers.get('cache-control') || ''), 'API response must not be stored');
      // Bound diagnostic reads and never print bodies, headers, cookies or transport errors.
      const reader = response.body?.getReader();
      const chunks = [];
      let bytes = 0;
      if (reader) {
        try {
          for (;;) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            bytes += chunk.byteLength;
            requireCheck(bytes <= 1024 * 1024, 'response exceeds diagnostic limit');
            chunks.push(chunk);
          }
        } finally { void reader.cancel().catch(() => {}); }
      }
      const body = Buffer.concat(chunks).toString('utf8');
      const json = path.startsWith('/api/') && status !== 303;
      if (json) requireCheck(response.headers.get('content-type')?.includes('application/json'), 'expected JSON content type');
      await verify(json ? JSON.parse(body) : body, response);
      checks.push({ name, path, status: actualStatus, passed: true });
    } catch {
      // A fixed diagnostic avoids accidental disclosure from upstream exception/body text.
      checks.push({ name, path, status: actualStatus, passed: false, reason: 'Unexpected status, response contract, security header or network failure' });
    }
  }
  for (const path of ['/', '/sign-in']) await check('public page', path, 200, body => requireCheck(body.includes('LostLink'), 'application HTML missing'));
  for (const school of schools) {
    const base = `/api/v1/organizations/${school.slug}`;
    await check('published school', base, 200, body => {
      requireCheck(body.data?.slug === school.slug && body.data?.id === school.id, 'unexpected school');
      publicProjection(body);
    });
    const items = body => {
      requireCheck(Array.isArray(body.data), 'expected items');
      requireCheck(body.data.every(row => (row.item || row).organizationSlug === school.slug), 'wrong-school item');
      publicProjection(body);
    };
    await check('public inventory', `${base}/items?limit=50`, 200, body => {
      items(body);
      requireCheck(body.data.some(row => row.id === school.item), 'showcase item unavailable');
    });
    await check('showcase item', `${base}/items/${school.item}`, 200, body => {
      requireCheck(body.data?.id === school.item && body.data?.organizationSlug === school.slug, 'unexpected item');
      publicProjection(body);
    });
    await check('scoped search', `${base}/search`, 200, body => {
      items(body);
      requireCheck(body.data.slice(0, 3).some(row => row.item?.id === school.item), 'showcase not in top three');
      requireCheck(['structured', 'hybrid'].includes(body.search?.mode) && ['available', 'unavailable', 'disabled'].includes(body.search?.semanticStatus), 'missing search mode');
      modes[school.slug] = { mode: body.search.mode, semanticStatus: body.search.semanticStatus };
    }, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: school.query, limit: 3 }) });
    await check('foreign-school item hidden', `${base}/items/${schools.find(row => row !== school).item}`, 404, body => requireCheck(body.error?.code === 'NOT_FOUND', 'unexpected denial'));
    await check('anonymous staff denied', `${base}/staff/items`, 401, body => requireCheck(body.error?.code === 'UNAUTHORIZED', 'unexpected denial'));
  }
  await check('anonymous claims denied', '/api/v1/me/claims', 401, body => requireCheck(body.error?.code === 'UNAUTHORIZED', 'unexpected denial'));
  await check('cross-origin sign-out denied', '/api/auth/sign-out', 403, body => requireCheck(body.error?.code === 'FORBIDDEN', 'unexpected denial'), { method: 'POST', headers: { Origin: 'https://release-check.invalid' } });
  await check('same-origin auth configured', '/api/auth/sign-in', 303, (_, response) => {
    const target = new URL(response.headers.get('location'), origin);
    requireCheck(target.origin === origin && target.pathname === '/sign-in' && target.searchParams.get('error') === 'invalid', 'incorrect auth origin');
  }, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' });
  return { check: 'release-public-smoke', observedAt: new Date().toISOString(), origin, passed: checks.every(row => row.passed), scope: 'Public HTTP only; authenticated workflow, provider configuration, deployment identity and rollback require separate evidence', search: modes, checks };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await releaseSmoke(process.argv[2] || 'https://lost-link-beta.vercel.app');
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch {
    console.error('Release check could not start: supply a valid HTTPS origin (HTTP is allowed only on loopback).');
    process.exitCode = 1;
  }
}
