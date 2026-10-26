import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('local Supabase helpers launch native executables without a shell', async t => {
 // Exercise actual OS spawning in a path that requires shell quoting.
 const root = mkdtempSync(join(tmpdir(), 'lostlink space & cli-'));
 try {
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'node_modules', 'supabase', 'bin'), { recursive: true });
  for (const name of ['start-database.mjs', 'local-supabase.mjs', 'supabase-binary.mjs'])
   copyFileSync(new URL('../scripts/' + name, import.meta.url), join(root, 'scripts', name));
  const binary = join(root, 'node_modules', 'supabase', 'bin', process.platform === 'win32' ? 'supabase.exe' : 'supabase');
  // Node stands in for the CLI: "start" and "status" are fixture programs.
  copyFileSync(process.execPath, binary);
  const run = script => spawnSync(process.execPath, [join(root, 'scripts', script)], { cwd: root, encoding: 'utf8' });
  await t.test('startup preserves arguments and diagnostics while hiding key output', () => {
   writeFileSync(join(root, 'start'), `const assert = require('node:assert/strict');
assert.deepEqual(process.argv.slice(2), ['-x','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
console.log('fixture-secret-must-not-print'); console.error('fixture startup diagnostic');`);
   const result = run('start-database.mjs');
   assert.equal(result.status, 0, result.stderr);
   assert.match(result.stdout, /Local Supabase services started/);
   assert.match(result.stderr, /fixture startup diagnostic/);
   assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret-must-not-print/);
  });
  await t.test('startup retains the CLI failure exit status', () => {
   writeFileSync(join(root, 'start'), 'process.exit(23)');
   const result = run('start-database.mjs');
   assert.equal(result.status, 23);
   assert.doesNotMatch(result.stdout, /services started/);
  });
  writeFileSync(join(root, 'scripts', 'check-status.mjs'), `import assert from 'node:assert/strict';
import { localStatus } from './local-supabase.mjs';
assert.deepEqual(localStatus(), { API_URL:'http://127.0.0.1:54321', ANON_KEY:'fixture-public', SERVICE_ROLE_KEY:'fixture-private' });
console.log('status parsed');`);
  await t.test('status parses JSON without printing credentials', () => {
   writeFileSync(join(root, 'status'), `const assert = require('node:assert/strict');
assert.deepEqual(process.argv.slice(2), ['-o','json']);
console.log(JSON.stringify({ API_URL:'http://127.0.0.1:54321', ANON_KEY:'fixture-public', SERVICE_ROLE_KEY:'fixture-private' }));`);
   const result = run('check-status.mjs');
   assert.equal(result.status, 0, result.stderr);
   assert.equal(result.stdout.trim(), 'status parsed');
   assert.doesNotMatch(result.stderr, /fixture-private/);
  });
  await t.test('status failures do not disclose CLI output', () => {
   writeFileSync(join(root, 'status'), "console.error('fixture-private'); process.exit(1)");
   const result = run('check-status.mjs');
   assert.notEqual(result.status, 0);
   assert.match(result.stderr, /Local Supabase is unavailable/);
   assert.doesNotMatch(result.stdout + result.stderr, /fixture-private/);
  });
  await t.test('missing installer gives actionable instructions', () => {
   rmSync(binary);
   const result = run('check-status.mjs');
   assert.notEqual(result.status, 0);
   assert.match(result.stderr, /Local Supabase CLI is not installed/);
   assert.match(result.stderr, /npm rebuild supabase/);
  });
 } finally {
  rmSync(root, { recursive: true, force: true });
 }
});
