import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";
import onnx from "onnxruntime-node";
import manifest from "./model-manifest.json" with { type: "json" };

const INPUT_SIZE = 416;
let session;

async function load() {
  const bytes = await readFile(workerData.modelPath);
  if (bytes.length !== manifest.bytes || createHash("sha256").update(bytes).digest("hex") !== manifest.sha256) {
    throw new Error("Item identification model verification failed");
  }
  return onnx.InferenceSession.create(bytes, {
    executionProviders: ["cpu"],
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
    logSeverityLevel: 3,
  });
}

parentPort.on("message", async (pixels) => {
  try {
    if (!(pixels instanceof Float32Array) || pixels.length !== 3 * INPUT_SIZE * INPUT_SIZE) {
      throw new Error("Invalid item identification input");
    }
    session ??= await load();
    const { output } = await session.run({
      images: new onnx.Tensor("float32", pixels, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    });
    if (output.dims.join(",") !== "1,3549,85" || !(output.data instanceof Float32Array)) {
      throw new Error("Invalid item identification output");
    }
    const predictions = new Float32Array(output.data);
    parentPort.postMessage(predictions, [predictions.buffer]);
  } catch {
    parentPort.postMessage(null);
  }
});
