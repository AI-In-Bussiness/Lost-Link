/** Browser preparation only. The server still validates and sanitizes every upload. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 40_000_000;

const invalid = () =>
  new Error(
    "This photo cannot be opened. Choose a valid JPEG, PNG or WebP image.",
  );
const animated = () =>
  new Error("Animated images are not supported. Choose a still photo.");

/** Inspect dimensions and animation before allocating a decoded bitmap. */
function dimensions(bytes: Uint8Array): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));
  const uint24 = (offset: number) =>
    bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    if (bytes.length < 33 || view.getUint32(8) !== 13 || text(12, 4) !== "IHDR")
      throw invalid();
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const end = offset + 12 + view.getUint32(offset);
      if (end > bytes.length) throw invalid();
      const type = text(offset + 4, 4);
      if (type === "acTL") throw animated();
      offset = end;
      if (type === "IEND") return [view.getUint32(16), view.getUint32(20)];
    }
    throw invalid();
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw invalid();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw invalid();
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) throw invalid();
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        if (size < 8) throw invalid();
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      }
      offset += size;
    }
    throw invalid();
  }
  if (text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    const end = view.getUint32(4, true) + 8;
    if (end > bytes.length) throw invalid();
    let result: [number, number] | undefined;
    for (let offset = 12; offset + 8 <= end; ) {
      const type = text(offset, 4),
        size = view.getUint32(offset + 4, true),
        data = offset + 8;
      if (data + size > end) throw invalid();
      if (
        type === "ANIM" ||
        type === "ANMF" ||
        (type === "VP8X" && size >= 1 && bytes[data] & 2)
      )
        throw animated();
      if (type === "VP8X" && size >= 10)
        result = [uint24(data + 4) + 1, uint24(data + 7) + 1];
      else if (
        !result &&
        type === "VP8 " &&
        size >= 10 &&
        text(data + 3, 3) === "\x9d\x01\x2a"
      ) {
        result = [
          view.getUint16(data + 6, true) & 0x3fff,
          view.getUint16(data + 8, true) & 0x3fff,
        ];
      } else if (
        !result &&
        type === "VP8L" &&
        size >= 5 &&
        bytes[data] === 0x2f
      ) {
        const bits = view.getUint32(data + 1, true);
        result = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      }
      offset = data + size + (size % 2);
    }
    if (result) return result;
  }
  throw invalid();
}

export async function preparePhoto(file: File): Promise<File> {
  if (!file.size) throw new Error("Choose a nonempty JPEG, PNG or WebP photo.");
  // Keep ordinary uploads byte-for-byte intact; the server checks their format and dimensions.
  if (file.size <= MAX_PHOTO_BYTES) return file;
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error(
      "Choose a photo of 32 MiB or smaller for automatic compression.",
    );
  const [width, height] = dimensions(new Uint8Array(await file.arrayBuffer()));
  if (!width || !height || width * height > MAX_SOURCE_PIXELS) {
    throw new Error(
      "Choose a photo of 40 megapixels or smaller for automatic compression.",
    );
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw invalid();
  }
  const canvas = document.createElement("canvas");
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > MAX_SOURCE_PIXELS
    )
      throw invalid();
    let scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 4; attempt++, scale *= 0.75) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          "This browser could not prepare the photo. Try another browser or a smaller image.",
        );
      // JPEG works across browsers; white preserves the appearance of transparent photos.
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (
          blob?.type === "image/jpeg" &&
          blob.size > 0 &&
          blob.size <= MAX_PHOTO_BYTES
        ) {
          return new File([blob], "item-photo.jpg", { type: blob.type });
        }
      }
    }
    throw new Error(
      "This photo could not be compressed to 4 MiB. Choose a smaller photo.",
    );
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}
