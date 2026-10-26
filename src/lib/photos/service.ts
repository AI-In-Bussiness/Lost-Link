import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { supabaseConfiguration } from "@/lib/supabase/server";
import { sanitizeImage } from "./image";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_BUCKET = "item-public";
export class PhotoError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const failureStatuses: Record<string, number> = { VALIDATION_ERROR: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429 };
export function databasePhotoError(error: { code?: string; message?: string }): PhotoError {
  if (error.code === "P0001" && error.message && failureStatuses[error.message]) {
    return new PhotoError(failureStatuses[error.message], error.message, "The photo operation could not be completed.");
  }
  return new PhotoError(503, "UNAVAILABLE", "Photos are temporarily unavailable. Please try again.");
}

function processingClient() {
  const config = supabaseConfiguration();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw new PhotoError(503, "UNAVAILABLE", "Photo processing is temporarily unavailable.");
  // This narrowly scoped processor is never used for ordinary user queries.
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export type SanitizedPhoto = { bytes: Buffer; width: number; height: number; sha256: string; contentType: "image/webp" };
type PhotoScope = { actorId: string; orgSlug: string; itemId: string };

export async function storeProcessedPhoto(scope: PhotoScope, inputBytes: Uint8Array) {
  const processor = processingClient();
  const photoId = randomUUID();
  const parameters = { p_actor: scope.actorId, p_org_slug: scope.orgSlug, p_item_id: scope.itemId, p_photo_id: photoId };
  const { data: reservation, error: reservationError } = await processor.rpc("photo_begin", parameters);
  if (reservationError) throw databasePhotoError(reservationError);
  const path = reservation?.data?.storagePath;
  const pathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i;
  if (typeof path !== "string" || !pathPattern.test(path) || path.split("/")[1] !== scope.itemId.toLowerCase() || path.split("/")[2] !== `${photoId}.webp`) {
    await processor.rpc("photo_abort", parameters);
    throw new PhotoError(503, "UNAVAILABLE", "Photo processing is temporarily unavailable.");
  }
  try {
    // Reserve quota/cap before expensive image decoding. Failed decodes still
    // consume a reservation, preventing unlimited decoder work by staff.
    const image = await sanitizeImage(inputBytes);
    const { error: uploadError } = await processor.storage.from(PHOTO_BUCKET).upload(path, image.bytes, { contentType: "image/webp", upsert: false, cacheControl: "0" });
    if (uploadError) throw new PhotoError(503, "UNAVAILABLE", "The photo could not be stored. Please try again.");
    const { data, error } = await processor.rpc("photo_finish", { ...parameters, p_sha256: image.sha256, p_bytes: image.bytes.byteLength });
    if (error) throw databasePhotoError(error);
    if (data?.data?.id !== photoId || data?.data?.status !== "pending") throw new PhotoError(503, "UNAVAILABLE", "Photo processing is temporarily unavailable.");
    return { data: { id: photoId, status: "pending" as const } };
  } catch (error) {
    // The immutable object is unreachable while processing. Best-effort cleanup
    // handles the normal failure path; stale processing needs operator cleanup.
    const aborted = await processor.rpc("photo_abort", parameters).then((result) => !result.error, () => false);
    // Abort fails after a successful finish, including a lost success response.
    // Keep that pending photo/object intact instead of deleting committed data.
    if (aborted) await processor.storage.from(PHOTO_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
}

export type PhotoMetadata = { id: string; status: string; storagePath: string; sha256: string; bytes: number; contentType: string; alt: string; url: string };
export async function photoMetadata(client: SupabaseClient, orgSlug: string, itemId: string, photoId: string, staff: boolean): Promise<PhotoMetadata> {
  const { data, error } = await client.rpc("photo_metadata", { p_org_slug: orgSlug, p_item_id: itemId, p_photo_id: photoId, p_staff: staff });
  if (error) throw databasePhotoError(error);
  const record = data?.data;
  if (!record || record.id !== photoId || record.contentType !== "image/webp" || !Number.isInteger(record.bytes) || record.bytes < 1 || record.bytes > MAX_PHOTO_BYTES || !/^[a-f0-9]{64}$/.test(record.sha256)) {
    throw new PhotoError(503, "UNAVAILABLE", "Photo metadata is unavailable.");
  }
  return record;
}

async function boundedResponse(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_PHOTO_BYTES)) {
    await response.body?.cancel();
    throw new PhotoError(503, "UNAVAILABLE", "The photo could not be loaded.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new PhotoError(503, "UNAVAILABLE", "The photo could not be loaded.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PHOTO_BYTES) { await reader.cancel(); throw new PhotoError(503, "UNAVAILABLE", "The photo could not be loaded."); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks, size);
  return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export async function downloadVerifiedPhoto(client: SupabaseClient, metadata: PhotoMetadata, publicOnly = false): Promise<Buffer> {
  const config = supabaseConfiguration();
  if (!config) throw new PhotoError(503, "UNAVAILABLE", "Photos are temporarily unavailable.");
  const session = publicOnly ? null : (await client.auth.getSession()).data.session;
  // Public URLs always download as anon, so a staff session cannot broaden
  // public visibility between metadata authorization and object retrieval.
  // Identity is verified by the metadata RPC and again by Storage RLS. The
  // session token is used only to make the same user-scoped Storage request.
  const downloader = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      fetch: async (input, init) => boundedResponse(await fetch(input, { ...init, signal: AbortSignal.timeout(15_000) })),
    },
  });
  const { data, error } = await downloader.storage.from(PHOTO_BUCKET).download(metadata.storagePath);
  if (error || !data) throw new PhotoError(503, "UNAVAILABLE", "The photo could not be loaded.");
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.byteLength !== metadata.bytes || createHash("sha256").update(bytes).digest("hex") !== metadata.sha256) {
    throw new PhotoError(503, "UNAVAILABLE", "The photo could not be verified.");
  }
  return bytes;
}
