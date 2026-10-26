import test from "node:test";
import assert from "node:assert/strict";
import { itemCard } from "../../src/interface/shared.ts";
import { publicView } from "../../src/interface/public.ts";
const item={id:"synthetic",title:"Black bag",category:"bag",color:"black",foundLocation:"Gym",
  foundDate:"2026-10-20",photo:{url:"/mock-assets/item-placeholder.svg",alt:"Bag",isPlaceholder:true}};
const reason="Similar public description (AI); staff must verify ownership";
test("cards explain supplied signals without inventing reasons or rendering injected markup",()=>{
  const html=itemCard({...item,matchReasons:[reason,'<img src=x onerror="alert(1)">']},"maple-school");
  assert.match(html,/Why this may match/);
  assert.match(html,/<ul><li>Similar public description/);
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!itemCard(item,"maple-school").includes("Why this may match"));
});
async function view(mode="keyword",unavailable=false,query="bag",items=[{...item,matchReasons:[reason]}]){
  return publicView({url:new URL("http://localhost/o/maple-school/search?q="+encodeURIComponent(query)),
    orgSlug:"maple-school",orgName:"Maple School",session:null,
    api:{searchItems:async()=>({ok:true,data:{mode,smartMatchingUnavailable:unavailable,
      items,total:items.length,page:1,totalPages:1}})},refresh(){},navigate(){}});
}
test("search distinguishes hybrid, fallback and keyword signals, with ownership and privacy guidance",async()=>{
  const hybrid=await view("hybrid");
  assert.match(hybrid.html,/AI compares the meaning/);
  assert.match(hybrid.html,/Reasons explain search signals, not ownership/);
  assert.match(hybrid.html,/aria-describedby="search-privacy"/);
  assert.match(hybrid.html,/Keep names, contact information and secret identifying details/);
  assert.ok(!hybrid.html.includes("matching provider"));
  const fallback=await view("keyword",true);
  assert.match(fallback.html,/Showing keyword and filter results/);
  assert.ok(!fallback.html.includes("AI + keyword matching"));
  const keyword=await view();
  assert.ok(!keyword.html.includes("smart matching is unavailable"));
});
test("no-match and query markup stay safe, retain school browsing and staff contact",async()=>{
  const empty=await view("keyword",false,"<script>alert(1)</script>",[]);
  assert.match(empty.html,/No matching items found/);
  assert.match(empty.html,/Contact your school office/);
  assert.match(empty.html,/href="\/o\/maple-school\/search"/);
  assert.ok(!empty.html.includes("<script>"));
});
test("query validation keeps privacy help and field error associated with the input",async()=>{
  const result=await publicView({url:new URL("http://localhost/o/maple-school/search?q=bad"),orgSlug:"maple-school",
    orgName:"Maple",api:{searchItems:async()=>({ok:false,error:{code:"VALIDATION_ERROR",message:"Check query",
      fieldErrors:{query:"Invalid query"}}})},refresh(){}});
  assert.match(result.html,/aria-describedby="search-privacy query-error" aria-invalid="true"/);
  assert.match(result.html,/id="query-error"/);
});
