import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localStatus, loadLocalEnv } from './local-supabase.mjs';
// Intentionally local-only: ephemeral confirmed identities, cleaned up even on failure.
loadLocalEnv();
const status=localStatus();
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==status.API_URL || (process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000')!=='http://localhost:3000')throw new Error('Live tests require local .env.local project settings and the localhost:3000 site origin. Hosted targets are not supported by this test.');
assert.ok(['127.0.0.1','localhost'].includes(new URL(status.API_URL).hostname));
const admin=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const site='http://localhost:3000';
const userIds=[];
function client(){return createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
async function check(result){if(result.error)throw new Error(`Supabase smoke fixture/query failed (code=${result.error.code || 'unknown'}, status=${result.error.status || 'unknown'}).`);return result.data;}
try{
 const identities=[];
 for(const [org,role] of [['10000000-0000-4000-8000-000000000001','staff'],['10000000-0000-4000-8000-000000000002','staff'],[null,null]]){
  const email=`smoke-${randomUUID()}@example.test`, password=randomBytes(24).toString('base64url');
  const data=await check(await admin.auth.admin.createUser({email,password,email_confirm:true}));
  userIds.push(data.user.id);
  if(org)await check(await admin.from('memberships').insert({organization_id:org,user_id:data.user.id,role}));
  const scoped=client();
  await check(await scoped.auth.signInWithPassword({email,password}));
  const rows=await check(await scoped.from('items').select('id,organization_id'));
  assert.equal(rows.length,org?1:0);
  assert.ok(rows.every(row=>row.organization_id===org));
  const escalation=await scoped.from('memberships').insert({organization_id:'10000000-0000-4000-8000-000000000001',user_id:data.user.id,role:'admin'});
  assert.ok(escalation.error,'Direct role escalation must fail');
  identities.push({email,password});
 }
 console.log('PASS: confirmed Auth users carry tenant/role permissions through real REST requests.');
 const anon=client();
 const signup=await anon.auth.signUp({email:`signup-${randomUUID()}@example.test`,password:randomBytes(24).toString('base64url')});
 assert.ok(signup.error,'Public signup must remain disabled');
 const publicItems=await check(await anon.rpc('list_public_items',{org_slug:'maple-school',page_size:20}));
 assert.equal(publicItems.length,1);
 assert.ok(!('created_by' in publicItems[0]) && !('identifying_details' in publicItems[0]));
 assert.ok((await anon.from('items').select('*')).error);
 console.log('PASS: public projection works; anonymous direct inventory reads denied.');
 const unauth=await fetch(`${site}/account`,{redirect:'manual'});
 assert.equal(unauth.status,307);
 assert.equal(new URL(unauth.headers.get('location'),site).pathname,'/sign-in');
 const credentials=identities[0];
 const body=new URLSearchParams({...credentials,next:'https://attacker.invalid'});
 const forbidden=await fetch(`${site}/api/auth/sign-in`,{method:'POST',headers:{origin:'https://attacker.invalid'},body,redirect:'manual'});
 assert.equal(forbidden.status,403);
 const login=await fetch(`${site}/api/auth/sign-in`,{method:'POST',headers:{origin:site},body,redirect:'manual'});
 assert.equal(login.status,303);
 assert.equal(new URL(login.headers.get('location')).pathname,'/account');
 const jar=new Map();
 function applyCookies(response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0], split=pair.indexOf('=');jar.set(pair.slice(0,split),pair.slice(split+1));}}
 function cookieHeader(){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ');}
 applyCookies(login);
 assert.ok(jar.size>0,'Login must set session cookies');
 const account=await fetch(`${site}/account`,{headers:{cookie:cookieHeader()},redirect:'manual'});
 assert.equal(account.status,200);
 const html=await account.text();
 assert.ok(html.includes(credentials.email) && html.includes('Maple School'));
 assert.ok(account.headers.get('cache-control').includes('no-store'));
 const logout=await fetch(`${site}/api/auth/sign-out`,{method:'POST',headers:{origin:site,cookie:cookieHeader()},redirect:'manual'});
 assert.equal(logout.status,303);applyCookies(logout);
 const after=await fetch(`${site}/account`,{headers:{cookie:cookieHeader()},redirect:'manual'});
 assert.equal(after.status,307);
 console.log('PASS: protected page, CSRF rejection, SSR sign-in cookies, safe redirect, no-store and sign-out.');
}finally{
 if(userIds.length){
  await check(await admin.from('memberships').delete().in('user_id',userIds));
  for(const id of userIds)await check(await admin.auth.admin.deleteUser(id));
 }
}
