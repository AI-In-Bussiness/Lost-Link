import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { organizationDisplayName } from "@/lib/organizations/display-name";
import PaperFrame from "../paper-frame";

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
  return (
    <PaperFrame account>
      <main id="main" className="paper-page paper-page-account card">
        <section className="page-heading">
          <p className="eyebrow">Your LostLink notebook</p>
          <h1>Your account</h1>
          <p>Signed in as {user.email}</p>
        </section>
        <nav className="actions" aria-label="Account shortcuts">
          <Link className="button" href="/my/claims">
            View my claims
          </Link>
          {owner && (
            <Link className="button secondary" href="/admin">
              Website administration — manage schools and staff
            </Link>
          )}
        </nav>
        <h2>Organization access</h2>
        {membershipError ? (
          <p role="alert" className="error-summary">
            Organization access could not be loaded. Please refresh to retry.
          </p>
        ) : memberships?.length ? (
          <ul className="paper-access-list">
            {memberships.map((membership) => (
              <li key={membership.organization_id}>
                <div className="access-membership">
                  <strong>
                    {membership.organizations
                      ? organizationDisplayName({
                          id: membership.organization_id,
                          ...membership.organizations,
                        })
                      : "Organization unavailable"}
                  </strong>
                  <span className="badge">
                    {membership.role === "admin"
                      ? "School admin"
                      : "School staff"}
                  </span>
                </div>
                {membership.organizations && (
                  <div className="actions">
                    <Link
                      className="text-link"
                      href={`/o/${membership.organizations.slug}/staff`}
                    >
                      Open staff workspace
                    </Link>
                    {membership.role === "admin" && (
                      <Link
                        className="text-link"
                        href={`/o/${membership.organizations.slug}/staff/settings`}
                      >
                        School administration
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>You have claimant access. No staff memberships are assigned.</p>
        )}
        <form
          method="post"
          action="/api/auth/sign-out"
          className="paper-page-actions"
        >
          <button className="button secondary" type="submit">
            Sign out
          </button>
        </form>
      </main>
    </PaperFrame>
  );
}
