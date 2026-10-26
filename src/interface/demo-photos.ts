/** DEVELOPMENT ONLY. Local photo projection; no bytes are sent to an API. */
import type {
  LostLinkApi,
  Photo,
  PublicItem,
  Result,
} from "../mocks/contracts.ts";
import type { PhotoUpload } from "./types.ts";

export function createDemoPhotos() {
  const photos = new Map<string, Photo>();
  const urls = new Map<string, { released: boolean; pending: number }>();
  const reclaim = (url: string) => {
    const entry = urls.get(url);
    if (
      entry?.released &&
      !entry.pending &&
      ![...photos.values()].some((photo) => photo.url === url)
    ) {
      URL.revokeObjectURL(url);
      urls.delete(url);
    }
  };
  const service: PhotoUpload = {
    async upload(file, onProgress) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPEG, PNG or WebP image.");
      if (file.size < 1 || file.size > 5 * 1024 * 1024)
        throw new Error("Choose an image up to 5 MB.");
      onProgress?.(10);
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (value, i) => bytes[i] === value,
      );
      const isWebp =
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (
        !{ "image/jpeg": isJpeg, "image/png": isPng, "image/webp": isWebp }[
          file.type
        ]
      )
        throw new Error(
          "The file contents do not match a supported image. Choose another photo.",
        );
      onProgress?.(40);
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new Error("This image cannot be opened. Choose another photo.");
      }
      const dimensionsValid =
        bitmap.width > 0 &&
        bitmap.height > 0 &&
        bitmap.width * bitmap.height <= 40_000_000;
      bitmap.close();
      if (!dimensionsValid)
        throw new Error("Choose an image smaller than 40 megapixels.");
      onProgress?.(90);
      const url = URL.createObjectURL(file);
      urls.set(url, { released: false, pending: 0 });
      onProgress?.(100);
      return {
        photo: {
          url,
          alt: "Local preview of a fictional found item",
          isPlaceholder: false,
        },
        upload: {
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          sizeBytes: file.size,
        },
      };
    },
    release(url) {
      const entry = urls.get(url);
      if (entry) {
        entry.released = true;
        reclaim(url);
      }
    },
  };
  const project = <T extends PublicItem>(item: T): T =>
    photos.has(item.id)
      ? { ...item, photo: { ...photos.get(item.id)! } }
      : item;
  const map = async <T, U>(
    promise: Promise<Result<T>>,
    transform: (data: T) => U,
  ): Promise<Result<U>> => {
    const result = await promise;
    return result.ok ? { ok: true, data: transform(result.data) } : result;
  };
  return {
    service,
    reset() {
      for (const url of urls.keys()) URL.revokeObjectURL(url);
      urls.clear();
      photos.clear();
    },
    wrap(api: LostLinkApi): LostLinkApi {
      return {
        ...api,
        searchItems: (input) =>
          map(api.searchItems(input), (page) => ({
            ...page,
            items: page.items.map(project),
          })),
        getPublicItem: (slug, id) => map(api.getPublicItem(slug, id), project),
        listStaffInventory: (input) =>
          map(api.listStaffInventory(input), (page) => ({
            ...page,
            items: page.items.map(project),
          })),
        getStaffItem: (slug, id) =>
          map(api.getStaffItem(slug, id), (detail) => ({
            ...detail,
            item: project(detail.item),
          })),
        listMyClaims: (input) =>
          map(api.listMyClaims(input), (page) => ({
            ...page,
            items: page.items.map((claim) => ({
              ...claim,
              item: project(claim.item),
            })),
          })),
        getMyClaim: (id) =>
          map(api.getMyClaim(id), (claim) => ({
            ...claim,
            item: project(claim.item),
          })),
        submitClaim: (input) =>
          map(api.submitClaim(input), (claim) => ({
            ...claim,
            item: project(claim.item),
          })),
        decideClaim: (input) =>
          map(api.decideClaim(input), (data) => ({
            ...data,
            item: project(data.item),
          })),
        recordReturn: (input) =>
          map(api.recordReturn(input), (data) => ({
            ...data,
            item: project(data.item),
          })),
        async createItem(input) {
          if (input.photo.isPlaceholder) return api.createItem(input);
          const entry = urls.get(input.photo.url);
          if (!entry)
            return {
              ok: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Choose the photo again.",
                requestId: "demo-photo",
                fieldErrors: {
                  photo: "This local photo is no longer available.",
                },
              },
            };
          entry.pending++;
          try {
            // Preserve Phase 1's placeholder-only adapter. Project the browser photo onto its result.
            const result = await api.createItem({
              ...input,
              photo: {
                ...input.photo,
                url: "/mock-assets/item-placeholder.svg",
                isPlaceholder: true,
              },
            });
            if (result.ok) {
              photos.set(result.data.id, { ...input.photo });
              return { ok: true, data: project(result.data) };
            }
            return result;
          } finally {
            entry.pending--;
            reclaim(input.photo.url);
          }
        },
      };
    },
  };
}
