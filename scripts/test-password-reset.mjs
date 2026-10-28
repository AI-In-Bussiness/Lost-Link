// Real local recovery emails and browser forms. Never target hosted accounts.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { localStatus, loadLocalEnv } from './local-supabase.mjs';

loadLocalEnv();
const local = localStatus();
const origin = 'http://localhost:3000';
const mailOrigin = new URL(local.MAILPIT_URL || local.INBUCKET_URL || 'http://127.0.0.1:54324').origin;
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== local.API_URL || (process.env.NEXT_PUBLIC_SITE_URL || origin) !== origin || ![local.API_URL, mailOrigin].every(value => ['localhost', '127.0.0.1'].includes(new URL(value).hostname))) throw Error('Password reset tests require the matched local Supabase, mail and localhost application.');
const probe = net.createServer();
await new Promise((resolve, reject) => { probe.once('error', () => reject(Error('Free port 3000 before test:password-reset.'))); probe.listen(3000, 'localhost', () => probe.close(resolve)); });
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const directory = mkdtempSync(join(tmpdir(), 'lostlink-recovery-'));
const users = [];
const slug = `recovery-${randomUUID()}`;
let organization, server;
async function db(result) { if (result.error) throw Error(`Recovery fixture operation failed (${result.error.code ?? 'unknown'}).`); return result.data; }
async function actor(role) {
  const account = { role, email: `recovery-${randomUUID()}@example.test`, password: randomBytes(24).toString('base64url'), newPassword: randomBytes(24).toString('base64url') };
  const { user } = await db(await admin.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true }));
  users.push(user.id);
  if (role === 'owner') await db(await admin.from('platform_admins').insert({ user_id: user.id }));
  if (['staff', 'admin'].includes(role)) await db(await admin.from('memberships').insert({ organization_id: organization.id, user_id: user.id, role }));
  return { ...account, id: user.id, next: role === 'owner' ? '/admin' : role === 'admin' ? `/o/${slug}/staff/settings` : role === 'staff' ? `/o/${slug}/staff` : '/my/claims' };
}
try {
  [organization] = await db(await admin.from('organizations').insert({ slug, name: 'Fictional Recovery School', published: true }).select('id'));
  const accounts = [];
  for (const role of ['claimant', 'staff', 'admin', 'owner']) accounts.push(await actor(role));
  const beforeMembers = await db(await admin.from('memberships').select('*').in('user_id', users).order('user_id'));
  const beforeOwners = await db(await admin.from('platform_admins').select('*').in('user_id', users).order('user_id'));
  const fixtures = { origin, mailOrigin, authOrigin: new URL(local.API_URL).origin, accounts, unknownEmail: `unknown-${randomUUID()}@example.test` };
  const fixtureFile = join(directory, 'fixtures.json');
  writeFileSync(fixtureFile, JSON.stringify(fixtures), { mode: 0o600 });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost'], { env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error('Password reset test server exited.');
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
    await setTimeout(500);
  }
  if (!ready) throw Error('Password reset test server failed readiness.');
  const python = spawn('python', ['tools/password-reset-browser-test.py'], { env: { ...process.env, LOSTLINK_RECOVERY_FIXTURES: fixtureFile }, stdio: 'inherit' });
  const code = await new Promise(resolve => { python.on('error', () => resolve(1)); python.on('exit', value => resolve(value ?? 1)); });
  assert.equal(code, 0, 'Password reset browser checks must pass.');
  assert.deepEqual(await db(await admin.from('memberships').select('*').in('user_id', users).order('user_id')), beforeMembers, 'Password recovery must preserve every school membership.');
  assert.deepEqual(await db(await admin.from('platform_admins').select('*').in('user_id', users).order('user_id')), beforeOwners, 'Password recovery must preserve website ownership.');
  assert.ok(!(await db(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }))).users.some(user => user.email === fixtures.unknownEmail), 'Recovery must not create unknown accounts.');
  console.log('PASS: all four account types reset passwords with unchanged membership/ownership and no unknown-account enrollment.');
} finally {
  if (server) { server.kill('SIGTERM'); if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve)); }
  try {
    if (users.length) {
      await db(await admin.from('platform_admins').delete().in('user_id', users));
      await db(await admin.from('memberships').delete().in('user_id', users));
      for (const id of users) await db(await admin.auth.admin.deleteUser(id));
    }
    if (organization) await db(await admin.from('organizations').delete().eq('id', organization.id));
  } catch { process.exitCode = 1; console.error('Temporary recovery fixtures could not all be removed; inspect the local recovery test records.'); }
  rmSync(directory, { recursive: true, force: true });
}
