import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function GET() {
 const headers={'Cache-Control':'private, no-store'};
 try {
  const client=await createSupabaseServerClient();
  if(client){
   const {data,error}=await client.rpc('school_directory');
   if(!error && Array.isArray(data?.data))return NextResponse.json(data,{headers});
  }
 }catch { /* Keep provider details private. */ }
 return NextResponse.json({error:{code:'UNAVAILABLE',message:'The school directory is unavailable.'}},{status:503,headers});
}
