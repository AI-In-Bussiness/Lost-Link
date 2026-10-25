import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, localStatus } from './local-supabase.mjs';
loadLocalEnv();
const local = !process.env.NEXT_PUBLIC_SUPABASE_URL || ['localhost','127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
const status = local ? localStatus() : null;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || status?.API_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || status?.SERVICE_ROLE_KEY;
const password = process.env.LOSTLINK_DEMO_PASSWORD;
if (!url || !key || !password || password.length < 12) throw new Error('Provide project settings, an operator service-role key, and LOSTLINK_DEMO_PASSWORD (12+ characters) securely.');
const client = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
const accounts = [
 ['staff.maple@example.test','10000000-0000-4000-8000-000000000001','staff'],
 ['staff.cedar@example.test','10000000-0000-4000-8000-000000000002','staff'],
 ['admin.maple@example.test','10000000-0000-4000-8000-000000000001','admin'],
 ['claimant@example.test',null,null]
];
const {data:orgs,error:orgError}=await client.from('organizations').select('id');
if(orgError || !accounts.filter(([,org])=>org).every(([,org])=>orgs.some(x=>x.id===org))) throw new Error('Apply migrations and synthetic seed in the intended demo project first.');
for(const [email,organization_id,role] of accounts){
 const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});
 let user=data.user;
 if(error){
  let page=1;
  while(!user){
   const result=await client.auth.admin.listUsers({page,perPage:100});
   if(result.error) throw new Error('Could not inspect existing demo users.');
   user=result.data.users.find(x=>x.email===email);
   if(user || result.data.users.length<100) break;
   page++;
  }
  if(!user) throw new Error(`Could not create demo user ${email}.`);
 }
 const profile=await client.from('profiles').upsert({id:user.id,display_name:email.split('@')[0]},{onConflict:'id',ignoreDuplicates:true});
 if(profile.error) throw new Error('Demo profile provisioning failed.');
 if(organization_id){
  const membership=await client.from('memberships').upsert({organization_id,user_id:user.id,role},{onConflict:'organization_id,user_id',ignoreDuplicates:true});
  if(membership.error) throw new Error('Demo membership provisioning failed.');
 }
 console.log(`Prepared synthetic demo account: ${email} (existing passwords preserved)`);
}
