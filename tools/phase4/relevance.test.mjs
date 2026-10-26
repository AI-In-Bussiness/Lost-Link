import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoped, assess } from "./evaluation.ts";
const set = JSON.parse(readFileSync(new URL("./relevance-set.json",import.meta.url),"utf8"));
test("frozen cases have valid in-school labels, distractors and category coverage",()=>{
  assert.equal(set.items.length,18);
  assert.equal(new Set(set.items.map(i=>i.id)).size,18);
  assert.equal(set.cases.length,28);
  assert.equal(new Set(set.cases.map(c=>c.id)).size,28);
  assert.equal(new Set(set.items.map(i=>i.category)).size,6);
  for (const c of set.cases) {
    assert.ok(c.rationale);
    const candidates = scoped(set.items,c);
    for (const id of c.relevant) assert.ok(candidates.some(i=>i.id===id),c.id);
    if (c.kind!=="filter") assert.ok(candidates.length>=8);
  }
  for (const [kind,count] of [["exact",8],["paraphrase",8],["no-match",4],["wrong-school",4],["filter",4]])
    assert.equal(set.cases.filter(c=>c.kind===kind).length,count);
});
test("date boundaries separate identical public descriptions; filters never widen scope",()=>{
  const c=set.cases.find(c=>c.id==="filter-date");
  const ids=scoped(set.items,c).map(i=>i.id);
  assert.ok(ids.includes("a-flask"));
  assert.ok(!ids.includes("a-old-flask"));
  assert.deepEqual(scoped(set.items,set.cases.find(c=>c.id==="filter-excludes")),[]);
});
test("scorer detects misses, wrong-school results, false positives and filter leaks",()=>{
  const positive=set.cases[0], target=set.items.find(i=>i.id===positive.relevant[0]);
  const foreign=set.items.find(i=>i.organizationSlug!==positive.school);
  const row=item=>({item,reasons:[],method:"structured"});
  assert.equal(assess(positive,[row(target)]).reciprocalRank,1);
  assert.equal(assess(positive,[row(foreign),row(target)]).reciprocalRank,0.5);
  assert.equal(assess(positive,[]).hit,false);
  assert.equal(assess(positive,[row(foreign)]).leaks,1);
  assert.equal(assess({...positive,relevant:[]},[row(target)]).falsePositive,true);
  const dateCase=set.cases.find(c=>c.id==="filter-date");
  assert.equal(assess(dateCase,[row(set.items.find(i=>i.id==="a-old-flask"))]).filterLeaks,1);
});
