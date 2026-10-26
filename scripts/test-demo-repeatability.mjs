// Disposable local CI stack only. Never resets seed data or modifies existing passwords.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { loadLocalEnv,localStatus } from './local-supabase.mjs';
loadLocalEnv();
const status=localStatus();
if(process.env.NEXT_PUBLIC_SUPABASE_URL&&!['localhost','127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname))throw Error('Repeatability checks require the disposable local stack');
const password=process.env.LOSTLINK_DEMO_PASSWORD||randomBytes(24).toString('base64url');
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY,LOSTLINK_DEMO_PASSWORD:password};
function run(script,overrides={}){
 const result=spawnSync(process.execPath,[script],{env:{...env,...overrides},encoding:'utf8',timeout:120000});
 if(result.status!==0)throw Error(`Demo check failed: ${script}; inspect local services and configured existing demo password`);
 return result.stdout;
}
function seed(){const r=spawnSync('docker',['exec','-i','supabase_db_lost-link','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:readFileSync('supabase/seed.sql'),stdio:['pipe','ignore','inherit']});if(r.status!==0)throw Error('Non-destructive seed replay failed');}
seed();run('scripts/provision-demo.mjs');
const before=JSON.parse(run('scripts/verify-demo.mjs'));
seed();run('scripts/provision-demo.mjs',{LOSTLINK_DEMO_PASSWORD:randomBytes(24).toString('base64url')});
const after=JSON.parse(run('scripts/verify-demo.mjs'));
assert.deepEqual(after,before,'Seed/account replay changed identity or access');
console.log('PASS: seed replay, four stable account identities, preserved passwords, exact memberships, public projection and school denial');
