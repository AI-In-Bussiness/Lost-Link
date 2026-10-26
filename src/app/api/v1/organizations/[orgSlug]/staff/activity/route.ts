import { NextRequest } from "next/server";
import { handlePhoto } from "@/lib/photos/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ orgSlug: string }> }) {
  return handlePhoto(request, "activity", await context.params);
}
