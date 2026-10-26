import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, cosine, publicText, rank, type SearchItem } from "../src/lib/search/ranking";
import { embed } from "../src/lib/search/embeddings";
import { InventoryChanged, semanticSearch } from "../src/lib/search/service";

const item:SearchItem={id:"1",organizationSlug:"maple-school",title:"Backpack",publicDescription:"Black sports bag",category:"bag",color:"black",publicLocation:"Gym",foundDate:"2026-01-01"};
const baseline=[{item,reasons:["Matching public item details"],method:"structured" as const}];
const unit=(index=0)=>Array.from({length:DIMENSIONS},(_,i)=>i===index?1:0);
const options=()=>({slug:"maple-school",query:"rucksack",limit:20,baseline,enabled:true,
  inventory:async()=>({items:[item],overflow:false}),reserve:async()=>true,embed:async()=>[unit(),unit()]});

test("embedding input allow-list excludes private fields, IDs and other metadata",()=>{
  const wider={...item,identifyingDetails:"SECRET",evidenceText:"PRIVATE",storageLocation:"CABINET",photos:["URL"]};
  assert.equal(publicText(wider),"Backpack\nBlack sports bag\nbag\nblack\nGym");
});
test("hybrid fusion preserves keyword matches and excludes irrelevant vectors",()=>{
  const extra={...item,id:"2",title:"Bottle"};
  assert.equal(cosine(unit(),unit()),1);
  assert.throws(()=>cosine([0],[0]));
  const result=rank([item,extra],[unit(),unit(1)],unit(),baseline,20);
  assert.equal(result.length,1);
  assert.equal(result[0].method,"hybrid");
  assert.ok(result[0].reasons.some(r=>r.includes("staff must verify")));
  assert.equal(JSON.stringify(result).includes('"score"'),false);
  assert.deepEqual(rank([item],[unit(1)],unit(),baseline,20),baseline);
  assert.deepEqual(rank([item],[unit(1)],unit(),[],20),[]);
});
test("disabled mode, overflow, foreign school and quota denial make zero paid calls",async()=>{
  for(const override of [{enabled:false},{inventory:async()=>({items:[item],overflow:true})},{inventory:async()=>({items:[{...item,organizationSlug:"cedar-school"}],overflow:false})},{reserve:async()=>false}]){
    let calls=0;
    const result=await semanticSearch({...options(),...override,embed:async()=>{calls++;throw Error();}});
    assert.deepEqual(result.data,baseline); assert.equal(calls,0); assert.equal(result.search.mode,"structured");
  }
});
test("provider outage, abort and malformed vectors fall back without provider details",async()=>{
  for(const embed of [async()=>{throw Error("sensitive provider failure");},async()=>{throw new DOMException("timeout","TimeoutError");},async()=>[unit(),[NaN]]]){
    const result=await semanticSearch({...options(),embed});
    assert.deepEqual(result,{data:baseline,search:{mode:"structured",semanticStatus:"unavailable"}});
  }
});
test("availability and public text are rechecked after embedding; stale baseline is never returned",async()=>{
  for(const items of [[],[{...item,publicDescription:"Edited"}],[{...item,organizationSlug:"cedar-school"}]]){
    let reads=0;
    await assert.rejects(()=>semanticSearch({...options(),inventory:async()=>({items:reads++===0?[item]:items,overflow:false})}),InventoryChanged);
  }
  assert.equal((await semanticSearch(options())).search.mode,"hybrid");
});
test("OpenAI transport uses fixed model/dimensions and restores shuffled indexed vectors",async()=>{
  const result=await embed(["query","public item"],"test-only",async(url,init)=>{
    assert.equal(url,"https://api.openai.com/v1/embeddings"); assert.equal(init?.redirect,"error");
    const body=JSON.parse(String(init?.body)); assert.equal(body.dimensions,256); assert.equal(body.model,"text-embedding-3-small");
    return Response.json({data:[{index:1,embedding:unit(1)},{index:0,embedding:unit()}]});
  });
  assert.deepEqual(result,[unit(),unit(1)]);
});
test("OpenAI rejects HTTP failure, duplicate indices, zero/wrong vectors and oversized bodies",async()=>{
  for(const response of [()=>new Response("provider secret",{status:429}),()=>Response.json({data:[{index:1,embedding:unit()}]}),()=>Response.json({data:[{index:0,embedding:[0]}]}),()=>Response.json({data:[{index:0,embedding:Array(DIMENSIONS).fill(0)}]}),()=>new Response("x".repeat(1024*1024+1))])
    await assert.rejects(()=>embed(["query"],"test-only",async()=>response()));
  await assert.rejects(()=>embed(Array(52).fill("query"),"test-only",async()=>{throw Error("should not call");}));
});

test("all twelve fixed evaluation queries retain the structured baseline on provider failure", async () => {
  const {readFileSync}=await import("node:fs");
  const cases=JSON.parse(readFileSync("docs/phase-4/evaluation-cases.json","utf8")) as {school:string;query:string}[];
  assert.equal(cases.length,12);
  for(const c of cases){
    const scoped={...item,organizationSlug:c.school};
    const baseline=[{item:scoped,reasons:["Matching public item details"],method:"structured" as const}];
    const result=await semanticSearch({...options(),slug:c.school,query:c.query,baseline,inventory:async()=>({items:[scoped],overflow:false}),embed:async()=>{throw Error("outage");}});
    assert.deepEqual(result.data,baseline);
    assert.equal(result.search.semanticStatus,"unavailable");
  }
});
