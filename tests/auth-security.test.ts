import test from "node:test";
import assert from "node:assert/strict";
import { confirmationEmailFromForm, credentialsFromForm, isSameOrigin, readAuthForm, safeReturnPath, signupCredentialsFromForm, siteOrigin } from "../src/lib/auth/security";
import { confirmationCallback, confirmationCode, pendingSignupCookieOptions, registrationError } from "../src/lib/auth/confirmation";

test("origins reject cross-site, missing, null, and malformed input", () => {
  assert.equal(isSameOrigin("https://lostlink.example", "https://lostlink.example"), true);
  for (const origin of [null, "null", "https://evil.example", "https://lostlink.example.evil.example", "https://lostlink.example/", "invalid"]) {
    assert.equal(isSameOrigin(origin, "https://lostlink.example"), false);
  }
});

test("site configuration forbids remote HTTP, credentials and paths", () => {
  assert.equal(siteOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(siteOrigin("https://lostlink.example"), "https://lostlink.example");
  for (const origin of ["http://example.com", "https://user:pass@example.com", "https://example.com/sign-in", "javascript:alert(1)"]) assert.throws(() => siteOrigin(origin));
});

test("redirect allowlist prevents external and protocol-relative destinations", () => {
  for (const next of ["https://evil.example", "//evil.example", "/account", "/account?next=//evil.example", null]) assert.equal(safeReturnPath(next), "/account");
});

test("credential schema rejects duplicates, unrecognized fields, malformed email and oversized password", () => {
  assert.deepEqual(credentialsFromForm(new URLSearchParams({ email: " test@example.com ", password: " secret " })), {email:"test@example.com", password:" secret "});
  for (const body of ["email=a%40b.com&email=evil%40b.com&password=x", "email=a%40b.com&password=x&role=admin", "email=bad&password=x", "email=a%40b.com&password=", `email=a%40b.com&password=${"x".repeat(257)}`]) assert.equal(credentialsFromForm(new URLSearchParams(body)), null);
});

test("signup requires a long password and rejects identity or role injection", () => {
  const valid = { email: " new@example.test ", password: " a long password " };
  assert.deepEqual(signupCredentialsFromForm(new URLSearchParams(valid)), { email: "new@example.test", password: valid.password });
  for (const length of [1, 11, 257]) assert.equal(signupCredentialsFromForm(new URLSearchParams({ email: "new@example.test", password: "x".repeat(length) })), null);
  for (const length of [12, 256]) assert.ok(signupCredentialsFromForm(new URLSearchParams({ email: "new@example.test", password: "x".repeat(length) })));
  for (const extra of ["role=admin", "organization_id=school", "user_id=someone", "email=other%40example.test", "password=second", "next=%2Faccount&next=%2Fmy%2Fclaims"]) {
    assert.equal(signupCredentialsFromForm(new URLSearchParams(`email=new%40example.test&password=long-enough-password&${extra}`)), null);
  }
});

test("body reader accepts urlencoded forms and bounds bodies independently of length header", async () => {
  const request = (body: string, contentType = "application/x-www-form-urlencoded") => new Request("http://localhost:3000/api/auth/sign-in", {method:"POST", headers:{"content-type":contentType}, body});
  assert.equal((await readAuthForm(request("email=a%40b.com&password=x")))?.get("email"), "a@b.com");
  assert.equal(await readAuthForm(request("x".repeat(4097))), null);
  assert.equal(await readAuthForm(request("{}", "application/json")), null);
});

test("confirmation resend accepts only a single valid email and safe continuation field", () => {
  assert.equal(confirmationEmailFromForm(new URLSearchParams({ email: " new@example.test ", next: "/my/claims" })), "new@example.test");
  for (const body of ["email=bad", "email=", "email=a%40b.test&email=c%40d.test", "email=a%40b.test&password=secret", "email=a%40b.test&role=admin", "email=a%40b.test&next=%2Faccount&next=%2Fmy%2Fclaims", `email=${"x".repeat(250)}@test.example`]) assert.equal(confirmationEmailFromForm(new URLSearchParams(body)), null);
});

test("signup and resend share callback restrictions and private short-lived email cookies", () => {
  const callback = new URL(confirmationCallback("https://lostlink.example", "/my/claims"));
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/my/claims");
  assert.equal(new URL(confirmationCallback("https://lostlink.example", "https://evil.example")).searchParams.get("next"), "/account");
  assert.deepEqual(pendingSignupCookieOptions("https://lostlink.example"), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 });
  assert.equal(pendingSignupCookieOptions("http://localhost:3000").secure, false);
});

test("registration errors distinguish actionable provider limits without exposing raw errors", () => {
  for (const code of ["over_email_send_rate_limit", "over_request_rate_limit"]) assert.equal(registrationError({ code }), "rate-limit");
  assert.equal(registrationError({ status: 429 }), "rate-limit");
  assert.equal(registrationError({ code: "email_address_not_authorized" }), "email-delivery");
  assert.equal(registrationError({ code: "signup_disabled" }), "disabled");
  for (const code of ["weak_password", "email_address_invalid", "validation_failed"]) assert.equal(registrationError({ code }), "invalid");
  assert.equal(registrationError({ code: "SENSITIVE_SENTINEL", status: 500 }), "unavailable");
});

test("confirmation exchanges select only one valid PKCE flow while supporting older links", () => {
  assert.deepEqual(confirmationCode(new URLSearchParams("code=one-time-code")), { code: "one-time-code" });
  assert.deepEqual(confirmationCode(new URLSearchParams("code=one-time-code&sb_flow_id=0123456789abcdef")), { code: "one-time-code", flowId: "0123456789abcdef" });
  for (const query of ["", "code=", "code=one&code=two", "code=one&error=denied", "code=one&sb_flow_id=bad", "code=one&sb_flow_id=../../other-cookie", "code=one&sb_flow_id=0123456789abcdef&sb_flow_id=0123456789abcdef", `code=${"x".repeat(2049)}`]) assert.equal(confirmationCode(new URLSearchParams(query)), null);
});
