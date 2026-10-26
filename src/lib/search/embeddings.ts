import { z } from "zod";
import { DIMENSIONS, MAX_CANDIDATES, MODEL } from "./ranking";

const vector = z.array(z.number().finite()).length(DIMENSIONS).refine(v => Math.hypot(...v)>0);
const resultSchema = z.object({data:z.array(z.object({index:z.number().int().min(0), embedding:vector})).max(MAX_CANDIDATES+1)});
/** Fixed origin/model, bounded bytes and time; no retries, provider errors or input logging. */
export async function embed(input: string[], key: string, transport: typeof fetch = fetch): Promise<number[][]> {
  if (!input.length || input.length>MAX_CANDIDATES+1 || input.some(s => s.length>1800)) throw new Error("Embedding bounds");
  const response = await transport("https://api.openai.com/v1/embeddings", {
    method:"POST", headers:{Authorization:`Bearer ${key}`, "Content-Type":"application/json"},
    body:JSON.stringify({model:MODEL, dimensions:DIMENSIONS, input, encoding_format:"float"}),
    signal:AbortSignal.timeout(2500), redirect:"error", cache:"no-store",
  });
  if (!response.ok || !response.body) throw new Error("Embedding unavailable");
  const reader=response.body.getReader();
  const chunks: Uint8Array[]=[];
  let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      size+=value.byteLength;
      if (size>1024*1024) throw new Error("Embedding response bounds");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const parsed=resultSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  const ordered=[...parsed.data].sort((a,b)=>a.index-b.index);
  if (ordered.length!==input.length || ordered.some((row,i)=>row.index!==i)) throw new Error("Invalid embedding indices");
  return ordered.map(row=>row.embedding);
}
