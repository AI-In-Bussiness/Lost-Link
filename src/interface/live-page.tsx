import { createSupabaseServerClient } from "@/lib/supabase/server";
import LiveClient from "./live-client";
import type { Session } from "./types";

/** Server-verified display identity. API operations independently authorize the caller. */
export default async function LivePage({ orgSlug }: { orgSlug?: string }) {
  let session: Session | null = null;
  const client = await createSupabaseServerClient();
  if (client) {
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { data } = await client.from("memberships").select("role,organizations(slug)").eq("user_id", user.id)
        .returns<{ role:string; organizations: { slug: string } | null }[]>();
      const {data:owner} = await client.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
      const {data:allSchools}=owner?await client.from("organizations").select("slug"):{data:null};
      session = { schoolAdminOrgSlugs: owner?allSchools?.map(o=>o.slug) ?? []:data?.filter(row=>row.role==='admin').flatMap(row=>row.organizations?[row.organizations.slug]:[]) ?? [], websiteOwner: !!owner, name: user.email ?? "Your account", email: user.email ?? "",
        staffOrgSlugs: owner?allSchools?.map(o=>o.slug) ?? []:data?.flatMap(row => row.organizations ? [row.organizations.slug] : []) ?? [] };
    }
  }
  const configured = (process.env.LOSTLINK_ORGANIZATION_SLUGS ?? "maple-school,cedar-school").split(",").map(s => s.trim()).filter(Boolean);
  const slugs = [...new Set([...configured, ...(orgSlug ? [orgSlug] : []), ...(session?.staffOrgSlugs ?? [])])];
  return <LiveClient session={session} slugs={slugs} />;
}
