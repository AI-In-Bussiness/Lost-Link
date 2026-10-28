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
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== local.API_URL || !['127.0.0.1','localhost'].includes(new URL(local.API_URL).hostname)) throw new Error('Browser tests require the matched local Supabase stack.');
const probe = net.createServer();
await new Promise((resolve,reject) => {probe.once('error',()=>reject(new Error('Free port 3000 before test:browser.')));probe.listen(3000,'localhost',()=>probe.close(resolve));});
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const directory = mkdtempSync(join(tmpdir(),'lostlink-browser-'));
const orgs = [], users = [];
let server;
async function db(result) { if(result.error) throw new Error(`Browser fixture operation failed (${result.error.code ?? 'unknown'}).`); return result.data; }
async function actor(org) {
 const account = {email:`browser-${randomUUID()}@example.test`,password:randomBytes(24).toString('base64url')};
 const {user} = await db(await admin.auth.admin.createUser({...account,email_confirm:true}));users.push(user.id);
 if(org) await db(await admin.from('memberships').insert({organization_id:org.id,user_id:user.id,role:'staff'}));
 return account;
}
try {
 for(const name of ['Maple','Cedar']) {
  const org = {id:randomUUID(),slug:`browser-${randomUUID()}`,name:`Synthetic ${name} School`,published:true};
  await db(await admin.from('organizations').insert(org));orgs.push(org);
 }
 const fixtures = {origin:'http://localhost:3000',orgs,staff:await actor(orgs[0]),foreign:await actor(orgs[1]),claimant:await actor(),other:await actor()};
 const fixtureFile = join(directory,'fixtures.json');
 writeFileSync(fixtureFile,JSON.stringify(fixtures),{mode:0o600});
 server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost'],{env:{...process.env,LOSTLINK_ORGANIZATION_SLUGS:orgs.map(o=>o.slug).join(',')},stdio:['ignore','ignore','inherit']});
 let ready = false;
 for(let i=0;i<60;i++) {
  if(server.exitCode!==null) throw new Error('Browser app server exited.');
  try {if((await fetch(fixtures.origin)).ok){ready=true;break;}} catch {}
  await setTimeout(500);
 }
 if(!ready) throw new Error('Browser app failed readiness.');
 const python = spawn('python',['tools/live-browser-test.py',...process.argv.slice(2)],{env:{...process.env,LOSTLINK_BROWSER_FIXTURES:fixtureFile},stdio:'inherit'});
 process.exitCode = await new Promise(resolve => {python.on('error',()=>resolve(1));python.on('exit',code=>resolve(code??1));});
} finally {
 if(server) {server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));}
 // Only randomly generated test organizations/accounts; never reset shared/demo data.
 let cleanupFailed = false;
 try {
  if(orgs.length) {
   const photos = await db(await admin.from('item_photos').select('storage_path').in('organization_id',orgs.map(o=>o.id)));
   if(photos.length) await db(await admin.storage.from('item-public').remove(photos.map(p=>p.storage_path)));
   for(const table of ['audit_events','claims','item_photos','item_private_details','items','memberships']) await db(await admin.from(table).delete().in('organization_id',orgs.map(o=>o.id)));
   await db(await admin.from('organizations').delete().in('id',orgs.map(o=>o.id)));
  }
  for(const id of users) await db(await admin.auth.admin.deleteUser(id));
 } catch {cleanupFailed=true;console.error('Temporary browser fixtures could not all be removed; inspect the local test organizations.');}
 rmSync(directory,{recursive:true,force:true});
 if(cleanupFailed) process.exitCode=1;
}
