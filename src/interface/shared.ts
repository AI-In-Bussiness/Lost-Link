import type { PublicItem, Result } from "./contracts.ts";
import type { View } from "./types.ts";

export const categories = [
  "bag",
  "clothing",
  "electronics",
  "bottle",
  "keys",
  "accessory",
  "other",
] as const;
export const e = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const label = (value: string): string =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export const date = (value: string): string =>
  !value ? "Not provided" : new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
export const schoolPath = (slug: string): string =>
  "/o/" + encodeURIComponent(slug);
export const badge = (status: string): string =>
  `<span class="badge ${e(status)}">${e(label(status))}</span>`;
export function safeReturnPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x1f]/.test(value)
  )
    return "/my/claims";
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && url.pathname !== "/sign-in"
      ? url.pathname + url.search
      : "/my/claims";
  } catch {
    return "/my/claims";
  }
}
export function itemImage(item: PublicItem, className = ""): string {
  // Only local or HTTPS references may become image sources. Text is always escaped.
  const url = item.photo.url;
  const safe =
    (url.startsWith("/") &&
      !url.startsWith("//") &&
      !/[\\\x00-\x1f]/.test(url)) ||
    /^https:\/\//i.test(url);
  return `<div class="item-image ${e(className)}"><img src="${e(safe ? url : "/mock-assets/item-placeholder.svg")}" alt="${e(item.photo.alt)}" loading="lazy">${item.photo.isPlaceholder ? '<span class="photo-label">No photograph · illustration</span>' : ""}</div>`;
}
export function itemCard(
  item: PublicItem & { matchReasons?: string[] },
  orgSlug: string,
): string {
  return `<article class="item-card">${itemImage(item)}<div class="item-card-body"><div class="eyebrow">${e(label(item.category))} <span aria-hidden="true">/</span> ${e(label(item.color))}</div><h3><a href="${schoolPath(orgSlug)}/items/${encodeURIComponent(item.id)}">${e(item.title)}</a></h3><p class="muted">${e(item.foundLocation)}<br>Found ${date(item.foundDate)}</p>${item.matchReasons?.length ? `<p class="match-reason">${item.matchReasons.map(e).join(" · ")}</p>` : ""}<span class="text-link" aria-hidden="true">View item <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></article>`;
}
export function unavailable(
  result: Extract<Result<unknown>, { ok: false }>,
  retry?: () => void,
): View {
  const error = result.error;
  const auth = error.code === "UNAUTHENTICATED";
  const denied = ["NOT_FOUND", "FORBIDDEN"].includes(error.code);
  return {
    title: auth
      ? "Sign in to continue"
      : denied
        ? "This page is unavailable"
        : "Something went wrong",
    html: `<section class="empty-state"><span class="empty-icon" aria-hidden="true">${auth ? '<svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : "○"}</span><h1>${auth ? "Sign in to continue" : denied ? "This page is unavailable" : "We couldn’t load this page"}</h1><p>${e(denied ? "It may have moved, or your account may not have access." : error.message)}</p><div class="actions">${auth ? `<a class="button" href="/sign-in?returnTo=${encodeURIComponent(location.pathname + location.search)}">Sign in</a>` : !denied ? '<button id="retry" type="button">Try again</button>' : ""}<a class="button secondary" href="/">Back home</a></div></section>`,
    bind: (root) =>
      root.querySelector("#retry")?.addEventListener("click", () => retry?.()),
  };
}
export function formError(
  form: HTMLFormElement,
  message: string,
  fields: Record<string, string> = {},
): void {
  form.querySelectorAll("[aria-invalid]").forEach((el) => {
    el.removeAttribute("aria-invalid");
    const ids = (el.getAttribute("aria-describedby") || "")
      .split(" ")
      .filter((id) => id && !id.endsWith("-error"));
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  });
  form.querySelectorAll(".field-error").forEach((el) => el.remove());
  let box = form.querySelector<HTMLElement>("[data-errors]");
  if (!box) {
    box = document.createElement("div");
    box.dataset.errors = "";
    form.prepend(box);
  }
  box.className = "error-summary";
  box.tabIndex = -1;
  box.setAttribute("role", "alert");
  box.innerHTML = `<strong>${e(message)}</strong>${
    Object.keys(fields).length
      ? "<ul>" +
        Object.entries(fields)
          .map(
            ([name, text]) => `<li><a href="#${e(name)}">${e(text)}</a></li>`,
          )
          .join("") +
        "</ul>"
      : ""
  }`;
  for (const [name, text] of Object.entries(fields)) {
    const input = form.elements.namedItem(name) as HTMLElement | null;
    if (!input || !("setAttribute" in input)) continue;
    input.setAttribute("aria-invalid", "true");
    const id = name.replaceAll(".", "-") + "-error";
    const help = document.createElement("p");
    help.className = "field-error";
    help.id = id;
    help.textContent = text;
    input.setAttribute(
      "aria-describedby",
      [
        ...new Set(
          [
            ...(input.getAttribute("aria-describedby") || "").split(" "),
            id,
          ].filter(Boolean),
        ),
      ].join(" "),
    );
    input.after(help);
  }
  box.focus();
}
export async function submitting(
  form: HTMLFormElement,
  action: () => Promise<void>,
): Promise<void> {
  if (form.dataset.busy) return;
  form.dataset.busy = "true";
  form.setAttribute("aria-busy", "true");
  const buttons = [...form.querySelectorAll<HTMLButtonElement>("button")];
  buttons.forEach((b) => (b.disabled = true));
  try {
    await action();
  } catch {
    formError(form, "Unable to save. Your entries are still here. Try again.");
  } finally {
    delete form.dataset.busy;
    form.removeAttribute("aria-busy");
    buttons.forEach((b) => (b.disabled = false));
  }
}
export function pagination(page: number, totalPages: number, url: URL): string {
  if (totalPages <= 1) return "";
  const href = (n: number) => {
    const next = new URL(url);
    next.searchParams.set("page", String(n));
    return e(next.pathname + next.search);
  };
  return `<nav class="pagination" aria-label="Results pages">${page > 1 ? `<a class="button secondary" href="${href(page - 1)}">Previous</a>` : ""}<span>Page ${page} of ${totalPages}</span>${page < totalPages ? `<a class="button secondary" href="${href(page + 1)}">Next</a>` : ""}</nav>`;
}
