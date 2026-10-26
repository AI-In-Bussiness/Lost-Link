import { BodyReadError, readBoundedBody } from "../http/body";
export const MAX_JSON_BYTES = 16 * 1024;
export class BodyError extends Error {
  constructor(public status: 400 | 408 | 413 | 415, public code: string, message: string) { super(message); }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new BodyError(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
  try {
    const bytes = await readBoundedBody(request, MAX_JSON_BYTES);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof BodyReadError) {
      if (error.kind === "timeout") throw new BodyError(408, "REQUEST_TIMEOUT", "The request body took too long. Please try again.");
      if (["too-large", "invalid-length"].includes(error.kind)) throw new BodyError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }
    throw new BodyError(400, "VALIDATION_ERROR", "Use a valid JSON body.");
  }
}
