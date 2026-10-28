import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AdminOverview } from '@/lib/admin/contracts';
import AdminForm from './admin-form';
import {SchoolFields,Target} from './fields';

export const dynamic='force-dynamic';
export const revalidate=0;
export default async function AdminPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams;
 const client=await createSupabaseServerClient();
 if(!client) return <main id="main" className="container main-content"><h1>Owner settings unavailable</h1><p role="alert">The website could not connect to its database. Try again later.</p><Link href="/">LostLink home</Link></main>;
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError || !user)redirect('/sign-in?next=%2Fadmin');
 const {data,error}=await client.rpc('platform_admin_dispatch',{p_action:'overview',p_payload:{}});
 if(error) return <main id="main" className="container main-content"><Link href="/account">Your account</Link><h1>{error.message==='FORBIDDEN'?'Website-owner access required':'Owner settings unavailable'}</h1><p role="alert">{error.message==='FORBIDDEN'?'This account does not have website-owner access. School staff permissions do not grant owner access.':'Settings could not be loaded. Refresh to retry, or contact your website operator.'}</p></main>;
 const overview=data as AdminOverview;
 const school=overview.schools.find(s=>s.id===params.school);
 return <>
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="site-header"><div className="header-inner"><Link className="brand" href="/">LostLink.</Link><nav aria-label="Owner navigation" className="main-nav"><Link href="/account">Your account</Link><Link href="/admin" aria-current="page">Website administration</Link></nav><form action="/api/auth/sign-out" method="post"><button className="plain" type="submit">Sign out</button></form></div></header>
  <main id="main" className="container main-content owner-page">
   <section className="page-heading"><p className="eyebrow">Website owner · {user.email}</p><h1>Keep LostLink running.</h1><p>Manage schools, public settings and staff access.</p></section>
   {params.saved==='1' && <p role="status" className="notice">Changes saved.</p>}
   {params.error && <p role="alert" className="error-summary">The change could not be saved. Reload the school and check its current settings before retrying.</p>}
   <div className="two-column">
    <section className="stack" aria-labelledby="schools-heading"><h2 id="schools-heading">Schools</h2><p className="muted">Select a school to edit its settings or staff. Newly published schools appear on the homepage automatically.</p>
     {overview.schools.length ? <ul className="owner-school-list">{overview.schools.map(s=><li key={s.id}><Link href={`/admin?school=${s.id}`} aria-current={s.id===school?.id?'page':undefined}>{s.name}</Link><span className="muted">{s.published?'Published':'Hidden'} · /o/{s.slug}</span></li>)}</ul>:<p>No schools yet. Create your first school below.</p>}
     <details className="card"><summary>Create a school</summary><AdminForm label="Create a school"><input type="hidden" name="action" value="create_school" /><SchoolFields /><button className="button" type="submit">Create school</button></AdminForm></details>
    </section>
    {school ? <section className="stack" aria-labelledby="settings-heading"><h2 id="settings-heading">{school.name} settings</h2><p><Link href={`/o/${school.slug}/search`}>View public school page</Link> · <Link href={`/o/${school.slug}/staff`}>Open school workspace</Link></p><p className="muted">Website owners can work with inventory and claims in every school. School admins are restricted to their assigned schools.</p>
     <AdminForm key={`${school.id}-${school.settings_version}`} label="School settings"><input type="hidden" name="action" value="update_school" /><Target school={school} /><SchoolFields school={school} /><button className="button" type="submit">Save school settings</button></AdminForm>
     <h3>School staff access</h3><p>Assign an existing account after they register and confirm their email. Staff manage inventory and claims. School admins also manage settings and staff for their own school. Only website owners can manage all schools here.</p>
     <AdminForm label="Assign school access"><input type="hidden" name="action" value="set_member" /><Target school={school} /><div className="field"><label htmlFor="staff-email">Account email</label><input id="staff-email" name="email" type="email" maxLength={254} required /></div><div className="field"><label htmlFor="staff-role">School role</label><select id="staff-role" name="role"><option value="staff">School staff</option><option value="admin">School admin — this school only</option></select></div><button className="button" type="submit">Save school access</button></AdminForm>
     {overview.members.filter(m=>m.schoolId===school.id).map(m=><details className="card" key={m.userId}><summary>{m.email} · {m.role==='admin'?'School admin':'School staff'}</summary><AdminForm label={`Remove school access for ${m.email}`}><input type="hidden" name="action" value="remove_member" /><Target school={school} /><input type="hidden" name="userId" value={m.userId} /><label className="checkbox-row"><input type="checkbox" name="confirm" value="remove" required /> Remove this person’s access to {school.name}. Their account and claim history are retained.</label><button className="button secondary" type="submit">Remove school access</button></AdminForm></details>)}
    </section>:<section className="notice"><h2>Choose a school</h2><p>Select a school to edit it, or create a new school. Schools start hidden unless you choose to publish them.</p></section>}
   </div>
   <section className="stack owner-audit" aria-labelledby="owners-heading"><h2 id="owners-heading">Website owners</h2><ul>{overview.owners.map(o=><li key={o.email}>{o.email}</li>)}</ul><p className="muted">These accounts can manage every school. Owner assignment is restricted to the secure operator setup.</p>
    <h2>Recent admin activity</h2><p className="muted">The latest 100 owner changes. School claim and item activity stays in its staff workspace.</p><ol className="owner-school-list">{overview.events.map(event=><li key={event.id}><strong>{({create_school:'School created',update_school:'School settings updated',set_member:'School access saved',remove_member:'School access removed',owners_bootstrapped:'Website owners configured'} as Record<string,string>)[event.action] ?? 'Admin change'}</strong><span>{overview.schools.find(s=>s.id===event.organization_id)?.name ?? 'Website'} · {event.actor_email ?? 'Secure operator'}{event.target_email ? ` · ${event.target_email}`:''}</span><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toISOString().replace('T',' ').slice(0,19)} UTC</time></li>)}</ol>
   </section>
  </main>
 </>;
}
