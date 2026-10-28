import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { proxy, config } from '../src/proxy';

test('document policies use fresh server nonces and replace forged request policies', async () => {
  const request = () => new NextRequest('https://lostlink.example/', { headers: {
    'x-nonce': 'attacker-controlled',
    'Content-Security-Policy': "script-src 'unsafe-inline'",
  } });
  const first = await proxy(request());
  const second = await proxy(request());
  const policy = first.headers.get('Content-Security-Policy')!;
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  assert.notEqual(policy, second.headers.get('Content-Security-Policy'));
  assert.doesNotMatch(policy, /attacker-controlled/);
  assert.equal(first.headers.get('x-middleware-request-content-security-policy'), policy);
  assert.equal(first.headers.get('x-middleware-request-x-nonce'), nonce);
  const scripts = policy.split('; ').find(directive => directive.startsWith('script-src '))!;
  assert.match(scripts, /'strict-dynamic'/);
  assert.doesNotMatch(scripts, /'unsafe-inline'|'unsafe-eval'/);
  for (const directive of ["connect-src 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "script-src-attr 'none'"]) {
    assert.ok(policy.split('; ').includes(directive), directive);
  }
  assert.equal(first.headers.get('Cache-Control'), 'private, no-store');
});

test('all document routes receive CSP while data and local assets keep their existing handling', () => {
  for (const path of ['/', '/sign-in', '/sign-up', '/resend-confirmation', '/forgot-password', '/reset-password', '/account', '/my/claims', '/o/maple-school/search', '/o/maple-school/staff', '/privacy', '/terms', '/missing-page']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), true, path);
  }
  for (const path of ['/api/auth/sign-in', '/api/v1/me/claims', '/_next/static/chunk.js', '/_next/image', '/design/caveat.ttf', '/mock-assets/item-placeholder.svg', '/icon.svg', '/favicon.ico']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), false, path);
  }
});
