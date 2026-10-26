// Additional frozen relevance set. Does not tune thresholds or write app data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { embed, closeEmbedder } from "../../src/lib/search/embeddings";
import { semanticSearch } from "../../src/lib/search/service";
import { MODEL, MIN_SIMILARITY, MIN_SEPARATION, type SearchItem } from "../../src/lib/search/ranking";
import { scoped, baseline, assess, type Case } from "./evaluation.ts";
const set = JSON.parse(readFileSync(fileURLToPath(new URL("./relevance-set.json",import.meta.url)),"utf8")) as {version:string;items:SearchItem[];cases:Case[]};
const mode = process.argv[2] ?? "model";
if (!["model","fallback"].includes(mode)) throw Error("Use model or fallback");
const rows = [];
try {
  for (const c of set.cases) {
    const items = scoped(set.items,c), keyword = baseline(items,c.query);
    const result = await semanticSearch({slug:c.school,query:c.query,limit:3,baseline:keyword,enabled:true,
      inventory:async()=>({items,overflow:false}),
      embed: mode === "fallback" ? async()=>{throw Error("Intentional unavailable model");} : embed});
    if (mode === "model" && result.search.semanticStatus !== "available")
      throw Error("Model unavailable: no relevance result claimed");
    if (mode === "fallback" && (JSON.stringify(result.data) !== JSON.stringify(keyword) ||
      result.search.semanticStatus !== (items.length ? "unavailable" : "available")))
      throw Error("Fallback changed keyword results or misreported status");
    rows.push({id:c.id,kind:c.kind,positive:!!c.relevant.length,
      baseline:keyword.map(r=>r.item.id),results:result.data.map(r=>r.item.id),
      keyword:assess(c,keyword),actual:assess(c,result.data)});
  }
  const core = rows.filter(r=>["exact","paraphrase"].includes(r.kind));
  const filters = rows.filter(r=>r.kind==="filter" && r.positive);
  const passed = core.filter(r=>r.actual.hit).length >= 14 &&
    filters.every(r=>r.actual.hit) && rows.every(r=>!r.actual.falsePositive && !r.actual.leaks && !r.actual.filterLeaks);
  console.log(JSON.stringify({version:set.version,mode,model:MODEL,minSimilarity:MIN_SIMILARITY,minSeparation:MIN_SEPARATION,
    inventorySize:set.items.length,caseCount:rows.length,
    coreHits:core.filter(r=>r.actual.hit).length,corePositives:core.length,
    baselineCoreHits:core.filter(r=>r.keyword.hit).length,
    coreMRR:core.reduce((sum,r)=>sum+r.actual.reciprocalRank,0)/core.length,
    proposedGatePassed:mode==="model"?passed:null,rows},null,2));
  if (mode === "model" && !passed) process.exitCode=1;
} finally { await closeEmbedder(); }
