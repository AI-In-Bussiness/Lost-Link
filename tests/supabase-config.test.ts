import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSupabaseConfiguration, sessionCookieOptions } from '../src/lib/supabase/config';

const jwt = (role: string) => ['test', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'test'].join('.');
const publishable = 'sb_publishable_test_only';

test('public configuration accepts publishable and legacy anon keys, with loopback development', () => {
  assert.deepEqual(publicSupabaseConfiguration('https://project.supabase.co', publishable), { url: 'https://project.supabase.co', key: publishable });
  for (const url of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) {
    assert.equal(publicSupabaseConfiguration(url, jwt('anon'))?.url, url);
  }
  assert.equal(publicSupabaseConfiguration('', ''), null);
});

test('secret and privileged keys cannot be used in public configuration; errors omit their values', () => {
  for (const key of ['sb_secret_test_only', jwt('service_role'), jwt('authenticated'), 'malformed-key', 'test.bad-json.test']) {
    assert.throws(() => publicSupabaseConfiguration('https://project.supabase.co', key), error =>
      error instanceof Error && error.message.includes('publishable or anon') && !error.message.includes(key));
  }
});

test('remote HTTP and embedded credentials, paths, queries and fragments are rejected', () => {
  for (const url of ['http://project.supabase.co', 'https://user:private@project.supabase.co', 'https://project.supabase.co/auth', 'https://project.supabase.co/?key=private', 'https://project.supabase.co/#private', 'file:///tmp/project', 'not-a-url']) {
    assert.throws(() => publicSupabaseConfiguration(url, publishable));
  }
});

test('server session cookies are HttpOnly and same-site, and require Secure on HTTPS', () => {
  assert.deepEqual(sessionCookieOptions('https://lostlink.example'), { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  assert.equal(sessionCookieOptions('http://localhost:3000').secure, false);
  assert.throws(() => sessionCookieOptions('http://lostlink.example'));
});
