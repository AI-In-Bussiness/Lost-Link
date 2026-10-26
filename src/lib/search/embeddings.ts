import { Worker } from "node:worker_threads";
import { join } from "node:path";
import { z } from "zod";
import { DIMENSIONS, MAX_CANDIDATES } from "./ranking";

const vector = z.array(z.number().finite()).length(DIMENSIONS).refine(v => Math.hypot(...v)>0);
const resultSchema = z.array(vector).min(1).max(MAX_CANDIDATES+1);
let worker: Worker | undefined;
let busy = false;
/** One CPU worker per app process. Busy/missing/failed/timed-out inference falls back. */
export async function embed(input: string[]): Promise<number[][]> {
  if (!input.length || input.length>MAX_CANDIDATES+1 || input.some(s => !s.trim() || s.length>1800)) throw new Error("Embedding bounds");
  if (busy) throw new Error("Local inference busy");
  busy = true;
  try {
    const active = worker ??= new Worker(join(process.cwd(), "src/lib/search/local-worker.mjs"), {
      workerData: { modelDir: join(process.cwd(), "models/all-MiniLM-L6-v2") }, execArgv: [],
    });
    active.ref();
    const vectors = await new Promise<unknown>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        active.off("message", onMessage); active.off("error", onError); active.off("exit", onExit);
      };
      const fail = () => {
        cleanup(); if (worker === active) worker = undefined;
        void active.terminate(); reject(new Error("Local inference unavailable"));
      };
      const onMessage = (message: {vectors?: unknown; error?: boolean}) => {
        if (message.error) return fail();
        cleanup(); active.unref(); resolve(message.vectors);
      };
      const onError = () => fail();
      const onExit = () => fail();
      const timer = setTimeout(fail, 15_000);
      active.once("message", onMessage); active.once("error", onError); active.once("exit", onExit);
      active.postMessage(input);
    });
    const parsed = resultSchema.parse(vectors);
    if (parsed.length !== input.length) throw new Error("Missing local embeddings");
    return parsed;
  } finally { busy = false; }
}
/** Release native model memory when an offline evaluation finishes. */
export async function closeEmbedder(): Promise<void> {
  const active = worker; worker = undefined;
  if (active) await active.terminate();
}
