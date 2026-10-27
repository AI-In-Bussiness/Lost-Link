import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authUrlConfiguration, checkAuthRedirects, configureAuthRedirects } from '../scripts/auth-redirects.mjs';

const origin = 'https://lostlink.example';
const projectRef = 'abcdefghijklmnopqrst';
const callbacks = `${origin}/auth/callback,${origin}/auth/callback?next=**`;

test('URL repair preserves existing redirects and updates only the two URL settings', () => {
  const existing = 'http://localhost:3000,https://preview.example/auth/callback';
  const result = authUrlConfiguration({ site_url: 'http://localhost:3000', uri_allow_list: existing, disable_signup: false, smtp_pass: 'SECRET_SENTINEL' }, origin);
  assert.deepEqual(result, { site_url: origin, uri_allow_list: `${existing},${callbacks}` });
  assert.deepEqual(authUrlConfiguration(result, origin), result);
  assert.deepEqual(authUrlConfiguration({}, origin), { site_url: origin, uri_allow_list: callbacks });
});

test('hosted URL repair rejects loopback, HTTP, credentials and non-origin URLs', () => {
  for (const value of ['http://localhost:3000', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://test.localhost', 'http://lostlink.example', 'https://user:pass@lostlink.example', `${origin}/path`, `${origin}?next=secret`, `${origin}#secret`]) {
    assert.throws(() => authUrlConfiguration({}, value));
  }
  assert.throws(() => authUrlConfiguration({ uri_allow_list: [] }, origin));
});

test('public redirect diagnostic detects Site URL and query-string allowlist failures', async () => {
  for (const mode of ['correct', 'localhost', 'missing-query', 'wrong-fallback', 'lost-next']) {
    const requests = [];
    const report = await checkAuthRedirects(origin, projectRef, async (url, init) => {
      requests.push(url);
      assert.equal(init.redirect, 'manual');
      assert.ok(init.signal);
      assert.equal(init.headers, undefined);
      assert.equal(url.origin, `https://${projectRef}.supabase.co`);
      assert.equal(url.searchParams.get('token'), 'invalid-lostlink-redirect-check');
      const desired = url.searchParams.get('redirect_to');
      let target = new URL(desired || origin);
      if (mode === 'localhost' || (mode === 'missing-query' && target.search) || (mode === 'wrong-fallback' && !desired)) target = new URL('http://localhost:3000');
      if (mode === 'lost-next') target.search = '';
      target.hash = 'error=access_denied&error_description=SECRET_SENTINEL';
      return new Response(null, { status: 303, headers: { location: target.href } });
    });
    assert.equal(report.passed, mode === 'correct');
    assert.equal(requests.length, 3);
    assert.ok(!JSON.stringify(report).includes('SECRET_SENTINEL'));
  }
});

test('public diagnostic fails closed on missing redirects, wrong statuses and network errors', async () => {
  for (const fetcher of [async () => new Response(null), async () => new Response(null, { status: 303 }), async () => { throw Error('SECRET_SENTINEL'); }]) {
    const report = await checkAuthRedirects(origin, projectRef, fetcher);
    assert.equal(report.passed, false);
    assert.equal(report.checks.length, 3);
    assert.ok(!JSON.stringify(report).includes('SECRET_SENTINEL'));
  }
});

test('management repair reads, patches only URL fields and verifies readback without returning secrets', async () => {
  const methods = [];
  const secret = 'SECRET_SENTINEL';
  let config = { site_url: 'http://localhost:3000', uri_allow_list: 'http://localhost:3000', smtp_pass: secret, external_email_enabled: true };
  const fetcher = async (url, init) => {
    assert.equal(url, `https://api.supabase.com/v1/projects/${projectRef}/config/auth`);
    assert.equal(init.headers.Authorization, `Bearer ${secret}`);
    assert.equal(init.redirect, 'error');
    methods.push(init.method);
    if (init.method === 'PATCH') {
      const patch = JSON.parse(init.body);
      assert.deepEqual(Object.keys(patch).sort(), ['site_url', 'uri_allow_list']);
      config = { ...config, ...patch };
    }
    return Response.json(config);
  };
  const result = await configureAuthRedirects(origin, projectRef, secret, fetcher);
  assert.deepEqual(methods, ['GET', 'PATCH', 'GET']);
  assert.equal(result.changed, true);
  assert.equal(result.verified, true);
  assert.ok(!JSON.stringify(result).includes(secret));
  methods.length = 0;
  assert.equal((await configureAuthRedirects(origin, projectRef, secret, fetcher)).changed, false);
  assert.deepEqual(methods, ['GET']);
});

test('management repair rejects absent access or invalid project before any request', async () => {
  let requests = 0;
  const fetcher = async () => { requests++; throw Error('must not reach network'); };
  await assert.rejects(configureAuthRedirects(origin, projectRef, '', fetcher), /SUPABASE_ACCESS_TOKEN/);
  await assert.rejects(configureAuthRedirects(origin, '../other-project', 'token', fetcher));
  await assert.rejects(checkAuthRedirects(origin, '../other-project', fetcher));
  assert.equal(requests, 0);
});

test('management failures redact provider bodies and secrets, and never patch after a failed read', async () => {
  for (const failure of ['http', 'network', 'invalid-json']) {
    const methods = [];
    await assert.rejects(configureAuthRedirects(origin, projectRef, 'SECRET_SENTINEL', async (_, init) => {
      methods.push(init.method);
      if (failure === 'network') throw Error('SECRET_SENTINEL');
      return new Response('SECRET_SENTINEL', { status: failure === 'http' ? 403 : 200 });
    }), error => !error.message.includes('SECRET_SENTINEL'));
    assert.deepEqual(methods, ['GET']);
  }
});

test('management repair reports stale readback instead of claiming success', async () => {
  const config = { site_url: 'http://localhost:3000', uri_allow_list: '' };
  await assert.rejects(configureAuthRedirects(origin, projectRef, 'token', async () => Response.json(config)), /readback did not match/);
});
