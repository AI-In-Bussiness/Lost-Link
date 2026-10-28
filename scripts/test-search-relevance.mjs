// Disposable local fixtures only. Verify real HTTP guard in both model modes;
// raw RPC intentionally remains a high-recall candidate source.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { localStatus,loadLocalEnv } from './local-supabase.mjs';
loadLocalEnv();
const local=localStatus();
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==local.API_URL || !['127.0.0.1','localhost'].includes(new URL(local.API_URL).hostname))throw Error('Search relevance HTTP tests require matched local Supabase.');
const admin=createClient(local.API_URL,local.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(local.API_URL,local.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const orgs=[];
async function db(result){if(result.error)throw Error(`Search fixture operation failed (${result.error.code??'unknown'}).`);return result.data;}
async function app(enabled,callback){
 const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',()=>reject(Error('Free port 3002 before test:search:relevance.')));probe.listen(3002,'localhost',()=>probe.close(resolve));});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3002'],{env:{...process.env,LOSTLINK_SEMANTIC_SEARCH:String(enabled)},stdio:['ignore','ignore','inherit']});
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)throw Error('Search test server exited.');
   try{if((await fetch('http://localhost:3002',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}
   await setTimeout(300);
  }
  assert.ok(ready,'Search test server unavailable');await callback();
 }finally{server.kill('SIGTERM');if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve));}
}
try{
 for(let i=0;i<2;i++){const org={id:randomUUID(),slug:`search-${randomUUID()}`,name:'Fictional search test',published:true};await db(await admin.from('organizations').insert(org));orgs.push(org);}
 const fields={organization_id:orgs[0].id,public_location:'Library',found_date:'2026-01-01'};
 const fixtures=[
  {title:'Black school backpack',public_description:'Two straps and a padded laptop sleeve.',category:'bag',color:'black'},
  {title:'Keys on green lanyard',public_description:'Two silver keys on a neck strap.',category:'keys',color:'green'},
  {title:'Blue pencil case',public_description:'A zipped hard case for pens.',category:'other',color:'blue'},
  {title:'Silver laptop computer sleeve',public_description:'A protective sleeve for a laptop computer.',category:'other',color:'silver'},
  {title:'Navy hooded sweatshirt',public_description:'A cotton pullover with hood.',category:'clothing',color:'navy'},
 ].map(row=>({...fields,...row}));
 const items=await db(await admin.from('items').insert(fixtures).select('id,title'));
 const foreign=(await db(await admin.from('items').insert({...fields,organization_id:orgs[1].id,title:'Silver laptop computer',public_description:'A silver laptop.',category:'electronics',color:'silver'}).select('id')))[0];
 const raw=await db(await anon.rpc('backend_dispatch',{p_action:'search',p_org_slug:orgs[0].slug,p_payload:{query:'silver laptop computer',limit:50}}));
 assert.ok(raw.data.length>0,'Fixture must reproduce raw component/color candidate matches');
 for(const enabled of [true,false])await app(enabled,async()=>{
  async function search(query){
   const r=await fetch(`http://localhost:3002/api/v1/organizations/${orgs[0].slug}/search`,{method:'POST',headers:{Origin:process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({query,limit:1}),signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200);assert.ok(r.headers.get('cache-control').includes('no-store'));
   const body=await r.json();assert.equal(body.search.semanticStatus,enabled?'available':'disabled');
   assert.ok(body.data.every(row=>row.item.organizationSlug===orgs[0].slug && row.item.id!==foreign.id));return body.data;
  }
  for(const query of ['silver laptop computer','wooden violin in a hard case','blue desktop computer','orange hooded sweatshirt'])assert.deepEqual(await search(query),[],query);
  const match=await search('black school backpack');assert.equal(match[0]?.item.id,items.find(i=>i.title==='Black school backpack').id);
  // Identical query is supported when a real matching object exists in this school.
  const laptop=(await db(await admin.from('items').insert({...fields,title:'Silver laptop',public_description:'A silver laptop.',category:'electronics',color:'silver'}).select('id')))[0];
  assert.equal((await search('silver laptop computer'))[0]?.item.id,laptop.id);
  await db(await admin.from('items').delete().eq('id',laptop.id));
  console.log(`PASS: real HTTP relevance, no-match, limit, matching-object counterexample and scope (${enabled?'model':'disabled'}).`);
 });
}finally{
 for(const org of orgs){for(const table of ['item_private_details','items'])await db(await admin.from(table).delete().eq('organization_id',org.id));await db(await admin.from('organizations').delete().eq('id',org.id));}
}
