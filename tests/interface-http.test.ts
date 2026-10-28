import test from "node:test";
import assert from "node:assert/strict";
import { createHttpApi } from "../src/interface/http";
import { safeReturnPath } from "../src/lib/auth/security";

const dto = { id: "claim-1", itemId: "item-1", organizationSlug: "maple-school", itemTitle: "Black bag", status: "submitted", evidenceText: "Fictional private evidence", submittedAt: "2026-10-25T12:00:00Z", reviewedAt: null, decisionReason: null, version: 7 };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

test("claim submission sends only ownership evidence, with same-origin cookies and no cache", async () => {
  const api = createHttpApi([], async (url, init) => {
    assert.equal(url, "/api/v1/organizations/maple-school/items/item-1/claims");
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { evidenceText: "Fictional private evidence" });
    return response({ data: dto }, 201);
  });
  const saved = await api.submitClaim({ orgSlug: "maple-school", itemId: "item-1", ownershipEvidence: dto.evidenceText, contactEmail: "ignored@example.test" });
  assert.ok(saved.ok);
  assert.equal(saved.data.status, "pending");
  assert.equal(saved.data.version, 7);
  assert.equal(saved.data.itemTitle, "Black bag");
  assert.equal(saved.data.item, undefined, "do not invent a public item snapshot");
  assert.equal(saved.data.contactEmail, "", "do not invent contact details");
});

test("review and return send the rendered version and private notes without retrying conflicts", async () => {
  const calls: { url: string; body: unknown }[] = [];
  const api = createHttpApi([], async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return response({ error: { code: "CONFLICT", message: "Internal SQL must not be shown" } }, 409);
  });
  const result = await api.decideClaim({ orgSlug: "maple-school", claimId: dto.id, decision: "reject", reason: "The details do not match.", privateNote: "Private note", expectedVersion: 7 });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body, { expectedVersion: 7, decision: "reject", claimantReason: "The details do not match.", privateNote: "Private note" });
  await api.recordReturn({ orgSlug: "maple-school", itemId: dto.itemId, approvedClaimId: dto.id, expectedVersion: 8 });
  assert.deepEqual(calls[1].body, { expectedVersion: 8, ownershipVerified: true });
  assert.equal((await api.decideClaim({ orgSlug: "maple-school", claimId: dto.id, decision: "approve" })).ok, false);
  assert.equal(calls.length, 2, "missing version must not cause a write");
});

test("cursor pages retain filters and versions; withdrawn/cancelled claims remain distinct", async () => {
  const paths: string[] = [];
  const api = createHttpApi([], async url => {
    paths.push(String(url));
    return paths.length === 1 ? response({ data: [{ ...dto, status: "withdrawn" }], page: { nextCursor: "opaque-cursor" } }) :
      response({ data: [{ ...dto, id: "claim-2", status: "cancelled" }], page: { nextCursor: null } });
  });
  const result = await api.listStaffClaims({ orgSlug: "maple-school", status: "pending", pageSize: 1, page: 2 });
  assert.ok(result.ok);
  assert.equal(result.data.total, 2);
  assert.equal(result.data.items[0].status, "cancelled");
  assert.match(paths[1], /status=submitted/);
  assert.match(paths[1], /cursor=opaque-cursor/);
  assert.equal(result.data.items[0].version, 7);
});

test("cursor loops fail visibly instead of presenting truncated totals", async () => {
  let count = 0;
  const api = createHttpApi([], async () => { count++; return response({ data: [], page: { nextCursor: "same" } }); });
  assert.equal((await api.listMyClaims()).ok, false);
  assert.equal(count, 2);
});

test("search uses ranked endpoint, exposes a bounded result set, and passes date filters and rejects unsupported categories", async () => {
  let count = 0;
  const api = createHttpApi([], async (url, init) => {
    count++;
    assert.equal(url, "/api/v1/organizations/maple-school/search");
    assert.deepEqual(JSON.parse(String(init?.body)), { query: "black bag", category: "bag", from: "2026-01-01", to: "2026-10-24", limit: 50 });
    return response({ data: [{ item: { id: "item-1", organizationSlug: "maple-school", title: "Bag", publicDescription: "Public facts", category: "bag", color: "black", publicLocation: "Gym", foundDate: "2026-10-24" }, reasons: ["Matching public item details"] }] });
  });
  const result = await api.searchItems({ orgSlug: "maple-school", query: "black bag", category: "bag", from: "2026-01-01", to: "2026-10-24" });
  assert.ok(result.ok);
  assert.equal(result.data.limited, true);
  assert.deepEqual(result.data.items[0].matchReasons, ["Matching public item details"]);
  assert.equal((await api.searchItems({ orgSlug: "maple-school", category: "accessory" })).ok, false);
  assert.equal(count, 1);
});

test("safe failures map validation fields, authentication, throttling and malformed responses", async () => {
  for (const [code, expected] of [["UNAUTHORIZED", "UNAUTHENTICATED"], ["RATE_LIMITED", "RATE_LIMITED"], ["UNAVAILABLE", "INTERNAL_ERROR"], ["VALIDATION_ERROR", "VALIDATION_ERROR"]]) {
    const api = createHttpApi([], async () => response({ error: { code, message: "private diagnostic", fields: { evidenceText: "private diagnostic" } } }, 400));
    const result = await api.getPublicItem("maple-school", "item-1");
    assert.ok(!result.ok);
    assert.equal(result.error.code, expected);
    assert.equal(result.error.fieldErrors?.ownershipEvidence, "Check this value.");
    assert.ok(!JSON.stringify(result).includes("private diagnostic"));
  }
  const api = createHttpApi([], async () => new Response("bad gateway", { status: 502 }));
  assert.equal((await api.listOrganizations()).ok, false, "dynamic school directory failures remain visible");
  assert.equal((await api.getPublicItem("maple-school", "item-1")).ok, false);
});

test("sign-in continuation permits product routes while rejecting disguised external paths", () => {
  for (const path of ["/my/claims", "/my/claims/claim-1", "/o/maple-school/items/item-1/claim", "/o/maple-school/staff/items/new", "/o/maple-school/staff"]) assert.equal(safeReturnPath(path), path);
  for (const path of ["//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/sign-in", "/api/auth/sign-out", "/o/maple-school/search?next=//evil.test", "/my/claims\n"]) assert.equal(safeReturnPath(path), "/account");
});


test("published photographs replace illustrations and upload uses multipart without JSON labels", async () => {
  const api = createHttpApi([], async (url, init) => {
    if (init?.body instanceof FormData) {
      assert.equal(url, "/api/v1/organizations/maple-school/staff/items/item-1/photos");
      assert.equal(init.headers, undefined, "browser must provide the multipart boundary");
      assert.equal((init.body.get("file") as File).name, "item.png");
      return response({data:{id:"photo-1",status:"pending"}},201);
    }
    return response({data:{id:"item-1",organizationSlug:"maple-school",title:"Blue bag",photos:[{url:"/api/v1/safe-content",alt:"Blue bag"}]}});
  });
  const found = await api.getPublicItem("maple-school", "item-1");
  assert.ok(found.ok);
  assert.equal(found.data.photo.isPlaceholder, false);
  assert.equal(found.data.photo.url, "/api/v1/safe-content");
  assert.ok((await api.photos!.upload("maple-school","item-1",new File(["bytes"],"item.png"))).ok);
});

test("claimant explanation is separate from private staff notes", async () => {
  const api = createHttpApi([], async () => response({data:[{...dto,status:"rejected",claimantReason:"The details do not match. Contact staff.",privateReviewNote:undefined}],page:{nextCursor:null}}));
  const found = await api.getMyClaim("claim-1");
  assert.ok(found.ok);
  assert.equal(found.data.decisionReason, "The details do not match. Contact staff.");
  assert.equal(found.data.privateReviewNote, undefined);
});

test("search maps semantic metadata and fallback notice without claiming ownership", async () => {
  for (const [mode,semanticStatus] of [["hybrid","available"],["structured","unavailable"],["structured","disabled"]]) {
    const api=createHttpApi([],async()=>response({data:[],search:{mode,semanticStatus}}));
    const result=await api.searchItems({orgSlug:"maple-school",query:"rucksack"});
    assert.ok(result.ok);
    assert.equal(result.data.mode,mode==="hybrid"?"hybrid":"keyword");
    assert.equal(result.data.smartMatchingUnavailable,semanticStatus==="unavailable");
  }
});

test('school directory discovers newly published schools independently of old configured slugs',async()=>{
 const api=createHttpApi(['maple-school'],async(url,init)=>{
  assert.equal(url,'/api/v1/organizations');
  assert.equal(init?.method,'GET');
  return response({data:[{id:'real-id',slug:'new-school',name:'New school',contactEmail:'office@example.test'}]});
 });
 const result=await api.listOrganizations();
 assert.ok(result.ok);
 assert.equal(result.data[0].slug,'new-school');
 assert.equal(result.data[0].contactEmail,'office@example.test');
});
test('claim receipts use the school collection instructions',async()=>{
 const api=createHttpApi([],async()=>response({data:[{...dto,status:'approved',collectionInstructions:'Visit the office after 3pm.'}]}));
 const result=await api.listMyClaims();
 assert.ok(result.ok);
 assert.equal(result.data.items[0].collectionInstructions,'Visit the office after 3pm.');
});
