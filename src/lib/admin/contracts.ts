import { z } from 'zod';
import { readBoundedBody } from '@/lib/http/body';

const id = z.uuid();
const version = z.string().regex(/^[1-9]\d{0,8}$/).transform(Number);
const settings = {
 name: z.string().trim().min(1).max(100),
 timezone: z.string().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat('en', {timeZone:value}); return true; } catch { return false; }
 }, 'Choose a valid time zone, such as America/New_York.'),
 contactEmail: z.union([z.literal(''), z.email().max(254)]),
 collectionInstructions: z.string().trim().max(1000),
 published: z.enum(['true','false']).transform(value => value === 'true'),
};
export const adminCommand = z.discriminatedUnion('action', [
 z.strictObject({action:z.literal('create_school'), ...settings, slug:z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)}),
 z.strictObject({action:z.literal('update_school'), schoolId:id, expectedVersion:version, ...settings}),
 z.strictObject({action:z.literal('set_member'), schoolId:id, expectedVersion:version, email:z.email().max(254), role:z.literal('staff')}),
 z.strictObject({action:z.literal('remove_member'), schoolId:id, expectedVersion:version, userId:id, confirm:z.literal('remove')}),
]);
export async function readAdminCommand(request: Request) {
 if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') throw Error('VALIDATION_ERROR');
 const bytes = await readBoundedBody(request, 16_384);
 const form = new URLSearchParams(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
 const input: Record<string,string> = Object.create(null);
 for (const [key,value] of form) {
  if (Object.hasOwn(input,key)) throw Error('VALIDATION_ERROR');
  input[key]=value;
 }
 return adminCommand.parse(input);
}
export type AdminSchool = {id:string; name:string; slug:string; timezone:string; published:boolean; contact_email:string; collection_instructions:string; settings_version:number};
export type AdminOverview = {
 schools: AdminSchool[];
 members: {schoolId:string;userId:string;email:string;role:'staff'|'admin'}[];
 owners: {email:string}[];
 events: {id:string;organization_id:string|null;action:string;actor_email:string|null;target_email:string|null;details:Record<string,unknown>;occurred_at:string}[];
};
