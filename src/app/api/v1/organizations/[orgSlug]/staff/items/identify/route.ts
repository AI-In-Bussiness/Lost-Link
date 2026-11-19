import { NextRequest } from "next/server";
import { handlePhoto } from "@/lib/photos/handler";
import { identifyItem, isItemIdentificationConfigured, ItemIdentificationError } from "@/lib/photos/identify";
import { sanitizeImage } from "@/lib/photos/image";
import { PhotoError } from "@/lib/photos/service";
import { uploadBytes } from "@/lib/photos/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ orgSlug: string }> }) {
  return handlePhoto(request, async () => {
    try {
      if (!isItemIdentificationConfigured()) throw new ItemIdentificationError(503);
      const image = await sanitizeImage(await uploadBytes(request));
      return { data: await identifyItem(image, request.signal) };
    } catch (error) {
      if (error instanceof ItemIdentificationError) throw new PhotoError(error.status, error.code, error.message);
      throw error;
    }
  }, await context.params);
}
