import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
// Only the dedicated local Supabase container. Each suite rolls back its fixtures.
for(const suite of ['foundation.sql','backend.sql','photos.sql','overseer.sql','semantic.sql']){
 console.log(`Database suite: ${suite}`);
 const result=spawnSync('docker',['exec','-i','supabase_db_lost-link','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{
  input:readFileSync(new URL(`../supabase/tests/${suite}`,import.meta.url)),encoding:'utf8',stdio:['pipe','inherit','inherit']
 });
 if(result.error)console.error('Could not execute database tests:',result.error.message);
 if(result.status!==0)process.exit(result.status??1);
}
