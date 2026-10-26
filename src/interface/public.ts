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
  return `<figure class="hero-art" aria-label="Illustration of belongings waiting at a school lost-and-found">
    <div class="art-heading"><span>THE LOST &amp; FOUND</span><span aria-hidden="true">NO. 01</span></div>
    <svg viewBox="0 0 480 370" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M28 308H452M28 322H452" stroke="#beb5a5"/>
      <ellipse cx="246" cy="307" rx="174" ry="13" fill="#d8cfbd"/>
      <g transform="rotate(-7 220 200)">
        <path d="M160 126v-19a45 45 0 0 1 90 0v19" stroke="#303e3a" stroke-width="12"/>
        <path d="M150 128c-22 0-35 22-35 48v116c0 13 10 20 23 20h143c13 0 23-7 23-20V176c0-26-13-48-35-48Z" fill="#b96543" stroke="#303e3a" stroke-width="3"/>
        <path d="M135 173c26-12 121-12 150 0M151 132l-7 166M267 132l7 166" stroke="#85452e" stroke-width="3"/>
        <rect x="146" y="217" width="125" height="72" rx="13" fill="#cb7952" stroke="#303e3a" stroke-width="3"/>
        <path d="M155 232h107m-13 0v14" stroke="#303e3a" stroke-width="3"/>
        <rect x="186" y="174" width="43" height="22" rx="2" fill="#f8edcf"/>
        <path d="m217 137 47 33" stroke="#303e3a" stroke-width="2"/>
        <path d="m260 155 43 15-18 53-43-15Z" fill="#fffaf0" stroke="#303e3a" stroke-width="2"/>
        <circle cx="267" cy="171" r="3" fill="#303e3a"/>
        <path d="m258 186 27 9m-30 1 19 6" stroke="#a49a87" stroke-width="2"/>
      </g>
      <g transform="rotate(8 354 250)"><rect x="326" y="176" width="59" height="130" rx="19" fill="#7c958a" stroke="#303e3a" stroke-width="3"/><rect x="339" y="158" width="33" height="23" rx="5" fill="#303e3a"/><path d="M337 205v66" stroke="#c4d0be" stroke-width="5" stroke-linecap="round"/></g>
      <g transform="rotate(-12 87 287)"><path d="M40 285h62l25 19H40Z" fill="#e5c66e" stroke="#303e3a" stroke-width="3"/><path d="M45 304h84v9H45Z" fill="#fffaf0" stroke="#303e3a" stroke-width="3"/><path d="m79 282 7 10m4-10 7 10" stroke="#303e3a" stroke-width="3"/></g>
      <path d="m371 87 6-13m4 22 14-4M96 149l-15-5" stroke="#a35b3d" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <figcaption><span class="art-note">Left behind.<br><em>Not forgotten.</em></span><span class="art-caption">Your next stop:<br>the school office.</span></figcaption>
  </figure>`;
}

async function home(ctx: ViewContext): Promise<View> {
  const result = await ctx.api.listOrganizations();
  if (!result.ok) return unavailable(result, ctx.refresh);
  const organizations = result.data;
  const first =
    organizations.find((org) => org.slug === ctx.orgSlug) ?? organizations[0];
  return {
    title: "Find what you lost",
    html: `<section class="hero"><div class="hero-copy"><p class="eyebrow">School lost &amp; found</p><h1>Somewhere here,<br><em>it’s still yours.</em></h1><p class="hero-description">The bag from practice. The bottle from lunch. Search what’s been handed in at your school and take the first step to getting it back.</p>${first ? `<form id="home-search" class="hero-search stack" method="get" action="${schoolPath(first.slug)}/search"><div class="field"><label for="home-school">Your school</label><select id="home-school" name="school" required>${organizations.map((org) => option(org.slug, first.slug, org.name)).join("")}</select></div><div class="field"><label for="home-query">What are you looking for?</label><input id="home-query" name="q" type="search" maxlength="300" placeholder="Try “black sports bag”" autocomplete="off"></div><button class="button" type="submit">Find my item <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><p class="muted">Browsing is open to everyone. Sign in when you're ready to claim.</p></form>` : '<div class="notice"><p>No schools are currently listing items. Contact your school office for help.</p></div>'}</div>${homeArt()}</section><section class="how-section stack" aria-labelledby="how-it-works"><div class="page-heading"><p class="eyebrow">From found to returned</p><h2 id="how-it-works">Back in your hands, in four steps.</h2><p class="muted">A possible match starts the conversation. School staff verify ownership before collection.</p></div><div class="steps">${[
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
      )}</div></section><section class="staff-callout two-column"><div><p class="eyebrow">At the school office</p><h2>Work at the school office?</h2><p class="muted">List found items, review ownership details, and record each return.</p></div><div class="actions"><a class="button secondary" href="/sign-in">Staff sign in <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></section>`,
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
    }<div class="field"><label for="q">Describe your item</label><input type="search" id="q" name="q" maxlength="300" value="${e(values.q)}" placeholder="Type, color, or a detail"${invalid("query")}>${fieldError("query")}</div><div class="field"><label for="category">Category</label><select id="category" name="category"${invalid("category")}>${option("", values.category, "All categories")}${unknownCategory ? option(values.category, values.category) : ""}${categories
      .filter((value) => !ctx.api.live || value !== "accessory")
      .map((value) => option(value, values.category))
      .join(
        "",
      )}</select>${fieldError("category")}</div><div class="field"><label for="color">Color</label><select id="color" name="color"${invalid("color")}>${option("", values.color, "All colors")}${unknownColor ? option(values.color, values.color) : ""}${colors.map((value) => option(value, values.color)).join("")}</select>${fieldError("color")}</div>${ctx.api.live ? "" : `<div class="field"><label for="from">Found on or after</label><input id="from" name="from" type="${dateControl(values.from)}" value="${e(values.from)}"${invalid("from")}>${fieldError("from")}</div><div class="field"><label for="to">Found on or before</label><input id="to" name="to" type="${dateControl(values.to)}" value="${e(values.to)}"${invalid("to")}>${fieldError("to")}</div>`}<button class="button" type="submit">Search items</button><a class="text-link" href="${base}">Clear search and filters</a><p class="muted">Results use public item details. A match does not establish ownership.</p></form><section class="stack" aria-label="Search results" aria-live="polite">${content}</section></div>`,
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
