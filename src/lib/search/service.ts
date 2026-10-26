import { MAX_CANDIDATES, publicText, rank, type Match, type SearchItem } from "./ranking";
export type SearchMeta = {mode:"structured"|"hybrid"; semanticStatus:"disabled"|"available"|"unavailable"};
type Inventory<T> = {items:T[]; overflow:boolean};
export async function semanticSearch<T extends SearchItem>(options: {
  slug:string; query:string; limit:number; baseline:Match<T>[]; enabled:boolean;
  inventory:()=>Promise<Inventory<T>>; reserve:()=>Promise<boolean>; embed:(input:string[])=>Promise<number[][]>;
}):Promise<{data:Match<T>[]; search:SearchMeta}> {
  const fallback=(status:SearchMeta["semanticStatus"])=>({data:options.baseline, search:{mode:"structured" as const, semanticStatus:status}});
  if (!options.enabled) return fallback("disabled");
  try {
    const before=await options.inventory();
    if (before.overflow || before.items.length>MAX_CANDIDATES) return fallback("unavailable");
    // Fail closed even if a caller accidentally supplies staff or another school's inventory.
    if (before.items.some(i=>i.organizationSlug!==options.slug)) return fallback("unavailable");
    if (!before.items.length) return {data:[],search:{mode:"structured",semanticStatus:"available"}};
    if (!await options.reserve()) return fallback("unavailable");
    const texts=before.items.map(publicText);
    const vectors=await options.embed([options.query,...texts]);
    const after=await options.inventory();
    // Re-read visibility after external IO. New/edited/withdrawn inventory invalidates the batch.
    if (after.overflow || after.items.length!==before.items.length || after.items.some((item,i)=>item.organizationSlug!==options.slug || item.id!==before.items[i].id || publicText(item)!==texts[i])) {
      // Do not return an earlier baseline whose visibility may have changed.
      throw new InventoryChanged();
    }
    const data=rank(after.items,vectors.slice(1),vectors[0],options.baseline,options.limit);
    return {data,search:{mode:data.some(row=>row.method==="hybrid") ? "hybrid" : "structured",semanticStatus:"available"}};
  } catch (error) {
    if (error instanceof InventoryChanged) throw error;
    return fallback("unavailable");
  }
}
export class InventoryChanged extends Error {}
