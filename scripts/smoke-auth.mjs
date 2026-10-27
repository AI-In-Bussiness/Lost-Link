import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
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
function applyCookies(jar,response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0], split=pair.indexOf('=');jar.set(pair.slice(0,split),pair.slice(split+1));}}
function cookieHeader(jar){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ');}
async function confirmationLink(email){
 const mailOrigin=new URL(status.MAILPIT_URL || status.INBUCKET_URL || 'http://127.0.0.1:54324');
 assert.ok(['127.0.0.1','localhost'].includes(mailOrigin.hostname),'Mail tests must stay local');
 const mailbox=email.split('@')[0];
 for(let attempt=0;attempt<40;attempt++){
  let text='';
  const mailpit=await fetch(new URL('/api/v1/messages',mailOrigin));
  if(mailpit.ok){
   const inbox=await mailpit.json();
   const entry=inbox.messages.find(message=>message.To.some(recipient=>recipient.Address===email));
   if(entry)text=(await (await fetch(new URL(`/api/v1/message/${entry.ID}`,mailOrigin))).json()).Text;
  }else{
   const list=await fetch(new URL(`/api/v1/mailbox/${mailbox}`,mailOrigin));
   if(list.ok){
    const messages=await list.json();
    if(messages.length)text=(await (await fetch(new URL(`/api/v1/mailbox/${mailbox}/${messages.at(-1).id}`,mailOrigin))).json()).body.text;
   }
  }
  if(text){
    const links=text.match(/https?:\/\/[^\s<>"']+/g) || [];
    const link=links.map(value=>new URL(value)).find(url=>url.origin===new URL(status.API_URL).origin && url.pathname==='/auth/v1/verify');
    assert.ok(link,'Local confirmation email must contain an Auth verification link');
    return link;
  }
  await setTimeout(250);
 }
 throw new Error('Local confirmation email did not arrive.');
}
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
 const signupPath='/api/auth/sign-up';
 const signupEmail=`signup-${randomUUID()}@example.test`, signupPassword=randomBytes(24).toString('base64url');
 const signupBody=new URLSearchParams({email:signupEmail,password:signupPassword,next:'/my/claims'});
 const signupPost=(body,origin=site)=>fetch(`${site}${signupPath}`,{method:'POST',headers:{origin},body,redirect:'manual'});
 assert.equal((await signupPost(signupBody,'https://attacker.invalid')).status,403);
 for(const body of [new URLSearchParams({email:signupEmail,password:'short'}),new URLSearchParams({...Object.fromEntries(signupBody),role:'admin'}),new URLSearchParams('email=bad&password=long-enough-password'),new URLSearchParams(`email=${signupEmail}&email=other@example.test&password=${signupPassword}`)]){
  const response=await signupPost(body);
  assert.equal(response.status,303);
  assert.equal(new URL(response.headers.get('location')).searchParams.get('error'),'invalid');
 }
 const signup=await signupPost(signupBody);
 const users=await check(await admin.auth.admin.listUsers({page:1,perPage:1000}));
 const registered=users.users.find(user=>user.email===signupEmail);
 if(registered)userIds.push(registered.id);
 assert.equal(signup.status,303);
 const signupLocation=new URL(signup.headers.get('location'));
 assert.equal(signupLocation.pathname,'/sign-up');
 assert.equal(signupLocation.searchParams.get('status'),'sent');
 assert.equal(signupLocation.searchParams.get('next'),'/my/claims');
 assert.ok(signup.headers.get('cache-control').includes('no-store'));
 assert.ok(registered,'Website registration must create an Auth user');
 assert.ok(!registered.email_confirmed_at,'Registration must require email confirmation');
 const unconfirmed=await client().auth.signInWithPassword({email:signupEmail,password:signupPassword});
 assert.ok(unconfirmed.error && !unconfirmed.data.session,'Unconfirmed registration must not sign in');
 const signupJar=new Map();applyCookies(signupJar,signup);
 const verification=await fetch(await confirmationLink(signupEmail),{redirect:'manual'});
 assert.equal(verification.status,303);
 const callback=new URL(verification.headers.get('location'));
 assert.equal(callback.origin,site);assert.equal(callback.pathname,'/auth/callback');
 assert.ok(callback.searchParams.has('code'),'Confirmation must return a PKCE code');
 const confirmed=await fetch(callback,{headers:{cookie:cookieHeader(signupJar)},redirect:'manual'});
 assert.equal(confirmed.status,303);
 assert.equal(new URL(confirmed.headers.get('location')).pathname,'/my/claims');
 assert.ok(confirmed.headers.get('cache-control').includes('no-store'));
 applyCookies(signupJar,confirmed);
 const newAccount=await fetch(`${site}/account`,{headers:{cookie:cookieHeader(signupJar)},redirect:'manual'});
 assert.equal(newAccount.status,200);
 assert.ok((await newAccount.text()).includes('You have claimant access. No staff memberships are assigned.'));
 assert.equal((await fetch(`${site}/api/v1/organizations/maple-school/staff/items`,{headers:{cookie:cookieHeader(signupJar)}})).status,404);
 const registeredClient=client();
 await check(await registeredClient.auth.signInWithPassword({email:signupEmail,password:signupPassword}));
 assert.equal((await check(await registeredClient.from('memberships').select('*'))).length,0);
 assert.ok((await registeredClient.from('memberships').insert({organization_id:'10000000-0000-4000-8000-000000000001',user_id:registered.id,role:'admin'})).error);
 const replay=await fetch(callback,{headers:{cookie:cookieHeader(signupJar)},redirect:'manual'});
 assert.equal(new URL(replay.headers.get('location')).searchParams.get('error'),'confirmation');
 const maliciousCallback=await fetch(`${site}/auth/callback?code=invalid&next=https://attacker.invalid`,{redirect:'manual'});
 const rejectedLocation=new URL(maliciousCallback.headers.get('location'));
 assert.equal(rejectedLocation.origin,site);assert.equal(rejectedLocation.searchParams.get('next'),'/account');
 console.log('PASS: website signup, input/CSRF rejection, real email confirmation, PKCE cookies, claimant-only access and callback replay denial.');
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
 applyCookies(jar,login);
 assert.ok(jar.size>0,'Login must set session cookies');
 const account=await fetch(`${site}/account`,{headers:{cookie:cookieHeader(jar)},redirect:'manual'});
 assert.equal(account.status,200);
 const html=await account.text();
 assert.ok(html.includes(credentials.email) && html.includes('Maple School'));
 assert.ok(account.headers.get('cache-control').includes('no-store'));
 const logout=await fetch(`${site}/api/auth/sign-out`,{method:'POST',headers:{origin:site,cookie:cookieHeader(jar)},redirect:'manual'});
 assert.equal(logout.status,303);applyCookies(jar,logout);
 const after=await fetch(`${site}/account`,{headers:{cookie:cookieHeader(jar)},redirect:'manual'});
 assert.equal(after.status,307);
 console.log('PASS: protected page, CSRF rejection, SSR sign-in cookies, safe redirect, no-store and sign-out.');
}finally{
 if(userIds.length){
  await check(await admin.from('memberships').delete().in('user_id',userIds));
  for(const id of userIds)await check(await admin.auth.admin.deleteUser(id));
 }
}
