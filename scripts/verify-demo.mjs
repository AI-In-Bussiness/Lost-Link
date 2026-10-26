import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, localStatus } from './local-supabase.mjs';
loadLocalEnv();
const local=!process.env.NEXT_PUBLIC_SUPABASE_URL||['localhost','127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
const status=local?localStatus():null;
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||status?.API_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||status?.ANON_KEY;
const password=process.env.LOSTLINK_DEMO_PASSWORD;
if(!url||!key||!password)throw Error('Configure public project settings and the existing demo password securely.');
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
const anon=client();
for(const [slug,id] of [['maple-school','20000000-0000-4000-8000-000000000001'],['cedar-school','20000000-0000-4000-8000-000000000002']]){
 const org=await anon.rpc('backend_dispatch',{p_action:'organization',p_org_slug:slug});
 assert.ok(!org.error&&org.data?.data?.slug===slug,'Published fictional school unavailable');
 const item=await anon.rpc('backend_dispatch',{p_action:'item',p_org_slug:slug,p_id:id});
 assert.ok(!item.error&&item.data?.data?.id===id,'Seed showcase item unavailable: use fresh intake for the claim journey, preserve seed listings');
 assert.ok(!('identifyingDetails' in item.data.data)&&!('storageLocation' in item.data.data),'Public item contains private fields');
}
const identities=[];
for(const [email,org,role] of [['staff.maple@example.test','10000000-0000-4000-8000-000000000001','staff'],['staff.cedar@example.test','10000000-0000-4000-8000-000000000002','staff'],['admin.maple@example.test','10000000-0000-4000-8000-000000000001','admin'],['claimant@example.test',null,null]]){
 const scoped=client();
 const {data,error}=await scoped.auth.signInWithPassword({email,password});
 assert.ok(!error&&data.user,`Demo sign-in failed for ${email}; provisioning preserves passwords, it does not reset them`);
 const memberships=await scoped.from('memberships').select('organization_id,role');
 assert.equal(memberships.error,null);
 assert.deepEqual(memberships.data,org?[{organization_id:org,role}]:[],`Unexpected demo membership: ${email}`);
 const foreign=await scoped.rpc('backend_dispatch',{p_action:'staff_items',p_org_slug:org==='10000000-0000-4000-8000-000000000001'?'cedar-school':'maple-school'});
 assert.ok(foreign.error,'Wrong-school staff access unexpectedly allowed');
 const own=await scoped.rpc('backend_dispatch',{p_action:'own_claims'});
 assert.ok(!own.error&&Array.isArray(own.data?.data),'Claim receipt access unavailable');
 identities.push({email,id:data.user.id});
 await scoped.auth.signOut();
}
if(process.argv.includes('--app')){
 const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000');
 assert.ok(origin.protocol==='https:'||['localhost','127.0.0.1'].includes(origin.hostname),'Remote app checks require HTTPS');
 for(const path of ['/','/sign-in','/api/v1/organizations/maple-school']){
  const result=await fetch(new URL(path,origin),{redirect:'error',signal:AbortSignal.timeout(15000)});
  assert.equal(result.status,200,`Application preflight failed: ${path}`);
 }
}
console.log(JSON.stringify({check:'demo-preflight',schools:2,accounts:identities,publicProjection:'passed',crossSchoolDenial:'passed'},null,2));
