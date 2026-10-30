// Local-only owner acceptance with real Auth/database; cleans up only its own fixtures.
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { createHash,randomBytes,randomUUID } from 'node:crypto';
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
 const legacyAdmin=await actor();
 const legacySchool=(await db(await admin.from('organizations').insert({slug:slug+'-legacy',name:'Fictional legacy school',published:false}).select('id')))[0];
 await db(await admin.from('memberships').insert({organization_id:legacySchool.id,user_id:legacyAdmin.id,role:'admin'}));
 const otherSchool=(await db(await admin.from('organizations').insert({slug:slug+'-other',name:'Fictional other school',published:false}).select('id')))[0];
 const fixtures={legacySchoolId:legacySchool.id,otherSchoolId:otherSchool.id,origin:'http://localhost:3000',slug,one:await actor(true),two:await actor(true),staff:await actor(),claimant:await actor(),legacyAdmin};
 const deletionSchool=(await db(await admin.from('organizations').insert({slug:slug+'-delete',name:'Fictional Delete School',published:true}).select('id')))[0];
 const emptyDeletionSchool=(await db(await admin.from('organizations').insert({slug:slug+'-delete-empty',name:'Fictional Empty Delete School',published:false}).select('id')))[0];
 const itemId=randomUUID(),photoId=randomUUID();
 await db(await admin.from('items').insert({id:itemId,organization_id:deletionSchool.id,title:'Fictional bag',public_description:'Synthetic blue bag',category:'bag',color:'blue',public_location:'Office',found_date:'2026-01-01'}));
 await db(await admin.from('item_private_details').insert({item_id:itemId,organization_id:deletionSchool.id,identifying_details:'Synthetic private fact',storage_location:'Synthetic cupboard'}));
 await db(await admin.from('claims').insert({organization_id:deletionSchool.id,item_id:itemId,claimant_id:fixtures.claimant.id,evidence_text:'Synthetic ownership proof for deletion testing.'}));
 await db(await admin.from('memberships').insert({organization_id:deletionSchool.id,user_id:fixtures.staff.id,role:'staff'}));
 const photoPath=`${deletionSchool.id}/${itemId}/${photoId}.webp`;
 const photoBytes=await sharp({create:{width:2,height:2,channels:3,background:'blue'}}).webp().toBuffer();
 await db(await admin.storage.from('item-public').upload(photoPath,photoBytes,{contentType:'image/webp'}));
 await db(await admin.from('item_photos').insert({id:photoId,organization_id:deletionSchool.id,item_id:itemId,storage_path:photoPath,status:'pending',sha256:createHash('sha256').update(photoBytes).digest('hex'),byte_size:photoBytes.length,content_type:'image/webp'}));
 Object.assign(fixtures,{deletionSchoolId:deletionSchool.id,emptyDeletionSchoolId:emptyDeletionSchool.id,photoPath});
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
 if(process.exitCode===0){
  for(const table of ['organizations','items','claims','item_photos','item_private_details','memberships']){
   const column=table==='organizations'?'id':'organization_id';
   const rows=await db(await admin.from(table).select('*').in(column,[deletionSchool.id,emptyDeletionSchool.id]));
   if(rows.length)throw Error(`Deletion left records in ${table}.`);
  }
  const listed=await db(await admin.storage.from('item-public').list(`${deletionSchool.id}/${itemId}`));
  if(listed.some(object=>object.name===`${photoId}.webp`))throw Error('Deletion left photo bytes in Storage.');
  const queued=await db(await admin.from('school_photo_cleanup').select('storage_path').eq('storage_path',photoPath));
  if(queued.length)throw Error('Photo deletion still awaits cleanup.');
  const object=await admin.storage.from('item-public').download(photoPath);
  if(!object.error)throw Error('Deletion left photo bytes in Storage.');
  console.log('Permanent school deletion: database records and Storage bytes removed.');
 }

}finally{
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve));}
 try{
  const orgs=await db(await admin.from('organizations').select('id').in('slug',[slug,slug+'-legacy',slug+'-other',slug+'-delete',slug+'-delete-empty']));
  for(const org of orgs){
   const photos=await db(await admin.from('item_photos').select('storage_path').eq('organization_id',org.id));
   if(photos.length)await db(await admin.storage.from('item-public').remove(photos.map(p=>p.storage_path)));
   await db(await admin.from('claims').delete().eq('organization_id',org.id));
   await db(await admin.from('items').delete().eq('organization_id',org.id));
   await db(await admin.from('audit_events').delete().eq('organization_id',org.id));
   await db(await admin.from('platform_admin_events').delete().eq('organization_id',org.id));
   await db(await admin.from('memberships').delete().eq('organization_id',org.id));
   await db(await admin.from('organizations').delete().eq('id',org.id));
  }
  await db(await admin.from('platform_admin_events').delete().in('actor_id',users));
  for(const id of users){await db(await admin.from('platform_admins').delete().eq('user_id',id));await db(await admin.auth.admin.deleteUser(id));}
 }catch{process.exitCode=1;console.error('Temporary owner fixtures could not all be removed; inspect the local owner test accounts.');}
 rmSync(directory,{recursive:true,force:true});
}
