import { NextRequest } from "next/server";
import { handlePhoto } from "@/lib/photos/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string; photoId: string }> }) {
  return handlePhoto(request, "publish", await context.params);
}
