import type { category } from "../api/contracts";
import type { z } from "zod";

export const INPUT_SIZE = 416;
export const OUTPUT_LENGTH = 3549 * 85;
const MIN_SCORE = 0.35;
const STRIDES = [8, 16, 32];
const CLASS_COUNT = 80;
const ROW_LENGTH = 5 + CLASS_COUNT;

type ItemKind = { readonly name: string; readonly category: z.infer<typeof category> };
type PhotoPixels = { data: Uint8Array; width: number; height: number };
type Box = { left: number; top: number; right: number; bottom: number };

// YOLOX uses the zero-based COCO class order, which differs from COCO category IDs.
const inventoryKinds = new Map<number, ItemKind>([
  [24, { name: "backpack", category: "bag" }],
  [25, { name: "umbrella", category: "other" }],
  [26, { name: "handbag", category: "bag" }],
  [27, { name: "tie", category: "clothing" }],
  [28, { name: "suitcase", category: "bag" }],
  [29, { name: "flying disc", category: "other" }],
  [32, { name: "sports ball", category: "other" }],
  [34, { name: "baseball bat", category: "other" }],
  [35, { name: "baseball glove", category: "other" }],
  [36, { name: "skateboard", category: "other" }],
  [38, { name: "tennis racket", category: "other" }],
  [39, { name: "bottle", category: "bottle" }],
  [41, { name: "cup", category: "other" }],
  [63, { name: "laptop", category: "electronics" }],
  [64, { name: "computer mouse", category: "electronics" }],
  [65, { name: "remote control", category: "electronics" }],
  [66, { name: "keyboard", category: "electronics" }],
  [67, { name: "phone", category: "electronics" }],
  [73, { name: "book", category: "other" }],
  [74, { name: "clock", category: "other" }],
  [76, { name: "pair of scissors", category: "other" }],
  [77, { name: "teddy bear", category: "other" }],
]);

/** Letterbox RGB pixels as the release model's planar BGR float image. */
export function modelPixels({ data, width, height }: PhotoPixels) {
  const plane = INPUT_SIZE * INPUT_SIZE;
  const output = new Float32Array(3 * plane).fill(114);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * INPUT_SIZE + x;
      const source = (y * width + x) * 3;
      output[index] = data[source + 2];
      output[plane + index] = data[source + 1];
      output[2 * plane + index] = data[source];
    }
  }
  return output;
}

function pixelColor(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  if (max < 46) return "black";
  if (min > 213) return "white";
  if (chroma < 26) return "gray";

  const hue = 60 * (max === red ? (green - blue) / chroma
    : max === green ? 2 + (blue - red) / chroma : 4 + (red - green) / chroma);
  const angle = (hue + 360) % 360;
  if (angle >= 12 && angle < 57 && max < 165) return "brown";
  if ((angle < 18 || angle >= 323) && min > 108) return "pink";
  if (angle < 16 || angle >= 343) return "red";
  if (angle < 47) return "orange";
  if (angle < 69) return "yellow";
  if (angle < 165) return "green";
  if (angle < 196) return "teal";
  if (angle < 253) return "blue";
  if (angle < 305) return "purple";
  return "pink";
}

function dominantColor({ data, width }: PhotoPixels, box: Box) {
  // Focus on the middle of the box to reduce the effect of the photo background.
  const insetX = Math.floor((box.right - box.left) * 0.2);
  const insetY = Math.floor((box.bottom - box.top) * 0.2);
  const votes = new Map<string, number>();
  let sampled = 0;
  for (let y = box.top + insetY; y < box.bottom - insetY; y += 2) {
    for (let x = box.left + insetX; x < box.right - insetX; x += 2) {
      const offset = (y * width + x) * 3;
      const color = pixelColor(data[offset], data[offset + 1], data[offset + 2]);
      votes.set(color, (votes.get(color) ?? 0) + 1);
      sampled++;
    }
  }
  const [first, second] = [...votes].sort((a, b) => b[1] - a[1]);
  return first && first[1] >= sampled * 0.42 && first[1] >= (second?.[1] ?? 0) * 1.25
    ? first[0] : "unknown";
}

function topDetection(predictions: Float32Array, { width, height }: PhotoPixels) {
  let bestScore = MIN_SCORE;
  let detection: { kind: ItemKind; box: Box } | undefined;
  let offset = 0;
  // The release emits raw center offsets, log dimensions, and class probabilities.
  for (const stride of STRIDES) {
    const side = INPUT_SIZE / stride;
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++, offset += ROW_LENGTH) {
        const objectness = predictions[offset + 4];
        if (objectness < bestScore) continue;
        let classId = 0;
        for (let id = 1; id < CLASS_COUNT; id++) {
          if (predictions[offset + 5 + id] > predictions[offset + 5 + classId]) classId = id;
        }
        const kind = inventoryKinds.get(classId);
        const score = objectness * predictions[offset + 5 + classId];
        if (!kind || !Number.isFinite(score) || score < bestScore || score > 1) continue;

        const centerX = (predictions[offset] + x) * stride;
        const centerY = (predictions[offset + 1] + y) * stride;
        const halfWidth = Math.exp(predictions[offset + 2]) * stride / 2;
        const halfHeight = Math.exp(predictions[offset + 3]) * stride / 2;
        if (!(centerX >= 0 && centerX < width && centerY >= 0 && centerY < height)
          || !Number.isFinite(halfWidth) || !Number.isFinite(halfHeight)) continue;
        const box = {
          left: Math.max(0, Math.floor(centerX - halfWidth)),
          top: Math.max(0, Math.floor(centerY - halfHeight)),
          right: Math.min(width, Math.ceil(centerX + halfWidth)),
          bottom: Math.min(height, Math.ceil(centerY + halfHeight)),
        };
        if (box.right - box.left < 8 || box.bottom - box.top < 8) continue;
        bestScore = score;
        detection = { kind, box };
      }
    }
  }
  return detection;
}

export function draftFromDetections(predictions: Float32Array, photo: PhotoPixels) {
  const detection = topDetection(predictions, photo);
  if (!detection) return null;
  const color = dominantColor(photo, detection.box);
  const name = color === "unknown" ? detection.kind.name : `${color} ${detection.kind.name}`;
  return {
    title: name[0].toUpperCase() + name.slice(1),
    category: detection.kind.category,
    color,
    publicDescription: `${/^[aeiou]/i.test(name) ? "An" : "A"} ${name} shown in the photo.`,
  };
}
