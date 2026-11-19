import { MAX_PHOTO_BYTES, preparePhoto } from "./compress-photo.ts";
import type { ItemSuggestion, PhotoApi } from "./contracts.ts";

export const intakePhotoHtml = `<section class="card stack" aria-labelledby="intake-photo-heading">
  <h2 id="intake-photo-heading">Item photo <span class="muted">(optional)</span></h2>
  <div class="field"><label for="intake-photo-file">Choose or take an item photo</label>
  <input id="intake-photo-file" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="intake-photo-help intake-photo-status">
  <p id="intake-photo-help" class="muted">Use a JPEG, PNG or WebP up to 32 MiB and 40 megapixels. Large photos are resized or compressed before upload.</p></div>
  <div class="field intake-camera"><label for="intake-photo-camera">Take an item photo</label>
  <input id="intake-photo-camera" type="file" accept="image/*" capture="environment" aria-describedby="intake-photo-help intake-photo-status"></div>
  <div class="item-image" id="intake-photo-preview" hidden><img alt="Selected found item" width="400" height="300"></div>
  <p id="intake-ai-help">LostLink automatically analyzes the photo to suggest public listing details. Keep people, personal information and private ownership clues out of the photo.</p>
  <div class="actions"><button type="button" id="intake-identify" class="secondary" aria-describedby="intake-ai-help" disabled>Suggest item details</button>
  <button type="button" id="intake-photo-remove" class="secondary" hidden>Remove photo</button></div>
  <p id="intake-photo-status" role="status"></p>
</section>`;

const suggestionFields = [
  "title",
  "publicDescription",
  "category",
  "color",
] as const;

export function bindIntakePhoto(
  form: HTMLFormElement,
  api: PhotoApi,
  orgSlug: string,
  invalidatePreview: () => void,
) {
  const input = form.querySelector<HTMLInputElement>("#intake-photo-file")!;
  const camera = form.querySelector<HTMLInputElement>("#intake-photo-camera")!;
  const preview = form.querySelector<HTMLElement>("#intake-photo-preview")!;
  const image = preview.querySelector("img")!;
  const status = form.querySelector<HTMLElement>("#intake-photo-status")!;
  const identify = form.querySelector<HTMLButtonElement>("#intake-identify")!;
  const remove = form.querySelector<HTMLButtonElement>("#intake-photo-remove")!;
  const fields = suggestionFields.map(
    (name) =>
      form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement,
  );
  const applied = new Map<
    (typeof fields)[number],
    { suggestion: string; previous: string }
  >();
  const edited = new Set<(typeof fields)[number]>();
  for (const field of fields) {
    const rememberEdit = () => edited.add(field);
    field.addEventListener("input", rememberEdit);
    field.addEventListener("change", rememberEdit);
  }
  let file: File | null = null;
  let photoUrl = "";
  let preparationVersion = 0;
  let preparing = false;
  let identification: AbortController | null = null;

  function releasePhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = "";
    file = null;
    preview.hidden = true;
    image.removeAttribute("src");
  }

  function cancelSuggestion() {
    if (!identification) return;
    identification.abort();
    identification = null;
    identify.disabled = !file;
    status.textContent =
      "Photo attached. You can enter the item details yourself.";
  }

  function resetPhoto() {
    preparationVersion++;
    preparing = false;
    cancelSuggestion();
    releasePhoto();
    for (const [field, { suggestion, previous }] of applied) {
      if (!edited.has(field) && field.value === suggestion)
        field.value = previous;
    }
    applied.clear();
    remove.hidden = true;
    identify.disabled = true;
    status.textContent = "";
    invalidatePreview();
  }

  async function selectPhoto(event: Event) {
    const source = event.currentTarget as HTMLInputElement;
    const selected = source.files?.[0];
    resetPhoto();
    const other = source === input ? camera : input;
    other.value = "";
    if (!selected) return;
    const version = preparationVersion;
    const active = () => version === preparationVersion && form.isConnected;
    preparing = true;
    remove.hidden = false;
    status.textContent =
      selected.size > MAX_PHOTO_BYTES
        ? "Compressing your photo…"
        : "Preparing your photo…";
    try {
      const prepared = await preparePhoto(selected, {
        validateSmallPhoto: true,
      });
      if (!active()) return;
      photoUrl = URL.createObjectURL(prepared);
      image.src = photoUrl;
      await image.decode();
      if (!active()) return;
      file = prepared;
      preview.hidden = false;
      void suggestDetails();
    } catch (error) {
      if (!active()) return;
      const message =
        photoUrl || !(error instanceof Error)
          ? "Choose a valid JPEG, PNG or WebP photo."
          : error.message;
      resetPhoto();
      source.value = "";
      status.textContent = message + " You can also continue without a photo.";
    } finally {
      if (active()) preparing = false;
    }
  }

  input.addEventListener("change", selectPhoto);
  camera.addEventListener("change", selectPhoto);

  remove.addEventListener("click", () => {
    resetPhoto();
    input.value = "";
    camera.value = "";
    status.textContent = "Photo removed.";
    input.focus();
  });

  async function suggestDetails() {
    if (!file || identification || form.dataset.busy) return;
    invalidatePreview();
    const request = new AbortController();
    identification = request;
    identify.disabled = true;
    status.textContent = "Looking for item details…";
    const before = fields.map((field) => field.value);
    const active = () => request === identification && form.isConnected;
    try {
      const result = await api.identify(orgSlug, file, request.signal);
      if (!active()) return;
      if (!result.ok) {
        status.textContent =
          result.error.message + " You can enter the item details yourself.";
        return;
      }
      suggestionFields.forEach((name: keyof ItemSuggestion, index) => {
        const field = fields[index];
        if (edited.has(field) || field.value !== before[index]) return;
        const suggestion = result.data[name];
        const last = applied.get(field);
        applied.set(field, {
          suggestion,
          previous:
            last?.suggestion === field.value ? last.previous : field.value,
        });
        field.value = suggestion;
      });
      status.textContent =
        "Suggestions are ready. Review and edit the item details before saving.";
      invalidatePreview();
    } catch {
      if (active())
        status.textContent =
          "Suggestions are unavailable. You can enter the item details yourself.";
    } finally {
      if (active()) {
        identification = null;
        identify.disabled = false;
      }
    }
  }

  identify.addEventListener("click", () => void suggestDetails());

  const observer = new MutationObserver(() => {
    if (form.isConnected) return;
    preparationVersion++;
    cancelSuggestion();
    releasePhoto();
    observer.disconnect();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return {
    value: () => file && { file, url: photoUrl },
    ready() {
      if (!preparing) return true;
      input.focus();
      return false;
    },
    cancelSuggestion,
  };
}
