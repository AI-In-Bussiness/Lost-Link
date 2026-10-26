import type { PhotoUpload, PreparedPhoto } from "./types.ts";
import { formError } from "./shared.ts";

const illustration = (): PreparedPhoto => ({
  photo: {
    url: "/mock-assets/item-placeholder.svg",
    alt: "Fictional found-item illustration, not a photograph",
    isPlaceholder: true,
  },
  upload: { mimeType: "image/jpeg", sizeBytes: 240000 },
});

export function photoInputHtml(canPrepare: boolean): string {
  return `<fieldset class="stack" aria-describedby="photo-help"><legend>Item photo</legend><p id="photo-help" class="muted">Use a fictional item image. Choose a JPEG, PNG or WebP up to 5 MB. This preview prepares the image locally; nothing is uploaded.</p><div class="field"><label for="photo">Choose or replace photo</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-status"${canPrepare ? "" : " disabled"}></div>${canPrepare ? "" : '<p class="muted">This host supports the demo illustration only.</p>'}<div class="item-image"><img id="photo-preview" src="/mock-assets/item-placeholder.svg" alt="Fictional found-item illustration, not a photograph" width="400" height="300"><p id="photo-caption" class="photo-label">Illustration · demo item</p></div><progress id="photo-progress" max="100" value="0" hidden aria-label="Preparing photo"></progress><p id="photo-status" role="status" aria-live="polite">Demo illustration selected.</p><div class="actions"><button id="photo-remove" type="button" class="secondary">Remove photo</button><button id="photo-demo" type="button" class="secondary">Use demo illustration</button></div></fieldset>`;
}

export function bindPhotoInput(form: HTMLFormElement, service?: PhotoUpload) {
  const input = form.elements.namedItem("photo") as HTMLInputElement;
  const image = form.querySelector<HTMLImageElement>("#photo-preview")!;
  const caption = form.querySelector<HTMLElement>("#photo-caption")!;
  const progress = form.querySelector<HTMLProgressElement>("#photo-progress")!;
  const status = form.querySelector<HTMLElement>("#photo-status")!;
  let current: PreparedPhoto | null = illustration();
  let preparing = false;
  let version = 0;
  let disposed = false;

  const release = () => {
    if (current && !current.photo.isPlaceholder)
      service?.release(current.photo.url);
    current = null;
  };
  const changed = () =>
    form.dispatchEvent(new Event("input", { bubbles: true }));
  function show(value: PreparedPhoto | null) {
    image.hidden = !value;
    caption.hidden = !value;
    if (value) {
      image.src = value.photo.url;
      image.alt = value.photo.alt;
      caption.textContent = value.photo.isPlaceholder
        ? "Illustration · demo item"
        : "Local photo · not uploaded";
    } else image.removeAttribute("src");
    input.required = !value;
  }
  function clearPhotoError() {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    form.querySelector("#photo-error")?.remove();
    input.setAttribute("aria-describedby", "photo-help photo-status");
  }
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file || !service) return;
    const request = ++version;
    release();
    clearPhotoError();
    preparing = true;
    show(null);
    progress.hidden = false;
    progress.value = 0;
    status.textContent = "Preparing your photo locally…";
    void service
      .upload(file, (percent) => {
        if (request !== version || disposed) return;
        progress.value = percent;
        status.textContent = `Preparing your photo locally… ${percent}%`;
      })
      .then((value) => {
        if (request !== version || disposed || !form.isConnected) {
          service.release(value.photo.url);
          return;
        }
        current = value;
        preparing = false;
        progress.hidden = true;
        show(value);
        clearPhotoError();
        status.textContent = "Photo ready. Nothing has been uploaded.";
        changed();
      })
      .catch((error) => {
        if (request !== version || disposed || !form.isConnected) return;
        preparing = false;
        progress.hidden = true;
        const message =
          error instanceof Error
            ? error.message
            : "This photo could not be prepared. Choose another image.";
        status.textContent =
          "Photo not ready. Choose another image or restore the illustration.";
        input.setCustomValidity(message);
        formError(form, "Check the photo.", { photo: message });
        changed();
      });
  });
  form.querySelector("#photo-remove")!.addEventListener("click", () => {
    version++;
    preparing = false;
    progress.hidden = true;
    release();
    clearPhotoError();
    input.value = "";
    show(null);
    status.textContent =
      "No photo selected. Choose a photo or use the demo illustration.";
    changed();
  });
  form.querySelector("#photo-demo")!.addEventListener("click", () => {
    version++;
    preparing = false;
    progress.hidden = true;
    release();
    clearPhotoError();
    input.value = "";
    current = illustration();
    show(current);
    status.textContent = "Demo illustration selected.";
    changed();
  });
  const observer = new MutationObserver(() => {
    if (!form.isConnected) {
      disposed = true;
      version++;
      release();
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  return {
    value(): PreparedPhoto | null {
      return current;
    },
    ready(): boolean {
      if (preparing) {
        formError(form, "Wait for your photo to finish preparing.", {
          photo: "Your photo is still preparing.",
        });
        return false;
      }
      if (!current) {
        formError(form, "Choose a photo before continuing.", {
          photo: "Choose a photo or use the demo illustration.",
        });
        return false;
      }
      return true;
    },
  };
}
