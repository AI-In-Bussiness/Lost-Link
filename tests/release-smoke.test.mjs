import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseOrigin, releaseSmoke } from '../scripts/release-smoke.mjs';

const orgs = ['maple-school', 'cedar-school'];
function fixture(overrides = () => null) {
  return async (url, init) => {
    assert.equal(init.redirect, 'manual');
    assert.ok(init.signal);
    assert.equal(init.headers?.Authorization, undefined);
    const path = url.pathname;
    const slug = path.split('/')[4];
    const index = orgs.indexOf(slug);
    const item = { id: `20000000-0000-4000-8000-00000000000${index + 1}`, organizationSlug: slug };
    let status = 200, body = 'LostLink', type = 'text/html', location;
    if (path.startsWith('/api/')) {
      type = 'application/json';
      if (path.endsWith('/sign-in')) { status = 303; body = ''; location = `${url.origin}/sign-in?error=invalid`; }
      else if (path.endsWith('/sign-out')) { status = 403; body = { error: { code: 'FORBIDDEN' } }; }
      else if (path.includes('/staff/') || path === '/api/v1/me/claims') { status = 401; body = { error: { code: 'UNAUTHORIZED' } }; }
      else if (path.endsWith('/search')) body = { data: [{ item }], search: { mode: 'hybrid', semanticStatus: 'available' } };
      else if (path.endsWith('/items')) body = { data: [item] };
      else if (path.includes('/items/')) {
        if (path.endsWith(item.id)) body = { data: item };
        else { status = 404; body = { error: { code: 'NOT_FOUND' } }; }
      } else body = { data: { slug, id: `10000000-0000-4000-8000-00000000000${index + 1}` } };
    }
    const override = overrides({ path, init, body });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status, headers: { 'content-type': type, 'cache-control': 'private, no-store', 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', ...(location ? { location } : {}) }, ...override,
    });
  };
}
test('all public checks pass without credentials and report actual search mode', async () => {
  const report = await releaseSmoke('https://demo.example', fixture());
  assert.equal(report.passed, true);
  assert.equal(report.checks.length, 17);
  assert.equal(report.search['maple-school'].mode, 'hybrid');
});
test('HTML 200 pages cannot hide unavailable APIs; remaining checks still run', async () => {
  const report = await releaseSmoke('https://demo.example', fixture(({ path }) => path.startsWith('/api/v1/organizations/') ? { status: 503 } : null));
  assert.equal(report.passed, false);
  assert.equal(report.checks.length, 17);
  assert.equal(report.checks[0].passed, true);
});
test('wrong-school and private projections fail without printing their values', async () => {
  for (const field of ['organizationSlug', 'identifyingDetails']) {
    const report = await releaseSmoke('https://demo.example', fixture(({ body }) => {
      if (Array.isArray(body.data)) for (const row of body.data) (row.item || row)[field] = 'SENSITIVE_SENTINEL';
    }));
    assert.equal(report.passed, false);
    assert.ok(!JSON.stringify(report).includes('SENSITIVE_SENTINEL'));
  }
});
test('redirect/protection pages and missing headers fail', async () => {
  for (const override of [{ status: 307 }, { headers: { 'content-type': 'text/html' } }]) {
    const report = await releaseSmoke('https://demo.example', fixture(() => override));
    assert.equal(report.passed, false);
  }
});
test('network exceptions are redacted and checks continue', async () => {
  const report = await releaseSmoke('https://demo.example', async () => { throw Error('SENSITIVE_SENTINEL'); });
  assert.equal(report.passed, false);
  assert.equal(report.checks.length, 17);
  assert.ok(!JSON.stringify(report).includes('SENSITIVE_SENTINEL'));
});
test('only HTTPS origins or loopback HTTP are accepted', () => {
  assert.equal(releaseOrigin('http://localhost:3000'), 'http://localhost:3000');
  for (const input of ['http://remote.example', 'https://user:pass@demo.example', 'https://demo.example/path', 'https://demo.example?key=secret', 'ftp://demo.example']) assert.throws(() => releaseOrigin(input));
});
