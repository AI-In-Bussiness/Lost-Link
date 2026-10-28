// Local-only owner acceptance with real Auth/database; cleans up only its own fixtures.
import { spawn } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { localStatus,loadLocalEnv } from './local-supabase.mjs';
loadLocalEnv();
const local=localStatus();
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==local.API_URL || !['localhost','127.0.0.1'].includes(new URL(local.API_URL).hostname))throw Error('Owner tests require matched local Supabase.');
const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',()=>reject(Error('Free port 3000 before test:admin.')));probe.listen(3000,'localhost',()=>probe.close(resolve));});
const admin=createClient(local.API_URL,local.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const directory=mkdtempSync(join(tmpdir(),'lostlink-owner-'));
const users=[];const slug=`owner-${randomUUID()}`;let server;
async function db(result){if(result.error)throw Error(`Owner fixture operation failed (${result.error.code ?? 'unknown'}).`);return result.data;}
async function actor(owner=false){
 const account={email:`owner-test-${randomUUID()}@example.test`,password:randomBytes(24).toString('base64url')};
 const {user}=await db(await admin.auth.admin.createUser({...account,email_confirm:true}));users.push(user.id);
 if(owner)await db(await admin.from('platform_admins').insert({user_id:user.id}));
 return {...account,id:user.id};
}
try{
 const fixtures={origin:'http://localhost:3000',slug,one:await actor(true),two:await actor(true),staff:await actor(),claimant:await actor()};
 const file=join(directory,'fixtures.json');writeFileSync(file,JSON.stringify(fixtures),{mode:0o600});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost'],{env:process.env,stdio:['ignore','ignore','inherit']});
 let ready=false;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)throw Error('Owner test server exited.');
  try{if((await fetch(fixtures.origin,{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}
  await setTimeout(500);
 }
 if(!ready)throw Error('Owner test server failed readiness.');
 const python=spawn('python',['tools/admin-browser-test.py'],{env:{...process.env,LOSTLINK_OWNER_FIXTURES:file},stdio:'inherit'});
 process.exitCode=await new Promise(resolve=>{python.on('error',()=>resolve(1));python.on('exit',code=>resolve(code ?? 1));});
}finally{
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve));}
 try{
  const orgs=await db(await admin.from('organizations').select('id').eq('slug',slug));
  for(const org of orgs){
   await db(await admin.from('platform_admin_events').delete().eq('organization_id',org.id));
   await db(await admin.from('memberships').delete().eq('organization_id',org.id));
   await db(await admin.from('organizations').delete().eq('id',org.id));
  }
  for(const id of users){await db(await admin.from('platform_admins').delete().eq('user_id',id));await db(await admin.auth.admin.deleteUser(id));}
 }catch{process.exitCode=1;console.error('Temporary owner fixtures could not all be removed; inspect the local owner test accounts.');}
 rmSync(directory,{recursive:true,force:true});
}
