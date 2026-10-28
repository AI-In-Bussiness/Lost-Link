import type { StaffItem, StaffPhoto } from "./contracts.ts";
import type { ViewContext } from "./types.ts";
import { e, formError, submitting } from "./shared.ts";

export function photoPanel(item: StaffItem, photos: StaffPhoto[]): string {
  const pending =
    item.status === "available" &&
    photos.some((photo) => photo.status === "pending");
  return `<section id="photo-review" class="card stack" aria-labelledby="photo-review-heading"><h2 id="photo-review-heading">Item photographs</h2>${pending ? '<p class="notice" role="status">Photo uploaded. Review the private preview below, check the confirmation box, then select Publish reviewed photo to show it publicly.</p>' : ""}<p>Upload a photo, inspect the processed preview, then approve it for public viewing. Keep names, addresses, serial numbers and hidden ownership clues out of the picture.</p>
    ${photos.length ? photos.map((photo) => `<div class="stack"><img src="${e(photo.url)}" alt="${e(photo.alt)}" width="400" style="max-width:100%;height:auto"><p>${photo.status === "published" ? "Published photograph" : "Private preview · not published"}</p>${photo.status === "pending" && item.status === "available" ? `<form data-publish-photo="${e(photo.id)}" class="stack"><div data-errors></div><label class="check"><input type="checkbox" name="reviewed" required> I inspected this processed photo and it contains no personal information or private ownership clues.</label><button type="submit">Publish reviewed photo</button></form>` : ""}</div>`).join("") : "<p>No photographs uploaded yet. Choose an image below and select Upload for private review. After uploading, review and publish it here.</p>"}
    ${item.status === "available" && photos.length < 3 ? `<form id="photo-upload" class="stack" novalidate><div data-errors></div><div class="field"><label for="photo-file">Choose item photo</label><input id="photo-file" name="file" type="file" required accept="image/jpeg,image/png,image/webp" aria-describedby="upload-help"><p id="upload-help">JPEG, PNG or WebP, up to 4 MiB. The service removes metadata and creates a new image. Uploads stay private until reviewed.</p></div><button type="submit">Upload for private review</button></form>` : "<p>Photo uploads are available for available items with fewer than three photos.</p>"}</section>`;
}

export function bindPhotoPanel(
  root: HTMLElement,
  ctx: ViewContext,
  itemId: string,
): void {
  const api = ctx.api.photos;
  if (!api) return;
  const upload = root.querySelector<HTMLFormElement>("#photo-upload");
  upload?.addEventListener("submit", (event) => {
    event.preventDefault();
    const file = (upload.elements.namedItem("file") as HTMLInputElement)
      .files?.[0];
    if (!file || !file.size || file.size > 4 * 1024 * 1024) {
      formError(upload, "Choose a photo of 4 MiB or smaller.", {
        file: "Choose a nonempty JPEG, PNG or WebP photo of 4 MiB or smaller.",
      });
      return;
    }
    void submitting(upload, async () => {
      const result = await api.upload(ctx.orgSlug, itemId, file);
      if (!root.isConnected) return;
      if (result.ok) ctx.refresh();
      else formError(upload, result.error.message, result.error.fieldErrors);
    });
  });
  for (const form of root.querySelectorAll<HTMLFormElement>(
    "[data-publish-photo]",
  )) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      void submitting(form, async () => {
        const result = await api.publish(
          ctx.orgSlug,
          itemId,
          form.dataset.publishPhoto!,
        );
        if (!root.isConnected) return;
        if (result.ok) ctx.refresh();
        else formError(form, result.error.message, result.error.fieldErrors);
      });
    });
  }
}
