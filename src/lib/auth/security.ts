export const MAX_AUTH_BODY_BYTES = 4096;

export function siteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL): string {
  const url = new URL(value || "http://localhost:3000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin.");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Remote authentication requires HTTPS.");
  }
  return url.origin;
}

export function isSameOrigin(origin: string | null, expected: string): boolean {
  if (!origin || origin === "null") return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === expected && origin === parsed.origin;
  } catch {
    return false;
  }
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 500 || /[\\\x00-\x20]/.test(value)) return "/account";
  // Exact application paths only. No query, fragment, escaping or arbitrary origin.
  return /^(?:\/account|\/my\/claims(?:\/[a-zA-Z0-9-]+)?|\/o\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:search|items\/[a-zA-Z0-9-]+(?:\/claim)?|staff(?:\/(?:items(?:\/[a-zA-Z0-9-]+)?|claims\/[a-zA-Z0-9-]+))?))$/.test(value) ? value : "/account";
}

export function credentialsFromForm(form: URLSearchParams): { email: string; password: string } | null {
  const keys = [...form.keys()];
  if (keys.some((key) => !["email", "password", "next"].includes(key)) || keys.some((key) => form.getAll(key).length !== 1)) return null;
  const email = form.get("email")?.trim();
  const password = form.get("password");
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 256) return null;
  return { email, password };
}

export async function readAuthForm(request: Request): Promise<URLSearchParams | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") return null;
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_AUTH_BODY_BYTES)) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_AUTH_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}
