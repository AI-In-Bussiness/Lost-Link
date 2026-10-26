import { appendFileSync, chmodSync, existsSync } from 'node:fs';
import { localStatus, loadLocalEnv } from './local-supabase.mjs';
if(!existsSync('.env.local'))throw new Error('Run npm run env:local first. Existing settings are never replaced.');
loadLocalEnv();
const status=localStatus();
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==status.API_URL || !['127.0.0.1','localhost'].includes(new URL(status.API_URL).hostname))throw new Error('This helper configures only the local Supabase processor, never a hosted target.');
if(process.env.SUPABASE_SERVICE_ROLE_KEY){console.log('Processor credential already present; left unchanged.');}
else{
 if(!status.SERVICE_ROLE_KEY)throw new Error('Local processor credential unavailable; start local Supabase first.');
 appendFileSync('.env.local','\n# Trusted local photo processor only; never exposed through NEXT_PUBLIC_.\nSUPABASE_SERVICE_ROLE_KEY='+JSON.stringify(status.SERVICE_ROLE_KEY)+'\n');
 chmodSync('.env.local',0o600);
 console.log('Configured local photo processor in ignored owner-readable .env.local; value not displayed.');
}
