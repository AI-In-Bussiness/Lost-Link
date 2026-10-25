import { existsSync, writeFileSync } from 'node:fs';
import { localStatus } from './local-supabase.mjs';
if (existsSync('.env.local')) throw new Error('.env.local exists; preserve it and configure manually.');
const s = localStatus();
if (!s.API_URL || !s.ANON_KEY) throw new Error('Local status did not contain API URL and public key.');
writeFileSync('.env.local', `NEXT_PUBLIC_SUPABASE_URL=${s.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${s.ANON_KEY}\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n`, {mode:0o600,flag:'wx'});
console.log('Created ignored .env.local with local public configuration only.');
