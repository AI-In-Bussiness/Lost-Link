import { readBoundedBody, BodyReadError } from "../http/body";
import { BodyError } from "../api/body";
import { MAX_IMAGE_BYTES } from "./image";
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 16 * 1024;

export async function uploadBytes(request: Request): Promise<Buffer> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !/^multipart\/form-data\s*;/i.test(contentType)) throw new BodyError(415, "UNSUPPORTED_MEDIA_TYPE", "Use a multipart file upload.");
  let bytes: Uint8Array;
  try { bytes = await readBoundedBody(request, MAX_MULTIPART_BYTES); }
  catch (error) {
    if (error instanceof BodyReadError && error.kind === "timeout") throw new BodyError(408, "REQUEST_TIMEOUT", "The upload took too long. Please try again.");
    if (error instanceof BodyReadError && ["too-large", "invalid-length"].includes(error.kind)) throw new BodyError(413, "PAYLOAD_TOO_LARGE", "The upload is too large.");
    throw new BodyError(400, "VALIDATION_ERROR", "Use a valid multipart file upload.");
  }
  let form: FormData;
  try {
    form = await new Request("http://localhost/upload", { method: "POST", headers: { "Content-Type": contentType }, body: Buffer.from(bytes) }).formData();
  } catch {
    throw new BodyError(400, "VALIDATION_ERROR", "Use a valid multipart file upload.");
  }
  const entries = [...form.entries()];
  if (entries.length !== 1 || entries[0][0] !== "file" || !(entries[0][1] instanceof File)) throw new BodyError(400, "VALIDATION_ERROR", "Upload exactly one file named file.");
  const file = entries[0][1];
  if (!file.size) throw new BodyError(400, "VALIDATION_ERROR", "Choose a photo to upload.");
  if (file.size > MAX_IMAGE_BYTES) throw new BodyError(413, "PAYLOAD_TOO_LARGE", "Photos must be 4 MiB or smaller.");
  // Ignore the untrusted filename and MIME label. The decoder validates bytes.
  return Buffer.from(await file.arrayBuffer());
}

