import test from "node:test";
import assert from "node:assert/strict";
import { createRecoveryGrant, isRecoveryCoolingDown, newPasswordFromForm, readRecoveryGrant, recoveryCallback, recoveryCookieOptions, recoveryLifetime, recoveryRequestMarker } from "../src/lib/auth/recovery";

const session = { access_token: "synthetic-secret-session-token", user: { id: "synthetic-user" } };
const now = 1_800_000_000_000;

test("browser recovery cooldown is per address, short-lived and contains no plaintext email", () => {
  const marker = recoveryRequestMarker("test@example.test", now);
  assert.ok(!marker.includes("test@example.test"));
  assert.equal(isRecoveryCoolingDown(marker, "TEST@example.test", now), true);
  assert.equal(isRecoveryCoolingDown(marker, "different@example.test", now), false);
  assert.equal(isRecoveryCoolingDown(marker, "test@example.test", now + 60_000), false);
  for (const value of [undefined, "", marker + ".extra", marker + ".", "x".repeat(101), marker.replace(/\d+$/, "Infinity")]) assert.equal(isRecoveryCoolingDown(value, "test@example.test", now), false);
});

test("password recovery uses the existing exact callback allowlist and safe continuation", () => {
  const callback = new URL(recoveryCallback("https://lostlink.example", "/admin"));
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/admin");
  assert.equal(callback.searchParams.get("recovery"), "1");
  assert.equal(new URL(recoveryCallback("https://lostlink.example", "//evil.example")).searchParams.get("next"), "/account");
  assert.deepEqual(recoveryCookieOptions("https://lostlink.example"), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
  assert.equal(recoveryCookieOptions("http://localhost:3000").secure, false);
});

test("recovery grants bind the verified user, exact session, destination and expiry", () => {
  const grant = createRecoveryGrant(session, "/admin", now);
  assert.deepEqual(readRecoveryGrant(grant, session, now), { next: "/admin" });
  assert.deepEqual(readRecoveryGrant(grant, session, now + recoveryLifetime * 1000 - 1), { next: "/admin" });
  assert.equal(readRecoveryGrant(grant, session, now + recoveryLifetime * 1000), null);
  assert.equal(readRecoveryGrant(grant, session, now - 1), null);
  assert.equal(readRecoveryGrant(grant, { ...session, access_token: "different-session" }, now), null);
  assert.equal(readRecoveryGrant(grant, { ...session, user: { id: "someone-else" } }, now), null);
  assert.deepEqual(readRecoveryGrant(createRecoveryGrant(session, "https://evil.example", now), session, now), { next: "/account" });
  assert.ok(!grant.includes(session.access_token));
});

test("forged, corrupt, duplicate and oversized recovery grants are rejected", () => {
  const grant = createRecoveryGrant(session, "/admin", now);
  const [payload, signature] = grant.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ userId: session.user.id, next: "/account", expiresAt: now + 1_000 })).toString("base64url");
  for (const value of [undefined, "", payload, `${grant}.extra`, `${payload}.short`, `${payload}.!`, `${forgedPayload}.${signature}`, "x".repeat(2049)]) assert.equal(readRecoveryGrant(value, session, now), null);
});

test("new passwords require confirmation, preserve exact characters and reject role/identity injection", () => {
  const password = " a unique password ";
  assert.deepEqual(newPasswordFromForm(new URLSearchParams({ password, confirmPassword: password })), { password });
  for (const length of [0, 1, 11, 257]) assert.equal(newPasswordFromForm(new URLSearchParams({ password: "x".repeat(length), confirmPassword: "x".repeat(length) })), "invalid");
  for (const length of [12, 256]) assert.deepEqual(newPasswordFromForm(new URLSearchParams({ password: "x".repeat(length), confirmPassword: "x".repeat(length) })), { password: "x".repeat(length) });
  assert.equal(newPasswordFromForm(new URLSearchParams({ password, confirmPassword: password + "different" })), "mismatch");
  assert.equal(newPasswordFromForm(new URLSearchParams({ password })), "mismatch");
  for (const extra of ["password=duplicate", "confirmPassword=duplicate", "email=someone@example.test", "user_id=someone-else", "role=admin", "next=https://evil.example"]) assert.equal(newPasswordFromForm(new URLSearchParams(`password=long-enough-password&confirmPassword=long-enough-password&${extra}`)), "invalid");
});
