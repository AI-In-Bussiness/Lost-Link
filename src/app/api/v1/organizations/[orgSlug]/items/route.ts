import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ orgSlug: string }> }) {
  return handleApi(request, "items", await context.params);
}
