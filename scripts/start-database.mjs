import { spawnSync } from 'node:child_process';
const binary=process.platform==='win32'?'node_modules/.bin/supabase.cmd':'node_modules/.bin/supabase';
// The CLI prints local API keys in its success table; suppress that table.
// Keep startup/error diagnostics, and preserve the underlying exit status.
const result=spawnSync(binary,['start','-x','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],{stdio:['ignore','ignore','inherit']});
if(result.error)console.error('Could not start local Supabase:',result.error.message);
if(result.status===0)console.log('Local Supabase services started.');
process.exit(result.status??1);
