import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  return handleApi(request, "staff_item", await context.params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  return handleApi(request, "update_item", await context.params);
}
