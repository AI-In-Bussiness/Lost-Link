import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { readdirSync,readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { localStatus,loadLocalEnv } from './local-supabase.mjs';
loadLocalEnv();
const s=localStatus(),site='http://localhost:3000';
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==s.API_URL || !['127.0.0.1','localhost'].includes(new URL(s.API_URL).hostname))throw new Error('Photo tests require local Supabase settings.');
const admin=createClient(s.API_URL,s.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(s.API_URL,s.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const orgs=[],users=[],items=[];
async function db(r){if(r.error)throw new Error(`Photo fixture failure (${r.error.code||'unknown'}).`);return r.data;}
async function actor(org=null){
 const email=`photos-${randomUUID()}@example.test`,password=randomBytes(24).toString('base64url');
 const {user}=await db(await admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
 if(org)await db(await admin.from('memberships').insert({organization_id:org.id,user_id:user.id,role:'staff'}));
 const r=await fetch(`${site}/api/auth/sign-in`,{method:'POST',headers:{origin:site},body:new URLSearchParams({email,password}),redirect:'manual'});
 assert.equal(r.status,303);assert.equal(new URL(r.headers.get('location')).pathname,'/account');
 return {id:user.id,email,password,cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};
}
function photoForm(bytes,filename='found-item.jpg',type='image/jpeg'){
 const f=new FormData();f.append('file',new Blob([bytes],{type}),filename);return f;
}
async function request(path,{who,method='GET',body,expected=200,origin=site,base=site}={}){
 const headers={};if(who)headers.cookie=who.cookie;
 if(method!=='GET')headers.origin=origin;
 if(body!==undefined && !(body instanceof FormData)){headers['content-type']='application/json';body=JSON.stringify(body);}
 const r=await fetch(`${base}/api/v1${path}`,{method,headers,body});
 const json=await r.json();assert.equal(r.status,expected,`${method} ${path} -> ${r.status} (${json.error?.code||'success'})`);
 assert.ok(r.headers.get('cache-control')?.includes('no-store'));
 if(expected>=400){assert.ok(json.error.requestId);assert.ok(json.error.code);}
 return json;
}
async function content(path,{who,expected=200,base=site}={}){
 const r=await fetch(base+path,{headers:who?{cookie:who.cookie}:{}});
 assert.equal(r.status,expected,`Photo content ${path} -> ${r.status}`);
 assert.ok(r.headers.get('cache-control')?.includes('no-store'));
 if(expected!==200){const error=await r.json();assert.ok(error.error.requestId);return null;}
 assert.equal(r.headers.get('content-type'),'image/webp');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 return Buffer.from(await r.arrayBuffer());
}
async function withoutProcessor(callback){
 const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(3001,'localhost',()=>probe.close(resolve));});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3001'],{env:{...process.env,SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','ignore','inherit']});
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)throw new Error('Missing-processor test server exited.');
   try{if((await fetch('http://localhost:3001')).ok){ready=true;break;}}catch{}
   await setTimeout(300);
  }
  assert.ok(ready);await callback('http://localhost:3001');
 }finally{server.kill('SIGTERM');}
}
try{
 for(const name of ['One','Two']){
  const org={id:randomUUID(),slug:`photos-${randomUUID()}`,name:`Synthetic Photos ${name}`,published:true};
  await db(await admin.from('organizations').insert(org));orgs.push(org);
 }
 const [a,b]=orgs,staff=await actor(a),foreign=await actor(b),claimant=await actor();
 const base=`/organizations/${a.slug}`,proof='Synthetic hidden dinosaur inside the inner pocket.';
 const fields={title:'Synthetic blue backpack',publicDescription:'A blue sports backpack with a white logo.',category:'bag',color:'blue',publicLocation:'Gym',foundDate:'2026-01-01',identifyingDetails:proof,storageLocation:'Private synthetic cabinet'};
 const item=(await request(`${base}/staff/items`,{who:staff,method:'POST',body:fields,expected:201})).data;items.push({id:item.id,org:a});
 const photos=`${base}/staff/items/${item.id}/photos`;
 const original=await sharp({create:{width:40,height:20,channels:3,background:'#225599'}})
  .withMetadata({orientation:6,exif:{IFD0:{ImageDescription:'Synthetic private metadata'}}}).jpeg().toBuffer();
 await request(photos,{method:'POST',body:photoForm(original),expected:401});
 await request(photos,{who:foreign,method:'POST',body:photoForm(original),expected:404});
 await request(photos,{who:claimant,method:'POST',body:photoForm(original),expected:404});
 await request(photos,{who:staff,method:'POST',body:photoForm(original),origin:'https://attacker.invalid',expected:403});
 const extra=photoForm(original);extra.append('organizationId',b.id);
 await request(photos,{who:staff,method:'POST',body:extra,expected:400});
 await request(photos,{who:staff,method:'POST',body:photoForm(Buffer.from('<html>not an image</html>'),'spoof.png','image/png'),expected:415});
 assert.equal((await db(await admin.from('item_photos').select('id').eq('item_id',item.id))).length,0,'Failed decode must release its slot');
 const oversized=await fetch(`${site}/api/v1${photos}`,{method:'POST',headers:{origin:site,cookie:staff.cookie,'content-type':'multipart/form-data; boundary=test'},body:new ReadableStream({start(c){c.enqueue(Buffer.alloc(4*1024*1024+16385));c.close();}}),duplex:'half'});
 assert.equal(oversized.status,413);
 await request(photos,{who:staff,method:'POST',body:photoForm(Buffer.alloc(4*1024*1024+1)),expected:413});
 const photo=(await request(photos,{who:staff,method:'POST',body:photoForm(original,'../../arbitrary.svg','image/jpeg'),expected:201})).data;
 assert.equal(photo.status,'pending');
 const publicPath=`/api/v1${base}/items/${item.id}/photos/${photo.id}/content`,staffPath=`/api/v1${photos}/${photo.id}/content`;
 await content(publicPath,{expected:404});await content(publicPath,{who:staff,expected:404});
 await content(staffPath,{expected:401});await content(staffPath,{who:foreign,expected:404});
 const preview=await content(staffPath,{who:staff}),metadata=await sharp(preview).metadata();
 assert.equal(metadata.format,'webp');assert.equal(metadata.width,20);assert.equal(metadata.height,40);
 assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.orientation,undefined);
 assert.ok(!preview.includes(Buffer.from('Synthetic private metadata')));
 assert.equal((await request(`${base}/items/${item.id}`)).data.photos.length,0);
 const list=await request(photos,{who:staff});assert.equal(list.data.length,1);assert.equal(list.data[0].status,'pending');
 await request(`${photos}/${photo.id}/publish`,{who:staff,method:'POST',body:{reviewed:false},expected:400});
 await request(`${photos}/${photo.id}/publish`,{who:foreign,method:'POST',body:{reviewed:true},expected:404});
 await request(`${photos}/${photo.id}/publish`,{who:staff,method:'POST',body:{reviewed:true}});
 await request(`${photos}/${photo.id}/publish`,{who:staff,method:'POST',body:{reviewed:true}});
 const published=(await request(`${base}/items/${item.id}`)).data;
 assert.equal(published.photos.length,1);assert.equal(published.photos[0].url,publicPath);assert.equal(published.photos[0].alt,fields.title);
 assert.ok(!JSON.stringify(published).includes(proof));assert.deepEqual(await content(publicPath),preview);
 console.log('PASS: real multipart upload, decoding/EXIF removal, private review and explicit publication.');
 const row=(await db(await admin.from('item_photos').select('storage_path').eq('id',photo.id).single()));
 const scoped=createClient(s.API_URL,s.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 await db(await scoped.auth.signInWithPassword({email:staff.email,password:staff.password}));
 assert.ok((await scoped.storage.from('item-public').update(row.storage_path,Buffer.from('unprocessed'),{contentType:'image/webp'})).error,'Clients must not overwrite derivatives');
 await db(await admin.storage.from('item-public').update(row.storage_path,Buffer.from('tampered'),{contentType:'image/webp'}));
 await content(publicPath,{expected:503});
 await db(await admin.storage.from('item-public').update(row.storage_path,preview,{contentType:'image/webp'}));
 assert.deepEqual(await content(publicPath),preview);
 await withoutProcessor(async alternate=>{
  assert.deepEqual(await content(publicPath,{base:alternate}),preview);
  await request(`${base}/items/${item.id}`,{base:alternate});
  await request(photos,{who:staff,method:'POST',body:photoForm(original),expected:503,base:alternate});
 });
 console.log('PASS: immutable client storage, delivery integrity checks and reads without processor credentials.');
 const concurrent=await Promise.all([1,2,3].map(async()=>{
  const r=await fetch(`${site}/api/v1${photos}`,{method:'POST',headers:{origin:site,cookie:staff.cookie},body:photoForm(original)});
  return r.status;
 }));
 assert.deepEqual(concurrent.sort(),[201,201,409]);
 assert.equal((await request(photos,{who:staff})).data.length,3);
 const activity=await request(`${base}/staff/activity?limit=2`,{who:staff});
 assert.equal(activity.data.length,2);assert.ok(activity.page.nextCursor);
 const next=await request(`${base}/staff/activity?limit=2&cursor=${encodeURIComponent(activity.page.nextCursor)}`,{who:staff});
 assert.ok(next.data.every(x=>!activity.data.some(old=>x.id===old.id)));
 await request(`${base}/staff/activity`,{who:foreign,expected:404});
 const history=await db(await admin.from('audit_events').select('action').eq('organization_id',a.id));
 assert.equal(history.filter(x=>x.action==='photo_published').length,1);
 const safeHistory=await request(`${base}/staff/activity?limit=50`,{who:staff});assert.ok(!JSON.stringify(safeHistory).includes(proof));
 const claim=(await request(`${base}/items/${item.id}/claims`,{who:claimant,method:'POST',body:{evidenceText:proof},expected:201})).data;
 const approved=(await request(`${base}/staff/claims/${claim.id}/review`,{who:staff,method:'POST',body:{decision:'approve',expectedVersion:claim.version,privateNote:'Synthetic private review'}})).data;
 await content(publicPath,{expected:404});await content(publicPath,{who:staff,expected:404});
 assert.ok((await anon.storage.from('item-public').download(row.storage_path)).error);
 assert.deepEqual(await content(staffPath,{who:staff}),preview);
 await request(`${base}/staff/claims/${claim.id}/return`,{who:staff,method:'POST',body:{expectedVersion:approved.version,ownershipVerified:true}});
 assert.equal((await request(`${base}/staff/items/${item.id}`,{who:staff})).data.status,'returned');
 const own=await request('/me/claims',{who:claimant});assert.equal(own.data.find(x=>x.id===claim.id).status,'fulfilled');
 await content(publicPath,{expected:404});
 console.log('PASS: concurrent photo cap, private activity paging and photographed item claim/return persistence with public revocation.');
 for(const file of readdirSync('.next/static',{recursive:true}).filter(x=>/\.(?:js|json|html)$/.test(x))){
  assert.ok(!readFileSync('.next/static/'+file).includes(Buffer.from(s.SERVICE_ROLE_KEY)),'Processor key must never appear in browser assets');
 }
 console.log('PASS: processor credential absent from generated browser assets.');
}finally{
 for(const item of items){
  const folder=`${item.org.id}/${item.id}`;
  const result=await admin.storage.from('item-public').list(folder,{limit:100});
  if(result.error)throw new Error('Photo fixture Storage cleanup failed.');
  if(result.data.length)await db(await admin.storage.from('item-public').remove(result.data.map(x=>`${folder}/${x.name}`)));
 }
 for(const org of orgs){
  for(const table of ['audit_events','claims','item_photos','item_private_details','items','memberships'])await db(await admin.from(table).delete().eq('organization_id',org.id));
  await db(await admin.from('organizations').delete().eq('id',org.id));
 }
 for(const id of users)await db(await admin.auth.admin.deleteUser(id));
}
