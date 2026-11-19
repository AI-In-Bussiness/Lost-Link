import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import sharp from "sharp";
import { draftFromDetections, INPUT_SIZE, modelPixels, OUTPUT_LENGTH } from "./item-draft";
import manifest from "./model-manifest.json";

const modelPath = join(process.cwd(), "models/yolox-nano", manifest.path);
const workerPath = join(process.cwd(), "src/lib/photos/local-worker.mjs");
let worker: Worker | undefined;
let busy = false;
let stopping = false;

export class ItemIdentificationError extends Error {
  readonly code: "ITEM_NOT_RECOGNIZED" | "UNAVAILABLE";

  constructor(public readonly status: 422 | 502 | 503) {
    super(status === 422
      ? "No item could be identified. Try another photo or enter the details manually."
      : "Photo identification is unavailable. You can enter the details manually.");
    this.code = status === 422 ? "ITEM_NOT_RECOGNIZED" : "UNAVAILABLE";
  }
}

export function isItemIdentificationConfigured(): boolean {
  return process.env.LOSTLINK_ITEM_IDENTIFICATION !== "false" && existsSync(modelPath);
}

function startWorker() {
  // The native runtime reads the main process environment, including in workers.
  process.env.ORT_DISABLE_TELEMETRY = "1";
  const active = new Worker(workerPath, { workerData: { modelPath }, execArgv: [] });
  const release = () => {
    if (worker === active) worker = undefined;
  };
  active.on("error", release);
  active.on("exit", release);
  return active;
}

function runModel(pixels: Float32Array<ArrayBuffer>, signal?: AbortSignal) {
  const active = worker ??= startWorker();
  active.ref();
  return new Promise<Float32Array>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      active.off("message", onMessage);
      active.off("error", onError);
      active.off("exit", onError);
      signal?.removeEventListener("abort", onUnavailable);
    };
    const fail = (status: 502 | 503) => {
      cleanup();
      if (worker === active) worker = undefined;
      stopping = true;
      void active.terminate().catch(() => undefined).finally(() => { stopping = false; });
      reject(new ItemIdentificationError(status));
    };
    const onError = () => fail(502);
    const onUnavailable = () => fail(503);
    const onMessage = (predictions: unknown) => {
      if (!(predictions instanceof Float32Array) || predictions.length !== OUTPUT_LENGTH) return onError();
      cleanup();
      active.unref();
      resolve(predictions);
    };
    const timer = setTimeout(onUnavailable, 15_000);
    active.once("message", onMessage);
    active.once("error", onError);
    active.once("exit", onError);
    signal?.addEventListener("abort", onUnavailable, { once: true });
    if (signal?.aborted) return onUnavailable();
    try { active.postMessage(pixels, [pixels.buffer]); } catch { onError(); }
  });
}

export async function identifyItem(image: { bytes: Buffer }, signal?: AbortSignal) {
  if (!isItemIdentificationConfigured() || busy || stopping || signal?.aborted) {
    throw new ItemIdentificationError(503);
  }
  busy = true;
  try {
    const { data, info } = await sharp(image.bytes)
      .resize(INPUT_SIZE, INPUT_SIZE, { fit: "inside" })
      .flatten({ background: "#fff" })
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const photo = { data, width: info.width, height: info.height };
    const predictions = await runModel(modelPixels(photo), signal);
    const draft = draftFromDetections(predictions, photo);
    if (!draft) throw new ItemIdentificationError(422);
    return draft;
  } catch (error) {
    if (error instanceof ItemIdentificationError) throw error;
    throw new ItemIdentificationError(502);
  } finally {
    busy = false;
  }
}
