import {NextRequest,NextResponse} from 'next/server';
import {handleAdministration} from '@/lib/admin/handler';
import {slug} from '@/lib/api/contracts';
export async function POST(request:NextRequest,{params}:{params:Promise<{orgSlug:string}>}) {
 const value=(await params).orgSlug;
 if(!slug.safeParse(value).success)return NextResponse.json({error:{message:'School unavailable.'}},{status:404,headers:{'Cache-Control':'private, no-store'}});
 return handleAdministration(request,value);
}
