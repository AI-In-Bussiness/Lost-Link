import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {slug} from '@/lib/api/contracts';
import type {AdminOverview} from '@/lib/admin/contracts';
import AdminForm from '@/app/admin/admin-form';
import {SchoolFields,Target} from '@/app/admin/fields';
export const dynamic='force-dynamic';
export default async function SchoolSettings({params,searchParams}:{params:Promise<{orgSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
 const {orgSlug}=await params;
 if(!slug.safeParse(orgSlug).success)notFound();
 const path=`/o/${orgSlug}/staff/settings`;
 const query=await searchParams;
 const client=await createSupabaseServerClient();
 if(!client)return <main id="main" className="container main-content"><h1>School settings unavailable</h1><p role="alert">Try again later.</p></main>;
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect('/sign-in?next='+encodeURIComponent(path));
 const {data,error}=await client.rpc('school_admin_dispatch',{p_action:'overview',p_org_slug:orgSlug,p_payload:{}});
 if(error?.message==='NOT_FOUND')notFound();
 if(error)return <main id="main" className="container main-content"><h1>School settings unavailable</h1><p role="alert">Refresh to retry.</p></main>;
 const overview=data as AdminOverview;const school=overview.schools[0];const action=`/api/school-admin/${orgSlug}`;
 return <main id="main" className="container main-content owner-page stack">
  <nav aria-label="School administration"><Link href="/account">Your account</Link> · <Link href={`/o/${orgSlug}/staff`}>School workspace</Link> · <Link href={`/o/${orgSlug}/search`}>Public listings</Link></nav>
  <section className="page-heading"><p className="eyebrow">School administration · {user.email}</p><h1>{school.name} settings</h1><p>Manage settings and staff for this school. Website owners manage all schools.</p></section>
  {query.saved==='1' && <p role="status" className="notice">Changes saved.</p>}
  {query.error && <p role="alert" className="error-summary">The change could not be saved. Refresh and check the current settings.</p>}
  <div className="two-column">
   <section><h2>School settings</h2><AdminForm action={action} label="School settings"><input type="hidden" name="action" value="update_school" /><Target school={school}/><SchoolFields school={school}/><button className="button" type="submit">Save school settings</button></AdminForm></section>
   <section className="stack"><h2>School access</h2><p>Staff manage inventory and claims. School admins also manage this school’s settings and access. Neither role grants website ownership.</p>
    <AdminForm action={action} label="Assign school access"><input type="hidden" name="action" value="set_member"/><Target school={school}/><div className="field"><label htmlFor="member-email">Confirmed account email</label><input id="member-email" name="email" type="email" required maxLength={254}/></div><div className="field"><label htmlFor="member-role">School role</label><select id="member-role" name="role"><option value="staff">School staff</option><option value="admin">School admin — this school only</option></select></div><button className="button" type="submit">Save school access</button></AdminForm>
    <p className="muted">Keep at least one school admin. Website owners can restore access if needed.</p>
    {overview.members.map(m=><details className="card" key={m.userId}><summary>{m.email} · {m.role==='admin'?'School admin':'School staff'}</summary><AdminForm action={action} label={`Remove school access for ${m.email}`}><input type="hidden" name="action" value="remove_member"/><Target school={school}/><input type="hidden" name="userId" value={m.userId}/><label><input type="checkbox" name="confirm" value="remove" required/> Remove this person’s school access.</label><button className="button secondary" type="submit">Remove school access</button></AdminForm></details>)}
   </section>
  </div>
  <section className="owner-audit"><h2>Recent school administration</h2><ul className="owner-school-list">{overview.events.map(event=><li key={event.id}><span>{event.action==='update_school'?'School settings updated':event.action==='set_member'?'School access saved':event.action==='remove_member'?'School access removed':'School created'} · {event.actor_email ?? 'Website operator'}</span><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toISOString().slice(0,19).replace('T',' ')} UTC</time></li>)}</ul></section>
 </main>;
}
