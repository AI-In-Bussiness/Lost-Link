import { eligibleBaseline } from "../src/lib/search/eligibility";
// Real local model, fixed synthetic inventory; no Supabase, provider or runtime network.
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { embed, closeEmbedder } from "../src/lib/search/embeddings";
import { semanticSearch } from "../src/lib/search/service";
import { MODEL, DIMENSIONS, MIN_SIMILARITY, MIN_SEPARATION, type SearchItem, type Match } from "../src/lib/search/ranking";
const inventory=JSON.parse(readFileSync("docs/phase-4/evaluation-inventory.json","utf8")) as SearchItem[];
const cases=JSON.parse(readFileSync("docs/phase-4/evaluation-cases.json","utf8")) as {kind:string;school:string;query:string;relevant:string[]}[];
const stop=new Set(['the','with','and','lost','my','near','at','in','is','it','of','to','for','was','has','have','an']);
// Deterministic counterpart of backend_dispatch's public-field keyword baseline.
// The separate eval:search:live command compares the actual SQL/HTTP paths.
function baseline(items:SearchItem[],query:string):Match[] {
  const tokens=query.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>1&&!stop.has(t));
  return eligibleBaseline(items.map(item=>({item,score:tokens.filter(t=>[item.title,item.publicDescription,item.category,item.color,item.publicLocation].join(' ').toLowerCase().includes(t)).length}))
    .filter(row=>row.score>0).sort((a,b)=>b.score-a.score||b.item.foundDate.localeCompare(a.item.foundDate)||a.item.id.localeCompare(b.item.id))
    .slice(0,50).map(({item})=>({item,reasons:['Matching public item details'],method:'structured' as const})),query,3);
}
async function main() {
  let baselineHits=0,hybridHits=0,falsePositives=0,leaks=0;
  const rows=[];
  const started=performance.now();
  for (const [index,c] of cases.entries()) {
    const items=inventory.filter(i=>i.organizationSlug===c.school).sort((a,b)=>a.id.localeCompare(b.id));
    const keyword=baseline(items,c.query);
    const result=await semanticSearch({slug:c.school,query:c.query,limit:3,baseline:keyword,enabled:true,
      inventory:async()=>({items,overflow:false}),embed});
    if(result.search.semanticStatus!=="available") throw Error(`Local model unavailable on case ${index+1}`);
    const ids=(data:Match[])=>data.map(row=>row.item.id);
    const hit=(data:Match[])=>ids(data).some(id=>c.relevant.includes(id));
    if(c.relevant.length){baselineHits+=Number(hit(keyword));hybridHits+=Number(hit(result.data));}
    else falsePositives+=Number(result.data.length>0);
    leaks+=result.data.filter(row=>row.item.organizationSlug!==c.school).length;
    rows.push({case:index+1,kind:c.kind,baseline:ids(keyword),hybrid:ids(result.data)});
  }
  console.log(JSON.stringify({model:MODEL,dimensions:DIMENSIONS,minSimilarity:MIN_SIMILARITY,minSeparation:MIN_SEPARATION,ranking:"rrf-60-eligibility-v2",runtime:"local CPU, q8, one inference thread",inventorySize:inventory.length,positives:8,baselineHits,hybridHits,falsePositives,leaks,elapsedMs:Math.round(performance.now()-started),rows},null,2));
  return hybridHits<7 || falsePositives || leaks ? 1 : 0;
}
main().then(async code=>{await closeEmbedder();process.exit(code);},async()=>{await closeEmbedder();console.error("Local model evaluation failed");process.exit(1);});
