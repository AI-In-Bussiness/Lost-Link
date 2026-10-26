import type { Category, SearchInput } from "./contracts.ts";
import type { View, ViewContext } from "./types.ts";
import {
  categories,
  date,
  e,
  itemCard,
  itemImage,
  label,
  pagination,
  schoolPath,
  unavailable,
} from "./shared.ts";

const colors = [
  "black",
  "blue",
  "green",
  "grey",
  "navy",
  "purple",
  "red",
  "white",
  "yellow",
];
const option = (value: string, selected: string, text = label(value)): string =>
  `<option value="${e(value)}"${value === selected ? " selected" : ""}>${e(text)}</option>`;
// Date inputs discard malformed URL values. Keep those visible as text for correction.
function dateControl(value: string): "date" | "text" {
  if (!value) return "date";
  const parsed = Date.parse(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
    ? "date"
    : "text";
}

function homeArt(): string {
  return `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 440 390" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="190" r="157" fill="#dfebe4"/><path d="M80 316h280" stroke="#b6c9be" stroke-width="2"/><rect x="126" y="143" width="192" height="170" rx="27" fill="#e6b977" stroke="#173e3c" stroke-width="5"/><path d="M178 143v-25a44 44 0 0 1 88 0v25M126 202h192" stroke="#173e3c" stroke-width="6"/><path d="M187 170v105M257 170v105" stroke="#c69151" stroke-width="6"/><rect x="284" y="223" width="65" height="87" rx="12" fill="#7daca0" stroke="#173e3c" stroke-width="4"/><path d="M298 223v-16h37v16" stroke="#173e3c" stroke-width="4"/><path d="m319 248 0 35" stroke="#d6e8df" stroke-width="5" stroke-linecap="round"/><rect x="91" y="226" width="70" height="47" rx="8" transform="rotate(-12 91 226)" fill="#fbfaf5" stroke="#173e3c" stroke-width="3"/><path d="m109 246 11 9 19-23" stroke="#3c796c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="324" cy="105" r="33" fill="#fbfaf5"/><path d="m310 106 10 10 18-22" stroke="#3c796c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
}

async function home(ctx: ViewContext): Promise<View> {
  const result = await ctx.api.listOrganizations();
  if (!result.ok) return unavailable(result, ctx.refresh);
  const organizations = result.data;
  const first = organizations[0];
  return {
    title: "Find what you lost",
    html: `<section class="hero"><div class="hero-copy"><p class="eyebrow">A little less lost. A little closer to home.</p><h1>Find what you lost.<br>Get it back safely.</h1><p class="hero-description">Search your school's found items, send a private claim, and collect your belongings after staff verification.</p>${first ? `<form id="home-search" class="hero-search stack" method="get" action="${schoolPath(first.slug)}/search"><div class="field"><label for="home-school">Your school</label><select id="home-school" name="school" required>${organizations.map((org) => option(org.slug, first.slug, org.name)).join("")}</select></div><div class="field"><label for="home-query">What are you looking for?</label><input id="home-query" name="q" type="search" maxlength="300" placeholder="Try “black sports bag”" autocomplete="off"></div><button class="button" type="submit">Find my item <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><p class="muted">Browsing is open to everyone. Sign in when you're ready to claim.</p></form>` : '<div class="notice"><p>No schools are currently listing items. Contact your school office for help.</p></div>'}</div>${homeArt()}</section><section class="stack" aria-labelledby="how-it-works"><div class="page-heading"><p class="eyebrow">From found to returned</p><h2 id="how-it-works">A simple path back to your belongings.</h2><p class="muted">A possible match starts the conversation. School staff verify ownership before collection.</p></div><div class="steps">${[
      [
        "01",
        "Describe",
        "Choose your school and tell us what you lost. A type, color, or detail is a good start.",
      ],
      [
        "02",
        "Find a possible match",
        "Browse found items and use filters to narrow your search.",
      ],
      [
        "03",
        "Send a private claim",
        "Share a detail only the owner would know. Your evidence stays with you and authorized staff.",
      ],
      [
        "04",
        "Collect safely",
        "Check My claims for the staff decision and collection instructions.",
      ],
    ]
      .map(
        ([number, title, text]) =>
          `<article class="step"><span class="step-number" aria-hidden="true">${number}</span><h3>${title}</h3><p class="muted">${text}</p></article>`,
      )
      .join(
        "",
      )}</div></section><section class="card two-column"><div><p class="eyebrow">For the people keeping things safe</p><h2>Work at the school office?</h2><p class="muted">List found items, review ownership details, and record each return.</p></div><div class="actions"><a class="button secondary" href="/sign-in">Staff sign in <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></section>`,
    bind: (root) =>
      root
        .querySelector<HTMLFormElement>("#home-search")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const data = new FormData(form);
          const slug = String(data.get("school") ?? "");
          if (!organizations.some((org) => org.slug === slug)) return;
          const query = String(data.get("q") ?? "");
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          ctx.navigate(
            `${schoolPath(slug)}/search${params.size ? "?" + params : ""}`,
          );
        }),
  };
}

async function search(ctx: ViewContext): Promise<View> {
  const params = ctx.url.searchParams;
  const values = {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    color: params.get("color") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
  const input: SearchInput = {
    orgSlug: ctx.orgSlug,
    query: values.q,
    page: params.has("page") ? Number(params.get("page")) : 1,
    pageSize: 6,
    ...(values.category ? { category: values.category as Category } : {}),
    ...(values.color ? { color: values.color } : {}),
    ...(values.from ? { from: values.from } : {}),
    ...(values.to ? { to: values.to } : {}),
  };
  const result = await ctx.api.searchItems(input);
  const base = schoolPath(ctx.orgSlug) + "/search";
  const fields: Record<string, string> = result.ok
    ? {}
    : (result.error.fieldErrors ?? {});
  const invalid = (name: string): string =>
    fields[name]
      ? ` aria-invalid="true" aria-describedby="${e(name)}-error"`
      : "";
  const fieldError = (name: string): string =>
    fields[name]
      ? `<p class="field-error" id="${e(name)}-error">${e(fields[name])}</p>`
      : "";
  const unknownCategory =
    values.category && !categories.includes(values.category as Category);
  const unknownColor = values.color && !colors.includes(values.color);
  const hasFilters = Object.values(values).some(Boolean);
  let content: string;
  if (!result.ok) {
    const inaccessible = ["NOT_FOUND", "FORBIDDEN"].includes(result.error.code);
    content = `<div class="empty-state"><h2>${inaccessible ? "This school’s listings are unavailable" : result.error.code === "VALIDATION_ERROR" ? "Check your search" : "We couldn’t load the items"}</h2><p>${e(inaccessible ? "Contact your school office for help finding an item." : result.error.message)}</p><div class="actions">${!inaccessible && result.error.code !== "VALIDATION_ERROR" ? '<button id="search-retry" type="button">Try again</button>' : ""}<a class="button secondary" href="${base}">Reset search</a><a href="/">Choose another school</a></div></div>`;
  } else {
    const data = result.data;
    const firstPage = new URL(ctx.url);
    firstPage.searchParams.delete("page");
    content = `<div class="results-heading"><div><h2>${data.limited ? "Top " : ""}${data.total} ${data.total === 1 ? "item" : "items"} ${hasFilters ? "found" : "available"}</h2><p class="muted">${values.q ? `Possible keyword matches for “${e(values.q)}”${data.limited ? " · Showing at most 50 ranked matches" : ""}` : "Browse items listed by your school."}</p></div><span class="badge">Keyword matching</span></div>${data.smartMatchingUnavailable ? '<p class="notice" role="status">Showing keyword and filter results while smart matching is unavailable.</p>' : ""}${data.items.length ? `<div class="item-grid">${data.items.map((item) => itemCard(item, ctx.orgSlug)).join("")}</div>${pagination(data.page, data.totalPages, ctx.url)}` : `<div class="empty-state"><span class="empty-icon" aria-hidden="true">⌕</span><h2>${data.total > 0 ? "There are no items on this page" : hasFilters ? "No matching items found." : "No items are listed here yet."}</h2><p>${data.total > 0 ? "Return to the first page to see the available results." : hasFilters ? "Try fewer details, a different word, or clear your filters to browse." : "Your item may still be waiting to be handed in. Check with your school office."}</p><div class="actions">${data.total > 0 ? `<a class="button" href="${e(firstPage.pathname + firstPage.search)}">First page</a>` : `<a class="button secondary" href="${base}">Browse all items</a>`}</div>${data.total === 0 && hasFilters ? '<p class="muted">Still looking? Contact your school office. An item may have been found without being listed yet.</p>' : ""}</div>`}`;
  }
  return {
    title: `Found items · ${ctx.orgName}`,
    html: `<section class="page-heading"><p class="eyebrow">${e(ctx.orgName)}</p><h1>Let's find your item.</h1><p class="muted">Describe what you lost, or browse everything that's been handed in.</p></section><div class="search-layout"><form id="item-search" class="filter-panel card stack" method="get" action="${base}"><h2>Your search</h2>${
      !result.ok && result.error.code === "VALIDATION_ERROR"
        ? `<div id="search-errors" class="error-summary" tabindex="-1" role="alert"><strong>${e(result.error.message)}</strong>${
            Object.entries(fields).length
              ? `<ul>${Object.entries(fields)
                  .map(
                    ([name, message]) =>
                      `<li><a href="#${name === "query" ? "q" : e(name)}">${e(message)}</a></li>`,
                  )
                  .join("")}</ul>`
              : ""
          }</div>`
        : ""
    }<div class="field"><label for="q">Describe your item</label><input type="search" id="q" name="q" maxlength="300" value="${e(values.q)}" placeholder="Type, color, or a detail"${invalid("query")}>${fieldError("query")}</div><div class="field"><label for="category">Category</label><select id="category" name="category"${invalid("category")}>${option("", values.category, "All categories")}${unknownCategory ? option(values.category, values.category) : ""}${categories.filter(value => !ctx.api.live || value !== "accessory").map((value) => option(value, values.category)).join("")}</select>${fieldError("category")}</div><div class="field"><label for="color">Color</label><select id="color" name="color"${invalid("color")}>${option("", values.color, "All colors")}${unknownColor ? option(values.color, values.color) : ""}${colors.map((value) => option(value, values.color)).join("")}</select>${fieldError("color")}</div>${ctx.api.live ? "" : `<div class="field"><label for="from">Found on or after</label><input id="from" name="from" type="${dateControl(values.from)}" value="${e(values.from)}"${invalid("from")}>${fieldError("from")}</div><div class="field"><label for="to">Found on or before</label><input id="to" name="to" type="${dateControl(values.to)}" value="${e(values.to)}"${invalid("to")}>${fieldError("to")}</div>`}<button class="button" type="submit">Search items</button><a class="text-link" href="${base}">Clear search and filters</a><p class="muted">Results use public item details. A match does not establish ownership.</p></form><section class="stack" aria-label="Search results" aria-live="polite">${content}</section></div>`,
    bind: (root) => {
      root
        .querySelector("#search-retry")
        ?.addEventListener("click", ctx.refresh);
      root
        .querySelector<HTMLFormElement>("#item-search")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget as HTMLFormElement);
          const next = new URLSearchParams();
          for (const name of ["q", "category", "color", "from", "to"]) {
            const value = String(data.get(name) ?? "");
            if (value) next.set(name, value);
          }
          ctx.navigate(base + (next.size ? "?" + next : ""));
        });
      root.querySelector<HTMLElement>("#search-errors")?.focus();
    },
  };
}

async function detail(ctx: ViewContext, encodedId: string): Promise<View> {
  let id: string;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return {
      title: "Item unavailable",
      html: '<section class="empty-state"><h1>This item is unavailable</h1><a class="button secondary" href="/">Back home</a></section>',
    };
  }
  const result = await ctx.api.getPublicItem(ctx.orgSlug, id);
  if (!result.ok) return unavailable(result, ctx.refresh);
  const item = result.data;
  const back = schoolPath(ctx.orgSlug) + "/search";
  const claim = `${schoolPath(ctx.orgSlug)}/items/${encodeURIComponent(item.id)}/claim`;
  const claimLink = ctx.session
    ? claim
    : "/sign-in?returnTo=" + encodeURIComponent(claim);
  return {
    title: item.title,
    html: `<a class="text-link" href="${back}">&lt; Back to ${e(ctx.orgName)} items</a><section class="two-column item-detail">${itemImage(item, "detail-image")}<div class="stack"><div class="page-heading"><p class="eyebrow">${e(ctx.orgName)} · Found item</p><h1>${e(item.title)}</h1><p>${e(item.publicDescription)}</p></div><dl class="item-facts"><div><dt>Category</dt><dd>${e(label(item.category))}</dd></div><div><dt>Color</dt><dd>${e(label(item.color))}</dd></div><div><dt>Found near</dt><dd>${e(item.foundLocation)}</dd></div><div><dt>Date found</dt><dd>${date(item.foundDate)}</dd></div></dl><div class="card stack"><h2>Does this look familiar?</h2><p>Send a private ownership detail for school staff to review. A possible match doesn't guarantee the item is yours.</p><a class="button" href="${claimLink}">This might be mine <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>${!ctx.session ? '<p class="muted">You’ll sign in before sending your claim.</p>' : ""}<p class="muted">Staff verify ownership before arranging collection.</p></div></div></section>`,
  };
}

export async function publicView(ctx: ViewContext): Promise<View> {
  if (ctx.url.pathname === "/") return home(ctx);
  const item = /^\/o\/[^/]+\/items\/([^/]+)\/?$/.exec(ctx.url.pathname);
  if (item) return detail(ctx, item[1]);
  return search(ctx);
}
