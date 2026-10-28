import {NextRequest} from 'next/server';
import {handleAdministration} from '@/lib/admin/handler';
export const POST=(request:NextRequest)=>handleAdministration(request);
