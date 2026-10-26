import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "./embeddings";
import { semanticSearch, InventoryChanged } from "./service";
import type { Match, SearchItem } from "./ranking";

export async function enhanceSearch(client:SupabaseClient, slug:string, payload:Record<string,unknown>, baseline:{data:Match<SearchItem>[]}) {
  const key=process.env.OPENAI_API_KEY;
  return semanticSearch({slug, query:String(payload.query), limit:Number(payload.limit), baseline:baseline.data,
    enabled:process.env.LOSTLINK_SEMANTIC_SEARCH==="true" && !!key,
    inventory:async()=>{
      const {data,error}=await client.rpc("backend_dispatch",{p_action:"items",p_org_slug:slug,p_payload:{limit:50,...Object.fromEntries(["category","color","from","to"].filter(k=>payload[k]!==undefined).map(k=>[k,payload[k]]))}});
      if (error || !Array.isArray(data?.data)) throw new InventoryChanged();
      return {items:data.data as SearchItem[],overflow:!!data.page?.nextCursor};
    },
    reserve:async()=>{const {data,error}=await client.rpc("reserve_semantic_search",{p_org_slug:slug}); return !error && data===true;},
    embed:input=>embed(input,key!),
  });
}
