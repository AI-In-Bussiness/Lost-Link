export const MAX_JSON_BYTES = 16 * 1024;
export class BodyError extends Error {
  constructor(public status: 400 | 413 | 415, public code: string, message: string) { super(message); }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new BodyError(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_JSON_BYTES)) {
    throw new BodyError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError(400, "VALIDATION_ERROR", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) { await reader.cancel(); throw new BodyError(413, "PAYLOAD_TOO_LARGE", "Request body is too large."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof BodyError) throw error;
    throw new BodyError(400, "VALIDATION_ERROR", "Use a valid JSON body.");
  }
}
