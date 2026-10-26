import test from "node:test";
import assert from "node:assert/strict";
import { decodeCursor, encodeCursor, endpoints, queryObject, slug } from "../src/lib/api/contracts";
import { BodyError, MAX_JSON_BYTES, readJsonBody } from "../src/lib/api/body";

const id = "11111111-1111-4111-8111-111111111111";
const item = {title:"Fictional bag",publicDescription:"Synthetic demo item",category:"bag",color:"dark blue",publicLocation:"Gym",foundDate:"2020-01-01",identifyingDetails:"Hidden fictional mark",storageLocation:"Demo cupboard"};

test("opaque cursors have a canonical version and valid UUID", () => {
  const encoded=encodeCursor(id);
  assert.equal(decodeCursor(encoded),id);
  for (const value of [id, `${encoded}=`, Buffer.from(`v2:${id}`).toString("base64url"), Buffer.from("v1:not-an-id").toString("base64url"), "???"]) assert.throws(()=>decodeCursor(value));
});

test("query validation rejects unknown or duplicate parameters and bounds list size",()=>{
  assert.deepEqual(endpoints.items.query.parse({}),{limit:20});
  assert.deepEqual(endpoints.items.query.parse({limit:"50",cursor:encodeCursor(id)}),{limit:50,cursor:id});
  assert.throws(()=>queryObject(new URLSearchParams("limit=1&limit=2")));
  for(const value of [{limit:"0"},{limit:"51"},{limit:"1e1"},{limit:"1.5"},{organization_id:id},{status:"returned"}]) assert.equal(endpoints.items.query.safeParse(value).success,false);
  assert.equal(slug.safeParse("school-demo").success,true);
  assert.equal(slug.safeParse("../other").success,false);
});

test("item writes reject privilege/status fields, empty patches and impossible dates",()=>{
  assert.equal(endpoints.create_item.body.safeParse(item).success,true);
  for(const value of [{...item,createdBy:id},{...item,status:"returned"},{...item,foundDate:"2025-02-30"},{...item,identifyingDetails:""},{...item,category:"unknown"}]) assert.equal(endpoints.create_item.body.safeParse(value).success,false);
  // Future dates are checked inside the organization timezone by PostgreSQL.
  assert.equal(endpoints.create_item.body.safeParse({...item,foundDate:"2999-01-01"}).success,true);
  assert.equal(endpoints.update_item.body.safeParse({expectedVersion:1,title:"Updated"}).success,true);
  for(const value of [{expectedVersion:1},{expectedVersion:0,title:"Updated"},{expectedVersion:1,status:"returned"}]) assert.equal(endpoints.update_item.body.safeParse(value).success,false);
});

test("claim mutations require private proof bounds, explicit verification and versions",()=>{
  assert.equal(endpoints.submit_claim.body.safeParse({evidenceText:"Synthetic distinguishing proof"}).success,true);
  for(const value of [{evidenceText:"short"},{evidenceText:"x".repeat(2001)},{evidenceText:"Synthetic distinguishing proof",claimantId:id}]) assert.equal(endpoints.submit_claim.body.safeParse(value).success,false);
  assert.equal(endpoints.return_claim.body.safeParse({expectedVersion:1,ownershipVerified:true}).success,true);
  for(const value of [{expectedVersion:1},{expectedVersion:1,ownershipVerified:false},{expectedVersion:1,ownershipVerified:true,reviewedBy:id}]) assert.equal(endpoints.return_claim.body.safeParse(value).success,false);
});

test("search accepts structured filters and rejects evidence or blank query",()=>{
  assert.deepEqual(endpoints.search.body.parse({query:"black backpack"}),{query:"black backpack",limit:20});
  for(const value of [{query:" "},{query:"x".repeat(301)},{query:"bag",evidenceText:"private"},{query:"bag",cursor:encodeCursor(id)}]) assert.equal(endpoints.search.body.safeParse(value).success,false);
});

test("JSON reader enforces content type, byte caps and valid JSON independently of length header",async()=>{
  const request=(body:string,headers:Record<string,string>={})=>new Request("http://localhost/api/v1/test",{method:"POST",headers:{"content-type":"application/json",...headers},body});
  assert.deepEqual(await readJsonBody(request('{"expectedVersion":1}')),{expectedVersion:1});
  await assert.rejects(()=>readJsonBody(request("{}",{"content-type":"text/plain"})),(error)=>error instanceof BodyError&&error.status===415);
  await assert.rejects(()=>readJsonBody(request("invalid")),(error)=>error instanceof BodyError&&error.status===400);
  await assert.rejects(()=>readJsonBody(request(JSON.stringify("é".repeat(MAX_JSON_BYTES)))),(error)=>error instanceof BodyError&&error.status===413);
  await assert.rejects(()=>readJsonBody(request("{}",{"content-length":String(MAX_JSON_BYTES+1)})),(error)=>error instanceof BodyError&&error.status===413);
});
