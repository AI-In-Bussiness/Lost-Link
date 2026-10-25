import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ orgSlug: string; claimId: string }> }) {
  return handleApi(request, "withdraw_claim", await context.params);
}
