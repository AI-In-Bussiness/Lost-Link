import test from "node:test";
import assert from "node:assert/strict";
import { eligibleBaseline, structuredEligible, supportsQuery, supportsQueryColor, supportsQueryType } from "../src/lib/search/eligibility";
import { semanticSearch } from "../src/lib/search/service";
import { DIMENSIONS, type SearchItem } from "../src/lib/search/ranking";
const item = (title:string, category="other", color="blue", publicDescription="A synthetic item."):SearchItem => ({id:title,organizationSlug:"school",title,category,color,publicDescription,publicLocation:"Library",foundDate:"2026-01-01"});
const row = (item:SearchItem)=>({item,reasons:["Matching public item details"],method:"structured" as const});
const unit=Array.from({length:DIMENSIONS},(_,i)=>Number(i===0));
test("components, shared colors and substrings do not substitute for a requested object",()=>{
  const pack=item("Black backpack","bag","black","A padded laptop sleeve.");
  const keys=item("Keys on green lanyard","keys","green","Two silver keys.");
  const pencil=item("Blue pencil case","other","blue","A hard zipped case.");
  for(const [candidate,query] of [[pack,"silver laptop computer"],[keys,"silver laptop computer"],[pencil,"wooden violin in a hard case"],[pencil,"blue desktop computer"],[pack,"cap"]] as const)
    assert.equal(structuredEligible(candidate,query),false,query);
  assert.equal(supportsQueryType(item("Blue laptop sleeve"),"blue laptop computer"),false);
});
test("matching objects are permitted, including types absent from the old inventory",()=>{
  for(const [candidate,query] of [[item("Silver laptop computer","electronics","silver"),"silver laptop computer"],[item("Wooden violin in hard case","other","brown"),"wooden violin in a hard case"],[item("Golf clubs","other","black"),"golf clubs"],[item("Blue computer sleeve"),"blue laptop sleeve"]] as const){
    assert.equal(supportsQuery(candidate,query),true,query);
    assert.equal(structuredEligible(candidate,query),true,query);
  }
});
test("explicit colors, aliases and multi-color public facts are handled before ranking",()=>{
  assert.equal(supportsQueryColor(item("Navy sweatshirt","clothing","navy"),"dark blue jumper"),true);
  assert.equal(supportsQueryColor(item("Black backpack","bag","black","White logo."),"white sports bag"),true);
  assert.equal(supportsQueryColor(item("Yellow cap","clothing","yellow"),"black or yellow cap"),true);
  assert.equal(supportsQueryColor(item("Red coat","clothing","red"),"navy hooded sweatshirt"),false);
  const candidate={...item("Blue bottle","bottle","blue"),publicLocation:"Red hall"};
  assert.equal(supportsQueryColor(candidate,"red bottle"),false);
});
test("whole-word anchors, attribute-only search and ordinary request context remain useful",()=>{
  assert.equal(structuredEligible(item("Black Nike duffel","bag","black","White swoosh."),"dark gym holdall with a white tick"),true);
  const pack=item("Black backpack","bag","black");
  for(const query of ["black backpack","please help find my black backpack left somewhere yesterday","black","library","bag"])
    assert.equal(structuredEligible(pack,query),true,query);
  assert.equal(structuredEligible(pack," "),false);
  assert.deepEqual(eligibleBaseline([row(pack),row(item("Blue pencil case"))],"black backpack",1),[row(pack)]);
});
test("unsupported objects fail in semantic, disabled, busy and unavailable paths without changing status",async()=>{
  const candidate=item("Blue bottle","bottle","blue");
  for(const mode of ["model","disabled","overflow","unavailable"]){
    const result=await semanticSearch({slug:"school",query:"blue laptop computer",limit:3,baseline:[row(candidate)],enabled:mode!=="disabled",
      inventory:async()=>({items:[candidate],overflow:mode==="overflow"}),embed:async()=>{if(mode==="unavailable")throw Error("unavailable");return [unit,unit];}});
    assert.deepEqual(result.data,[],mode);
    assert.equal(result.search.semanticStatus,mode==="model"?"available":mode==="disabled"?"disabled":"unavailable");
  }
});
