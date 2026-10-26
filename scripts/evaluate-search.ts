// Run only against the disposable local seed. No privileged key, writes or provisioning.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { MODEL, DIMENSIONS, MIN_SIMILARITY } from "../src/lib/search/ranking";
const base=process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const database=process.env.NEXT_PUBLIC_SUPABASE_URL;
if (new URL(base).hostname!=="localhost" || !database || !["127.0.0.1","localhost"].includes(new URL(database).hostname)) throw Error("Evaluation requires local app and local seeded Supabase");
const client=createClient(database,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
const cases=JSON.parse(readFileSync("docs/phase-4/evaluation-cases.json","utf8")) as {kind:string;school:string;query:string;relevant:string[]}[];
let positives=0,baselineHits=0,hybridHits=0,falsePositives=0,leaks=0;
const rows=[];
for (const [index,c] of cases.entries()) {
  const payload={query:c.query,limit:3};
  const baseline=await client.rpc("backend_dispatch",{p_action:"search",p_org_slug:c.school,p_payload:payload});
  if (baseline.error) throw Error("Baseline unavailable");
  const response=await fetch(`${base}/api/v1/organizations/${c.school}/search`,{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const hybrid=await response.json();
  if (!response.ok || hybrid.search?.semanticStatus!=="available") throw Error(`Case ${index+1}: real provider unavailable/disabled or budget exhausted; no quality result claimed`);
  const ids=(data:{item:{id:string;organizationSlug:string}}[])=>data.map(row=>row.item.id);
  const hit=(data:{item:{id:string;organizationSlug:string}}[])=>ids(data).some(id=>c.relevant.includes(id));
  if (c.relevant.length) {positives++;baselineHits+=Number(hit(baseline.data.data));hybridHits+=Number(hit(hybrid.data));}
  else falsePositives+=Number(hybrid.data.length>0);
  leaks+=hybrid.data.filter((row:{item:{organizationSlug:string}})=>row.item.organizationSlug!==c.school).length;
  rows.push({case:index+1,kind:c.kind,baseline:ids(baseline.data.data),hybrid:ids(hybrid.data)});
}
console.log(JSON.stringify({model:MODEL,dimensions:DIMENSIONS,minSimilarity:MIN_SIMILARITY,ranking:"rrf-60-v1",positives,baselineHits,hybridHits,falsePositives,leaks,rows},null,2));
if(hybridHits<7 || falsePositives || leaks) process.exitCode=1;
