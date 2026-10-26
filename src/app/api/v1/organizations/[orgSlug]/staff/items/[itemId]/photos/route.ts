import { NextRequest } from "next/server";
import { handlePhoto } from "@/lib/photos/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  return handlePhoto(request, "list", await context.params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  return handlePhoto(request, "upload", await context.params);
}
