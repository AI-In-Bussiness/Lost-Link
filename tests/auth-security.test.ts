import test from "node:test";
import assert from "node:assert/strict";
import { credentialsFromForm, isSameOrigin, readAuthForm, safeReturnPath, siteOrigin } from "../src/lib/auth/security";

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

test("body reader accepts urlencoded forms and bounds bodies independently of length header", async () => {
  const request = (body: string, contentType = "application/x-www-form-urlencoded") => new Request("http://localhost:3000/api/auth/sign-in", {method:"POST", headers:{"content-type":contentType}, body});
  assert.equal((await readAuthForm(request("email=a%40b.com&password=x")))?.get("email"), "a@b.com");
  assert.equal(await readAuthForm(request("x".repeat(4097))), null);
  assert.equal(await readAuthForm(request("{}", "application/json")), null);
});
