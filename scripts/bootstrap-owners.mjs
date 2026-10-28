// Privileged operator setup only. Never imported by application routes.
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv,localStatus } from './local-supabase.mjs';
loadLocalEnv();
const emails=(process.env.LOSTLINK_OWNER_EMAILS ?? '').split(',').map(s=>s.trim().toLowerCase());
if(emails.length!==2 || new Set(emails).size!==2 || emails.some(s=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)))throw Error('Set LOSTLINK_OWNER_EMAILS securely to exactly two different registered, confirmed email addresses.');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url)throw Error('Set NEXT_PUBLIC_SUPABASE_URL for the intended project.');
const local=['localhost','127.0.0.1'].includes(new URL(url).hostname);
const key=process.env.SUPABASE_SERVICE_ROLE_KEY ?? (local?localStatus().SERVICE_ROLE_KEY:undefined);
if(!key)throw Error('Provide the intended project service-role key through secure operator settings.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.rpc('bootstrap_platform_admins',{p_emails:emails});
if(error)throw Error(['BOTH_ACCOUNTS_MUST_EXIST_AND_BE_CONFIRMED','OWNERS_ALREADY_CONFIGURED'].includes(error.message)?error.message:'Owner setup failed. Check the pending migration and intended project.');
if(data!==2)throw Error('Owner setup did not confirm both accounts.');
console.log('Both confirmed accounts have website-owner access. Existing passwords are unchanged.');
