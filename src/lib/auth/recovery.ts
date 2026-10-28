import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { confirmationCallback } from "./confirmation";
import { safeReturnPath } from "./security";

export const recoveryCookie = "lostlink-password-recovery";
export const recoveryLifetime = 15 * 60;
export const recoveryRequestCookie = "lostlink-password-reset-request";
export const recoveryRequestInterval = 60;
type RecoverySession = { access_token: string; user: { id: string } };

export function recoveryCookieOptions(origin: string) {
  return { httpOnly: true, secure: new URL(origin).protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: recoveryLifetime };
}

export function recoveryCallback(origin: string, next: unknown) {
  const callback = new URL(confirmationCallback(origin, next));
  callback.searchParams.set("recovery", "1");
  return callback.toString();
}

export function recoveryRequestMarker(email: string, now = Date.now()) {
  return `${createHash("sha256").update(email.toLowerCase()).digest("hex")}.${now + recoveryRequestInterval * 1000}`;
}

export function isRecoveryCoolingDown(value: string | undefined, email: string, now = Date.now()) {
  if (!value || value.length > 100) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [hash, expiry] = parts;
  const expectedHash = recoveryRequestMarker(email, now).split(".")[0];
  const expiresAt = Number(expiry);
  return hash === expectedHash && Number.isSafeInteger(expiresAt) && expiresAt > now && expiresAt <= now + recoveryRequestInterval * 1000;
}

function signature(payload: string, session: RecoverySession) {
  // The verified session token is already a secret held only in HttpOnly
  // cookies. Bind this short-lived form grant to that exact recovery session
  // without requiring a new deployment secret or storing another bearer token.
  return createHmac("sha256", session.access_token).update(`lostlink-password-recovery:${payload}`).digest();
}

export function createRecoveryGrant(session: RecoverySession, next: unknown, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId: session.user.id, next: safeReturnPath(next), expiresAt: now + recoveryLifetime * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, session).toString("base64url")}`;
}

export function readRecoveryGrant(value: string | undefined, session: RecoverySession, now = Date.now()): { next: string } | null {
  if (!value || value.length > 2048) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const supplied = Buffer.from(parts[1], "base64url");
  const expected = signature(parts[0], session);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const grant = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (grant.userId !== session.user.id || !Number.isSafeInteger(grant.expiresAt) || grant.expiresAt <= now || grant.expiresAt > now + recoveryLifetime * 1000 || grant.next !== safeReturnPath(grant.next)) return null;
    return { next: grant.next };
  } catch { return null; }
}

export function newPasswordFromForm(form: URLSearchParams): { password: string } | "invalid" | "mismatch" {
  const keys = [...form.keys()];
  if (keys.some(key => !["password", "confirmPassword"].includes(key)) || keys.some(key => form.getAll(key).length !== 1)) return "invalid";
  const password = form.get("password");
  if (!password || password.length < 12 || password.length > 256) return "invalid";
  if (password !== form.get("confirmPassword")) return "mismatch";
  return { password };
}
