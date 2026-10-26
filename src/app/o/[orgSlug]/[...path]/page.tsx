import LivePage from "@/interface/live-page";
export const dynamic = "force-dynamic";
export default async function OrganizationPage({ params }: { params: Promise<{ orgSlug: string; path: string[] }> }) {
  const { orgSlug } = await params;
  return <LivePage orgSlug={orgSlug} />;
}
