import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfiguration } from '@/lib/supabase/server';

// Called only after the request's owner gate. The database supplies exact paths;
// callers cannot use the service credential to delete arbitrary storage objects.
export async function cleanupSchoolPhotos(): Promise<boolean> {
 const config=supabaseConfiguration();
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!config || !key)return true;
 try{
  const client=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:rows,error}=await client.from('school_photo_cleanup').select('bucket_id,storage_path').limit(100);
  if(error || !rows)return true;
  for(const bucket of ['item-public','item-staging']){
   const paths=rows.filter(row=>row.bucket_id===bucket).map(row=>row.storage_path);
   if(!paths.length)continue;
   const removed=await client.storage.from(bucket).remove(paths);
   if(removed.error)continue;
   await client.from('school_photo_cleanup').delete().eq('bucket_id',bucket).in('storage_path',paths);
  }
  const remaining=await client.from('school_photo_cleanup').select('storage_path').limit(1);
  return !!remaining.error || !!remaining.data?.length;
 }catch{return true;}
}
