import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, siteOrigin } from '@/lib/auth/security';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cleanupSchoolPhotos } from '@/lib/admin/photo-cleanup';
import { readAdminCommand } from '@/lib/admin/contracts';

const headers = {'Cache-Control':'private, no-store'};
const errors: Record<string,{status:number;message:string}> = {
 UNAUTHORIZED:{status:401,message:'Sign in to your owner account to continue.'},
 FORBIDDEN:{status:403,message:'Website-owner access is required.'},
 VALIDATION_ERROR:{status:400,message:'Check all fields. Use a valid school address, email and time zone.'},
 CONFLICT:{status:409,message:'This school changed in another session. Refresh this page before saving again.'},
 ACCOUNT_NOT_READY:{status:400,message:'That person must register and confirm their email before you assign school access.'},
 NOT_FOUND:{status:404,message:'The school or staff membership is unavailable. Refresh to retry.'},
 LAST_SCHOOL_ADMIN:{status:409,message:'Keep at least one school admin. Assign another school admin before removing or changing your own access.'},
 UNAVAILABLE:{status:503,message:'Settings could not be saved. Your entries are still here; try again.'},
};
export async function handleAdministration(request: NextRequest, orgSlug?:string) {
 const fail = (code:string) => {
  const error=errors[code] ?? errors.UNAVAILABLE;
  if (request.headers.get('accept') === 'application/json') return NextResponse.json({error:{message:error.message}}, {status:error.status,headers});
  return NextResponse.redirect(new URL(`${orgSlug?`/o/${orgSlug}/staff/settings`:'/admin'}?error=${errors[code] ? code : 'UNAVAILABLE'}`,siteOrigin()),{status:303,headers});
 };
 try {
  if (!isSameOrigin(request.headers.get('origin'),siteOrigin())) return fail('FORBIDDEN');
  const client=await createSupabaseServerClient();
  if (!client) return fail('UNAVAILABLE');
  const {data:{user},error:authError}=await client.auth.getUser();
  if (authError || !user) return fail('UNAUTHORIZED');
  // Gate before parsing and independently inside the transactional database RPC.
  if(orgSlug){
   const gate=await client.rpc('school_admin_dispatch',{p_action:'overview',p_org_slug:orgSlug,p_payload:{}});
   if(gate.error)return fail(gate.error.code==='P0001'?gate.error.message:'UNAVAILABLE');
  }else{
   const {data:owner,error:ownerError}=await client.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
   if (ownerError) return fail('UNAVAILABLE');
   if (!owner) return fail('FORBIDDEN');
  }
  let command;
  try {command=await readAdminCommand(request);} catch {return fail('VALIDATION_ERROR');}
  const {action,...fields}=command;
  if(orgSlug && (action==='delete_school' || action==='cleanup_school_photos'))return fail('FORBIDDEN');
  if(action==='cleanup_school_photos'){
   const pending=await cleanupSchoolPhotos();
   const destination=pending?'/admin?cleanup=pending':'/admin?saved=1';
   return request.headers.get('accept')==='application/json'
    ? NextResponse.json({destination},{headers})
    : NextResponse.redirect(new URL(destination,siteOrigin()),{status:303,headers});
  }
  // The database also verifies school-deletion confirmation; membership removal
  // only needs the strict form boundary's confirmation.
  const payload={...fields};
  if (action!=='delete_school' && 'confirm' in payload) delete (payload as Partial<typeof payload>).confirm;
  const {data,error}=await client.rpc(orgSlug?'school_admin_dispatch':'platform_admin_dispatch',{p_action:action,p_payload:payload,...(orgSlug?{p_org_slug:orgSlug}:{})});
  if (error) return fail(error.code==='23505'?'CONFLICT':error.code==='P0001'?error.message:'UNAVAILABLE');
  const cleanupPending=action==='delete_school' && data.photoCleanupPending && await cleanupSchoolPhotos();
  const destination=action==='delete_school'
   ? `/admin?deleted=1${cleanupPending?'&cleanup=pending':''}`
   : (orgSlug?`/o/${orgSlug}/staff/settings?`:'/admin?')+new URLSearchParams({school:data.schoolId,saved:'1'});
  return request.headers.get('accept')==='application/json'
   ? NextResponse.json({destination},{headers})
   : NextResponse.redirect(new URL(destination,siteOrigin()),{status:303,headers});
 } catch {return fail('UNAVAILABLE');}
}
