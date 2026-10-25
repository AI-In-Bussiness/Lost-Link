import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  return handleApi(request, "archive_item", await context.params);
}
