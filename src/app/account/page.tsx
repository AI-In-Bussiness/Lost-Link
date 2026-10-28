import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { organizationDisplayName } from "@/lib/organizations/display-name";
import LegalLinks from '../legal-links';

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Membership = { organization_id: string; role: string; organizations: { name: string; slug: string } | null };

export default async function AccountPage() {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/sign-in");
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/sign-in");
  const { data: memberships, error: membershipError } = await client.from("memberships")
    .select("organization_id, role, organizations(name,slug)").eq("user_id", user.id).returns<Membership[]>();
  const {data:owner}=await client.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  return <main id="main" className="mx-auto max-w-2xl px-6 py-16">
    <Link href="/" className="underline">LostLink home</Link>
    <h1 className="mt-8 text-3xl font-semibold">Your account</h1>
    <p className="mt-3">Signed in as {user.email}</p>
    <p className="mt-4"><Link href="/my/claims">View my claims</Link></p>
    {owner && <p className="mt-4"><Link href="/admin">Website administration — manage schools and staff</Link></p>}
    <h2 className="mt-8 text-xl font-semibold">Organization access</h2>
    {membershipError ? <p role="alert">Organization access could not be loaded. Please refresh to retry.</p> : memberships?.length ? <ul className="mt-3 grid gap-2">{memberships.map((membership) => <li key={membership.organization_id}>{membership.organizations ? organizationDisplayName({ id: membership.organization_id, ...membership.organizations }) : "Organization unavailable"} · {membership.role} {membership.organizations && <Link href={`/o/${membership.organizations.slug}/staff`}>Open staff workspace</Link>}</li>)}</ul> : <p className="mt-3">You have claimant access. No staff memberships are assigned.</p>}
    <form method="post" action="/api/auth/sign-out" className="mt-8"><button className="rounded border px-4 py-3" type="submit">Sign out</button></form>
    <LegalLinks />
  </main>;
}
