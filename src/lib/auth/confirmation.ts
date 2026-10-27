import { safeReturnPath } from "./security";

export const pendingSignupEmailCookie = "lostlink-signup-email";

export function pendingSignupCookieOptions(origin: string) {
  return { httpOnly: true, secure: new URL(origin).protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 3600 };
}

export function confirmationCallback(origin: string, next: unknown) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeReturnPath(next));
  return callback.toString();
}

export function confirmationCode(params: URLSearchParams): { code: string; flowId?: string } | null {
  const codes = params.getAll("code");
  const flowIds = params.getAll("sb_flow_id");
  if (params.has("error") || codes.length !== 1 || !codes[0] || codes[0].length > 2048 || flowIds.length > 1) return null;
  if (flowIds.length && !/^[a-zA-Z0-9_-]{8,64}$/.test(flowIds[0])) return null;
  return { code: codes[0], ...(flowIds.length ? { flowId: flowIds[0] } : {}) };
}

export function registrationError(error: { code?: string; status?: number }): string {
  if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code || "")) return "rate-limit";
  if (["weak_password", "email_address_invalid", "validation_failed"].includes(error.code || "")) return "invalid";
  if (error.code === "signup_disabled") return "disabled";
  if (error.code === "email_address_not_authorized") return "email-delivery";
  return "unavailable";
}
