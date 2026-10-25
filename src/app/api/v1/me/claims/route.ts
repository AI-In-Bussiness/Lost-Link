import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApi(request, "own_claims");
}
