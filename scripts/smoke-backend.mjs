import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localStatus, loadLocalEnv } from './local-supabase.mjs';
loadLocalEnv();
const s=localStatus(),site='http://localhost:3000';
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==s.API_URL || !['127.0.0.1','localhost'].includes(new URL(s.API_URL).hostname))throw new Error('Backend tests require the local Supabase project.');
const admin=createClient(s.API_URL,s.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const orgs=[],users=[];
async function db(result){if(result.error)throw new Error(`Fixture failure: ${result.error.code||'unknown'}`);return result.data;}
async function actor(org=null,role='staff'){
 const email=`backend-${randomUUID()}@example.test`,password=randomBytes(24).toString('base64url');
 const {user}=await db(await admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
 if(org)await db(await admin.from('memberships').insert({organization_id:org.id,user_id:user.id,role}));
 const response=await fetch(`${site}/api/auth/sign-in`,{method:'POST',headers:{origin:site},body:new URLSearchParams({email,password}),redirect:'manual'});
 assert.equal(response.status,303);
 assert.equal(new URL(response.headers.get('location')).pathname,'/account');
 const cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 assert.ok(cookie);return {id:user.id,cookie};
}
async function api(path,{who,method='GET',body,status=200,origin=site,raw}={}){
 const headers={};if(who)headers.cookie=who.cookie;
 if(method!=='GET'){headers.origin=origin;headers['content-type']='application/json';}
 const response=await fetch(`${site}/api/v1${path}`,{method,headers,body:raw??(body===undefined?undefined:JSON.stringify(body))});
 const data=await response.json();
 assert.equal(response.status,status,`${method} ${path} expected ${status}; got ${response.status} (${data.error?.code||'success'})`);
 assert.ok(response.headers.get('cache-control')?.includes('no-store'));
 if(status>=400){assert.ok(data.error.requestId);assert.ok(data.error.code);}
 return data;
}
try{
 for(const name of ['One','Two']){
  const org={id:randomUUID(),slug:`backend-${randomUUID()}`,name:`Synthetic Backend ${name}`,published:true};
  await db(await admin.from('organizations').insert(org));orgs.push(org);
 }
 const [a,b]=orgs;
 const staff=await actor(a),foreign=await actor(b),claimant=await actor(),other=await actor();
 const base=`/organizations/${a.slug}`,otherBase=`/organizations/${b.slug}`;
 assert.equal((await api(base)).data.id,a.id);
 await api(`${base}/staff/items`,{status:401});
 await api(`${base}/staff/items`,{who:foreign,status:404});
 await api(`${base}/staff/items`,{who:claimant,status:404});
 const fields={title:'Black gym backpack',publicDescription:'A black athletic backpack with a white logo.',category:'bag',color:'black',publicLocation:'Gym entrance',foundDate:'2026-01-01',identifyingDetails:'Synthetic dinosaur keyring in an inside pocket.',storageLocation:'Private cabinet B7'};
 const create=async(title=fields.title)=> (await api(`${base}/staff/items`,{who:staff,method:'POST',body:{...fields,title},status:201})).data;
 const item=await create();
 assert.equal(item.status,'available');assert.equal(item.version,1);
 const detail=(await api(`${base}/items/${item.id}`)).data;
 assert.equal(detail.title,fields.title);
 for(const key of ['identifyingDetails','storageLocation','createdBy','claimantId'])assert.ok(!(key in detail));
 await api(`${otherBase}/items/${item.id}`,{status:404});
 await api(`${base}/staff/items`,{who:staff,method:'POST',body:{...fields,organizationId:b.id},status:400});
 await api(`${base}/staff/items/${item.id}`,{who:staff,method:'PATCH',body:{expectedVersion:1,status:'returned'},status:400});
 await api(`${base}/staff/items/${item.id}`,{who:staff,method:'PATCH',body:{expectedVersion:1,title:'Revised black gym backpack'},origin:'https://attacker.invalid',status:403});
 const revised=(await api(`${base}/staff/items/${item.id}`,{who:staff,method:'PATCH',body:{expectedVersion:1,title:'Revised black gym backpack'}})).data;
 assert.equal(revised.version,2);
 await api(`${base}/staff/items/${item.id}`,{who:staff,method:'PATCH',body:{expectedVersion:1,title:'Stale edit'},status:409});
 const matches=(await api(`${base}/search`,{method:'POST',body:{query:'black backpack'}})).data;
 assert.ok(matches.some(x=>x.item.id===item.id && x.method==='structured'));
 assert.equal((await api(`${base}/search`,{method:'POST',body:{query:'zzzxxyy-nonmatching'}})).data.length,0);
 await api(`${base}/search`,{method:'POST',raw:'{bad-json',status:400});
 await api(`${base}/search`,{method:'POST',body:{query:'x'.repeat(18000)},status:413});
 await api(`${base}/items?limit=0`,{status:400});
 await api(`${base}/items?unknown=field`,{status:400});
 console.log('PASS: public/staff inventory, private-field boundaries, strict validation, CSRF, search, optimistic edits.');
 const proof='Synthetic dinosaur keyring in an inside pocket.';
 const c1=(await api(`${base}/items/${item.id}/claims`,{who:claimant,method:'POST',body:{evidenceText:proof},status:201})).data;
 const c2=(await api(`${base}/items/${item.id}/claims`,{who:other,method:'POST',body:{evidenceText:proof},status:201})).data;
 await api(`${base}/items/${item.id}/claims`,{who:claimant,method:'POST',body:{evidenceText:proof},status:409});
 await api(`${base}/staff/claims/${c1.id}/review`,{who:foreign,method:'POST',body:{decision:'approve',expectedVersion:1},status:404});
 const races=await Promise.all([c1,c2].map(async c=>{
  const r=await fetch(`${site}/api/v1${base}/staff/claims/${c.id}/review`,{method:'POST',headers:{origin:site,cookie:staff.cookie,'content-type':'application/json'},body:JSON.stringify({decision:'approve',expectedVersion:1,privateNote:'Private staff decision'})});
  return {status:r.status,json:await r.json()};
 }));
 assert.deepEqual(races.map(x=>x.status).sort(),[200,409]);
 const winning=races.find(x=>x.status===200).json.data;
 await api(`${base}/items/${item.id}`,{status:404});
 const retry=(await api(`${base}/staff/claims/${winning.id}/review`,{who:staff,method:'POST',body:{decision:'approve',expectedVersion:1}})).data;
 assert.equal(retry.id,winning.id);
 const owners=await api('/me/claims',{who:claimant});
 assert.equal(owners.data.length,1);assert.ok(!('privateReviewNote' in owners.data[0]));
 assert.equal((await api('/me/claims',{who:staff})).data.length,0);
 const fulfilled=(await api(`${base}/staff/claims/${winning.id}/return`,{who:staff,method:'POST',body:{expectedVersion:winning.version,ownershipVerified:true}})).data;
 assert.equal(fulfilled.status,'fulfilled');
 assert.equal((await api(`${base}/staff/claims/${winning.id}/return`,{who:staff,method:'POST',body:{expectedVersion:winning.version,ownershipVerified:true}})).data.status,'fulfilled');
 const audit=await db(await admin.from('audit_events').select('action').eq('organization_id',a.id));
 assert.ok(audit.length>=4);
 assert.equal(audit.filter(x=>x.action==='claim_approved').length,1);
 assert.equal(audit.filter(x=>x.action==='claim_fulfilled').length,1);
 assert.equal(audit.filter(x=>x.action==='item_returned').length,1);
 console.log('PASS: private claims, duplicate denial, concurrent approval, atomic reservation/return, retry idempotency and audit.');
 const withdrawalItem=await create('Withdrawal test bag');
 const withdraw=(await api(`${base}/items/${withdrawalItem.id}/claims`,{who:claimant,method:'POST',body:{evidenceText:proof},status:201})).data;
 assert.equal((await api(`${base}/claims/${withdraw.id}/withdraw`,{who:claimant,method:'POST',body:{expectedVersion:1}})).data.status,'withdrawn');
 const cancelItem=await create('Cancellation test bag');
 const cancelClaim=(await api(`${base}/items/${cancelItem.id}/claims`,{who:other,method:'POST',body:{evidenceText:proof},status:201})).data;
 const approved=(await api(`${base}/staff/claims/${cancelClaim.id}/review`,{who:staff,method:'POST',body:{decision:'approve',expectedVersion:1}})).data;
 assert.equal((await api(`${base}/staff/claims/${cancelClaim.id}/cancel`,{who:staff,method:'POST',body:{expectedVersion:approved.version}})).data.status,'cancelled');
 assert.equal((await api(`${base}/items/${cancelItem.id}`)).data.id,cancelItem.id);
 const selfItem=await create('Self review test bag');
 const self=(await api(`${base}/items/${selfItem.id}/claims`,{who:staff,method:'POST',body:{evidenceText:proof},status:201})).data;
 await api(`${base}/staff/claims/${self.id}/review`,{who:staff,method:'POST',body:{decision:'approve',expectedVersion:1},status:403});
 const archiveItem=await create('Archive test bag');
 const archiveClaim=(await api(`${base}/items/${archiveItem.id}/claims`,{who:claimant,method:'POST',body:{evidenceText:proof},status:201})).data;
 assert.equal((await api(`${base}/staff/items/${archiveItem.id}/archive`,{who:staff,method:'POST',body:{expectedVersion:1}})).data.status,'archived');
 assert.equal((await api('/me/claims',{who:claimant})).data.find(x=>x.id===archiveClaim.id).status,'rejected');
 const rejectedItem=await create('Rejection test bag');
 const rejectedClaim=(await api(`${base}/items/${rejectedItem.id}/claims`,{who:other,method:'POST',body:{evidenceText:proof},status:201})).data;
 await api(`${base}/claims/${rejectedClaim.id}/withdraw`,{who:claimant,method:'POST',body:{expectedVersion:1},status:404});
 assert.equal((await api(`${base}/staff/claims/${rejectedClaim.id}/review`,{who:staff,method:'POST',body:{decision:'reject',expectedVersion:1,privateNote:'Staff-only reason'}})).data.status,'rejected');
 const safeRejected=(await api('/me/claims',{who:other})).data.find(x=>x.id===rejectedClaim.id);
 assert.equal(safeRejected.decisionReason,'rejected');assert.ok(!JSON.stringify(safeRejected).includes('Staff-only reason'));
 const quotaUser=await actor();
 for(let i=0;i<6;i++){
  const quotaItem=await create(`Quota test bag ${i}`);
  const response=await fetch(`${site}/api/v1${base}/items/${quotaItem.id}/claims`,{method:'POST',headers:{origin:site,cookie:quotaUser.cookie,'content-type':'application/json'},body:JSON.stringify({evidenceText:proof})});
  assert.equal(response.status,i<5?201:429);
  if(i===5){assert.equal(response.headers.get('retry-after'),'3600');assert.equal((await response.json()).error.code,'RATE_LIMITED');}
 }
 console.log('PASS: staff rejection/owner privacy and shared five-submission quota with HTTP429.');
 const page=await api(`${base}/staff/items?limit=2`,{who:staff});assert.equal(page.data.length,2);assert.ok(page.page.nextCursor);
 const next=await api(`${base}/staff/items?limit=2&cursor=${encodeURIComponent(page.page.nextCursor)}`,{who:staff});
 assert.ok(next.data.every(row=>!page.data.some(old=>old.id===row.id)));
 const revoked=await db(await admin.from('memberships').delete().eq('user_id',staff.id));void revoked;
 await api(`${base}/staff/items`,{who:staff,status:404});
 console.log('PASS: withdraw/cancel/archive branches, self-review denial, cursor paging and live membership revocation.');
}finally{
 for(const org of orgs){
  for(const table of ['audit_events','claims','item_photos','item_private_details','items','memberships'])await db(await admin.from(table).delete().eq('organization_id',org.id));
  await db(await admin.from('organizations').delete().eq('id',org.id));
 }
 for(const id of users)await db(await admin.auth.admin.deleteUser(id));
}
