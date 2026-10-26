import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { supabaseBinary } from './supabase-binary.mjs';
export function loadLocalEnv() {
 if (existsSync('.env.local')) process.loadEnvFile('.env.local');
}
export function localStatus() {
 const binary = supabaseBinary();
 try { return JSON.parse(execFileSync(binary, ['status', '-o', 'json'], {encoding:'utf8', stdio:['ignore','pipe','pipe']})); }
 catch { throw new Error('Local Supabase is unavailable. Run npm run db:start first.'); }
}
