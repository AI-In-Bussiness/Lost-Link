import assert from "node:assert/strict";
import test from "node:test";
import { draftFromDetections, INPUT_SIZE, modelPixels, OUTPUT_LENGTH } from "../src/lib/photos/item-draft";

const plane = INPUT_SIZE * INPUT_SIZE;

function detection(predictions: Float32Array, column: number, row: number, classId: number, probability: number) {
  const offset = (row * (INPUT_SIZE / 8) + column) * 85;
  predictions.set([0, 0, Math.log(5), Math.log(5), 0.9], offset);
  predictions[offset + 5 + classId] = probability;
}

test("the model receives planar BGR pixels with 114 padding", () => {
  const input = modelPixels({ data: new Uint8Array([28, 60, 123, 91, 48, 3]), width: 2, height: 1 });
  assert.equal(input.length, plane * 3);
  assert.deepEqual([...input.slice(0, 3)], [123, 3, 114]);
  assert.deepEqual([...input.slice(plane, plane + 3)], [60, 48, 114]);
  assert.deepEqual([...input.slice(2 * plane, 2 * plane + 3)], [28, 91, 114]);
  assert.equal(input[INPUT_SIZE], 114);
});

test("a supported detection uses the item's color rather than the photo background", () => {
  const predictions = new Float32Array(OUTPUT_LENGTH);
  detection(predictions, 3, 3, 0, 0.99); // Person is excluded from inventory.
  detection(predictions, 5, 5, 39, 0.82);
  const width = 80;
  const height = 80;
  const data = new Uint8Array(width * height * 3).fill(255);
  for (let y = 20; y < 60; y++) {
    for (let x = 20; x < 60; x++) data.set([35, 82, 199], (y * width + x) * 3);
  }
  assert.deepEqual(draftFromDetections(predictions, { data, width, height }), {
    title: "Blue bottle",
    category: "bottle",
    color: "blue",
    publicDescription: "A blue bottle shown in the photo.",
  });
});

test("unsupported, low-confidence and padding-only detections allow manual intake", () => {
  const predictions = new Float32Array(OUTPUT_LENGTH);
  detection(predictions, 5, 5, 16, 0.95); // Dog is excluded from inventory.
  detection(predictions, 6, 6, 39, 0.2);
  detection(predictions, 20, 20, 39, 0.92);
  const width = 80;
  const height = 80;
  const data = new Uint8Array(width * height * 3);
  assert.equal(draftFromDetections(predictions, { data, width, height }), null);
});
