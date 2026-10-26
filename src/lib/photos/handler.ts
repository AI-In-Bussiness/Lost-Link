import "server-only";
import { randomUUID } from "node:crypto";
import { type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeCursor, encodeCursor, queryObject, slug, uuid } from "@/lib/api/contracts";
import { BodyError, readJsonBody } from "@/lib/api/body";
import { ImageError } from "./image";
import { databasePhotoError, downloadVerifiedPhoto, MAX_PHOTO_BYTES, PhotoError, photoMetadata, storeProcessedPhoto } from "./service";

type PhotoAction = "upload" | "list" | "publish" | "staff_content" | "public_content" | "activity";
const paging = z.strictObject({
  limit: z.preprocess((value) => typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : value, z.number().int().min(1).max(50)).default(20),
  cursor: z.string().max(100).optional(),
  itemId: uuid.optional(),
});
const emptyQuery = z.strictObject({});
const reviewBody = z.strictObject({ reviewed: z.literal(true) });
const MAX_MULTIPART_BYTES = MAX_PHOTO_BYTES + 16 * 1024;

async function uploadBytes(request: Request): Promise<Buffer> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !/^multipart\/form-data\s*;/i.test(contentType)) throw new PhotoError(415, "UNSUPPORTED_MEDIA_TYPE", "Use a multipart file upload.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_MULTIPART_BYTES)) throw new PhotoError(413, "PAYLOAD_TOO_LARGE", "The upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoError(400, "VALIDATION_ERROR", "Choose a photo to upload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_MULTIPART_BYTES) { await reader.cancel(); throw new PhotoError(413, "PAYLOAD_TOO_LARGE", "The upload is too large."); }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Request("http://localhost/upload", { method: "POST", headers: { "Content-Type": contentType }, body: Buffer.concat(chunks, size) }).formData();
  } catch {
    throw new PhotoError(400, "VALIDATION_ERROR", "Use a valid multipart file upload.");
  }
  const entries = [...form.entries()];
  if (entries.length !== 1 || entries[0][0] !== "file" || !(entries[0][1] instanceof File)) throw new PhotoError(400, "VALIDATION_ERROR", "Upload exactly one file named file.");
  const file = entries[0][1];
  if (!file.size) throw new PhotoError(400, "VALIDATION_ERROR", "Choose a photo to upload.");
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError(413, "PAYLOAD_TOO_LARGE", "Photos must be 4 MiB or smaller.");
  // Ignore the untrusted filename and MIME label. The decoder validates bytes.
  return Buffer.from(await file.arrayBuffer());
}

async function staffContext(client: SupabaseClient, orgSlug: string) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new PhotoError(authError?.status && authError.status >= 500 ? 503 : 401, authError?.status && authError.status >= 500 ? "UNAVAILABLE" : "UNAUTHORIZED", "Sign in to continue.");
  const { data: org, error: orgError } = await client.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (orgError) throw new PhotoError(503, "UNAVAILABLE", "Organization access is temporarily unavailable.");
  if (!org) throw new PhotoError(404, "NOT_FOUND", "Resource not found.");
  const { data: membership, error: membershipError } = await client.from("memberships").select("role").eq("organization_id", org.id).eq("user_id", user.id).maybeSingle();
  if (membershipError) throw new PhotoError(503, "UNAVAILABLE", "Organization access is temporarily unavailable.");
  if (!membership || !["staff", "admin"].includes(membership.role)) throw new PhotoError(404, "NOT_FOUND", "Resource not found.");
  return { actorId: user.id, organizationId: org.id as string };
}

export async function handlePhoto(request: NextRequest, action: PhotoAction, params: Record<string, string>) {
  const requestId = randomUUID();
  const headers = { "Cache-Control": "private, no-store", "X-Request-Id": requestId, "X-Content-Type-Options": "nosniff" };
  const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
  try {
    const orgSlug = slug.parse(params.orgSlug);
    const itemId = params.itemId ? uuid.parse(params.itemId).toLowerCase() : undefined;
    const photoId = params.photoId ? uuid.parse(params.photoId).toLowerCase() : undefined;
    let query: Record<string, string>;
    try { query = queryObject(request.nextUrl.searchParams); } catch { throw new PhotoError(400, "VALIDATION_ERROR", "Duplicate query parameters are not allowed."); }
    if (action !== "activity") emptyQuery.parse(query);
    if (request.method === "POST" && !isSameOrigin(request.headers.get("origin"), siteOrigin())) throw new PhotoError(403, "FORBIDDEN", "This operation is not allowed.");
    const client = await createSupabaseServerClient();
    if (!client) throw new PhotoError(503, "UNAVAILABLE", "Photos are temporarily unavailable.");
    const staff = action === "public_content" ? null : await staffContext(client, orgSlug);
    if (action === "activity") {
      const page = paging.parse(query);
      let cursor: string | undefined;
      if (page.cursor) { try { cursor = decodeCursor(page.cursor); } catch { throw new PhotoError(400, "VALIDATION_ERROR", "Invalid cursor."); } }
      if (page.itemId) {
        const { data, error } = await client.rpc("staff_item_activity", {p_org_slug: orgSlug, p_item_id: page.itemId, p_after: cursor ?? null, p_limit: page.limit});
        if (error) throw databasePhotoError(error);
        if (!Array.isArray(data?.data) || !data.page) throw new PhotoError(503, "UNAVAILABLE", "Activity is temporarily unavailable.");
        if (data.page.nextCursor) data.page.nextCursor = encodeCursor(data.page.nextCursor);
        return json(data);
      }
      let lookup = client.from("audit_events").select("id,actor_id,action,entity_type,entity_id,occurred_at,request_id,previous_status,new_status")
        .eq("organization_id", staff!.organizationId).order("id", { ascending: true }).limit(page.limit + 1);
      if (cursor) lookup = lookup.gt("id", cursor);
      const { data, error } = await lookup;
      if (error || !data) throw new PhotoError(503, "UNAVAILABLE", "Activity is temporarily unavailable.");
      const records = data.slice(0, page.limit);
      return json({ data: records.map((row) => ({ id: row.id, actorId: row.actor_id, action: row.action, entityType: row.entity_type, entityId: row.entity_id, occurredAt: row.occurred_at, requestId: row.request_id, previousStatus: row.previous_status, newStatus: row.new_status })), page: { nextCursor: data.length > page.limit ? encodeCursor(records.at(-1)!.id) : null } });
    }
    if (!itemId) throw new PhotoError(400, "VALIDATION_ERROR", "Invalid item.");
    if (action === "upload") {
      const bytes = await uploadBytes(request);
      return json(await storeProcessedPhoto({ actorId: staff!.actorId, orgSlug, itemId }, bytes), 201);
    }
    if (action === "list") {
      const { data, error } = await client.rpc("photo_list", { p_org_slug: orgSlug, p_item_id: itemId });
      if (error) throw databasePhotoError(error);
      if (!Array.isArray(data?.data)) throw new PhotoError(503, "UNAVAILABLE", "Photos are temporarily unavailable.");
      return json({ data: data.data.map((photo: { id: string; status: string; alt: string }) => ({ id: photo.id, status: photo.status, alt: photo.alt, url: `/api/v1/organizations/${orgSlug}/staff/items/${itemId}/photos/${photo.id}/content` })) });
    }
    if (!photoId) throw new PhotoError(400, "VALIDATION_ERROR", "Invalid photo.");
    if (action === "publish") {
      const body = reviewBody.parse(await readJsonBody(request));
      const { data, error } = await client.rpc("photo_publish", { p_org_slug: orgSlug, p_item_id: itemId, p_photo_id: photoId, p_reviewed: body.reviewed });
      if (error) throw databasePhotoError(error);
      if (data?.data?.id !== photoId || data?.data?.status !== "published") throw new PhotoError(503, "UNAVAILABLE", "Photos are temporarily unavailable.");
      return json({ data: { id: photoId, status: "published" } });
    }
    // p_staff=false remains mandatory on public URLs, even for a staff session.
    const metadata = await photoMetadata(client, orgSlug, itemId, photoId, action === "staff_content");
    const bytes = await downloadVerifiedPhoto(client, metadata, action === "public_content");
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers: { ...headers, "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="item-photo.webp"', "Content-Length": String(bytes.byteLength) } });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", requestId } }, 400);
    if (error instanceof PhotoError || error instanceof ImageError || error instanceof BodyError) {
      if (error.status === 429) Object.assign(headers, { "Retry-After": "3600" });
      return json({ error: { code: error.code, message: error.message, requestId } }, error.status);
    }
    return json({ error: { code: "UNAVAILABLE", message: "Photos are temporarily unavailable. Please try again.", requestId } }, 503);
  }
}
