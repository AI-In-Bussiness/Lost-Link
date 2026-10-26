import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 20_000_000;
export class ImageError extends Error {
  constructor(public status: 400 | 413 | 415, public code: string, message: string) { super(message); }
}

function sourceFormat(bytes: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function rejectAnimation(bytes: Buffer, format: string) {
  if (format === 'png') {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(offset), end = offset + 12 + size;
      if (end > bytes.length) throw new ImageError(400, 'VALIDATION_ERROR', 'The image is incomplete.');
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (type === 'acTL') throw new ImageError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Animated images are not supported.');
      offset = end;
      if (type === 'IEND') break;
    }
  }
  if (format === 'webp') {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const size = bytes.readUInt32LE(offset + 4), end = offset + 8 + size;
      if (end > bytes.length) throw new ImageError(400, 'VALIDATION_ERROR', 'The image is incomplete.');
      const type = bytes.toString('ascii', offset, offset + 4);
      if (type === 'ANIM' || type === 'ANMF' || (type === 'VP8X' && size >= 1 && (bytes[offset + 8] & 2))) {
        throw new ImageError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Animated images are not supported.');
      }
      offset = end + (size % 2);
    }
  }
}

/** Decode untrusted bytes, orient, resize, strip metadata, and produce a new WebP.
 * No caller MIME/filename or original image bytes become published content.
 */
export async function sanitizeImage(input: Uint8Array): Promise<{
  bytes: Buffer; width: number; height: number; sha256: string; contentType: 'image/webp';
}> {
  if (!input.length) throw new ImageError(400, 'VALIDATION_ERROR', 'Choose a non-empty image.');
  if (input.length > MAX_IMAGE_BYTES) throw new ImageError(413, 'PAYLOAD_TOO_LARGE', 'Images must be at most 4 MiB.');
  const bytes = Buffer.from(input);
  const format = sourceFormat(bytes);
  if (!format) throw new ImageError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use a JPEG, PNG or WebP image.');
  rejectAnimation(bytes, format);
  try {
    // Unlimited metadata inspection does not decode pixels; reject dimensions before decoding.
    const metadata = await sharp(bytes, { limitInputPixels: false, failOn: 'warning' }).metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height) throw new Error('Invalid image');
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) throw new ImageError(413, 'PAYLOAD_TOO_LARGE', 'Images must be at most 20 megapixels.');
    if ((metadata.pages ?? 1) !== 1) throw new ImageError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Animated images are not supported.');
    const output = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning', sequentialRead: true })
      .rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    if (!output.data.length || output.data.length > MAX_IMAGE_BYTES) throw new ImageError(413, 'PAYLOAD_TOO_LARGE', 'The processed image is too large.');
    return { bytes: output.data, width: output.info.width, height: output.info.height,
      sha256: createHash('sha256').update(output.data).digest('hex'), contentType: 'image/webp' };
  } catch (error) {
    if (error instanceof ImageError) throw error;
    throw new ImageError(400, 'VALIDATION_ERROR', 'The image could not be decoded safely.');
  }
}
