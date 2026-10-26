export const BODY_READ_TIMEOUT_MS = 10_000;
export class BodyReadError extends Error {
  constructor(public kind: "missing" | "too-large" | "invalid-length" | "timeout" | "unreadable") { super(kind); }
}
/** Absolute deadline across every chunk, not a renewable per-chunk idle timeout. */
export async function readBoundedBody(request: Request, maxBytes: number, timeoutMs = BODY_READ_TIMEOUT_MS): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    void request.body?.cancel().catch(() => {});
    throw new BodyReadError(/^\d+$/.test(length) ? "too-large" : "invalid-length");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new BodyReadError("missing");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new BodyReadError("too-large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  };
  try {
    return await Promise.race([read(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new BodyReadError("timeout")), timeoutMs);
    })]);
  } catch (error) {
    // Cancellation hooks are untrusted too; do not await a potentially stalled hook.
    void reader.cancel().catch(() => {});
    throw error instanceof BodyReadError ? error : new BodyReadError("unreadable");
  } finally { clearTimeout(timer); }
}
