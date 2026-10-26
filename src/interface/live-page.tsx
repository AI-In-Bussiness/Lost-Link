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
      const { data } = await client.from("memberships").select("organizations(slug)").eq("user_id", user.id)
        .returns<{ organizations: { slug: string } | null }[]>();
      session = { name: user.email ?? "Your account", email: user.email ?? "",
        staffOrgSlugs: data?.flatMap(row => row.organizations ? [row.organizations.slug] : []) ?? [] };
    }
  }
  const configured = (process.env.LOSTLINK_ORGANIZATION_SLUGS ?? "maple-school,cedar-school").split(",").map(s => s.trim()).filter(Boolean);
  const slugs = [...new Set([...configured, ...(orgSlug ? [orgSlug] : []), ...(session?.staffOrgSlugs ?? [])])];
  return <LiveClient session={session} slugs={slugs} />;
}
