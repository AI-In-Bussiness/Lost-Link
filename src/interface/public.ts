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
    <div class="art-heading"><span>a few familiar things…</span><span aria-hidden="true">sketch no. 01</span></div>
    <svg viewBox="0 0 480 370" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M28 308H452M28 322H452" stroke="#beb5a5"/>
      <ellipse cx="246" cy="307" rx="174" ry="13" fill="#d8cfbd"/>
      <g transform="rotate(-7 220 200)">
        <path d="M160 126v-19a45 45 0 0 1 90 0v19" stroke="#293b43" stroke-width="12"/>
        <path d="M150 128c-22 0-35 22-35 48v116c0 13 10 20 23 20h143c13 0 23-7 23-20V176c0-26-13-48-35-48Z" fill="#e8d9b8" stroke="#293b43" stroke-width="3"/>
        <path d="M135 173c26-12 121-12 150 0M151 132l-7 166M267 132l7 166" stroke="#71654e" stroke-width="3"/>
        <rect x="146" y="217" width="125" height="72" rx="13" fill="#eee4cd" stroke="#293b43" stroke-width="3"/>
        <path d="M155 232h107m-13 0v14" stroke="#293b43" stroke-width="3"/>
        <rect x="186" y="174" width="43" height="22" rx="2" fill="#f8edcf"/>
        <path d="m217 137 47 33" stroke="#293b43" stroke-width="2"/>
        <path d="m260 155 43 15-18 53-43-15Z" fill="#fffaf0" stroke="#293b43" stroke-width="2"/>
        <circle cx="267" cy="171" r="3" fill="#303e3a"/>
        <path d="m258 186 27 9m-30 1 19 6" stroke="#a49a87" stroke-width="2"/>
      </g>
      <g transform="rotate(8 354 250)"><rect x="326" y="176" width="59" height="130" rx="19" fill="#d8dfd0" stroke="#293b43" stroke-width="3"/><rect x="339" y="158" width="33" height="23" rx="5" fill="#303e3a"/><path d="M337 205v66" stroke="#c4d0be" stroke-width="5" stroke-linecap="round"/></g>
      <g transform="rotate(-12 87 287)"><path d="M40 285h62l25 19H40Z" fill="#e5c66e" stroke="#293b43" stroke-width="3"/><path d="M45 304h84v9H45Z" fill="#fffaf0" stroke="#293b43" stroke-width="3"/><path d="m79 282 7 10m4-10 7 10" stroke="#293b43" stroke-width="3"/></g>
      <path d="m371 87 6-13m4 22 14-4M96 149l-15-5" stroke="#a35b3d" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <figcaption><span class="art-note">Left behind.<br><em>Not forgotten.</em></span><span class="art-caption">Your next stop:<br>the school office.</span></figcaption>
  </figure>`;
}

async function home(ctx: ViewContext): Promise<View> {
  const result = await ctx.api.listOrganizations();
  // The introduction stays useful even when the school directory is unavailable.
  const organizations = result.ok
    ? result.data.filter((org) => org.publicListingEnabled)
    : [];
  const first =
    organizations.find((org) => org.slug === ctx.orgSlug) ?? organizations[0];
  return {
    title: "Find what you lost",
    html: `<section class="hero"><div class="hero-copy"><p class="eyebrow">Meet LostLink</p><h1>School lost<br><em>&amp; found</em></h1><p class="hero-description">Your school’s lost-and-found, in one place. Browse found belongings, send a private claim, and follow staff updates on the way to getting your item back.</p><nav class="landing-links" aria-label="Explore LostLink"><a href="#features">Explore features</a><a href="#how-it-works">How it works</a></nav>${first ? `<form id="home-search" class="hero-search stack" method="get" action="${schoolPath(first.slug)}/search"><div class="field"><label for="home-school">Your school</label><select id="home-school" name="school" required>${organizations.map((org) => option(org.slug, first.slug, org.name)).join("")}</select></div><div class="field"><label for="home-query">What are you looking for?</label><input id="home-query" name="q" type="search" maxlength="300" placeholder="Try “black sports bag”" autocomplete="off" aria-describedby="home-search-hint"><p class="muted" id="home-search-hint">Use public details like type and color. Save secret identifying details for your private claim.</p></div><button class="button" type="submit">Find my item <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><p class="muted">Browsing is open to everyone. Sign in when you're ready to claim.</p></form>` : result.ok ? '<div class="notice"><p>No schools are currently listing items. Contact your school office for help.</p></div>' : '<div class="notice"><p>We couldn’t load the school list. Try again, or contact your school office for help.</p><button id="home-retry" class="secondary" type="button">Try again</button></div>'}<p class="hero-assurance"><strong>Private proof. People decide.</strong><span>Ownership details go to authorized staff. A search match is only a starting point.</span></p></div>${homeArt()}</section>
    <section class="landing-features" aria-labelledby="features">
      <div class="landing-intro">
        <p class="eyebrow">More than a lost-and-found bin</p>
        <h2 id="features" tabindex="-1">A clearer way back to your belongings.</h2>
        <p>From the first search to the school office, LostLink keeps the next step in sight.</p>
        <p class="muted">Looking for something? You can browse without an account. Sign in or create an account when you’re ready to send a claim.</p>
        <a class="text-link" href="${ctx.session ? "/my/claims" : ctx.api.live ? "/sign-up" : "/sign-in"}">${ctx.session ? "View my claims" : "Create an account"}</a>
      </div>
      <dl class="feature-notes">
        <div><dt>Search your school</dt><dd>Describe what you lost in your own words. Smart matching suggests possible matches from your school’s listed items, with keyword search available when smart matching isn’t.</dd></div>
        <div><dt>Look a little closer</dt><dd>Check published photos and public descriptions. Narrow the list by category, color, or the date an item was found.</dd></div>
        <div><dt>Keep your proof private</dt><dd>Send an identifying detail only the owner would know. Your claim is visible to you and authorized school staff, not other visitors.</dd></div>
        <div><dt>Follow your claim</dt><dd>See staff decisions and collection instructions in My claims. Approval means ready for collection; staff record the return after the physical handover.</dd></div>
      </dl>
    </section>
    <section class="how-section stack" aria-labelledby="how-it-works"><div class="page-heading"><p class="eyebrow">From found to returned</p><h2 id="how-it-works" tabindex="-1">Back in your hands, in four steps.</h2><p class="muted">A possible match starts the conversation. School staff verify ownership before collection.</p></div><div class="steps">${[
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
      )}</div></section><section class="staff-callout two-column" aria-labelledby="staff-intro"><div><p class="eyebrow">At the school office</p><h2 id="staff-intro">Work at the school office?</h2><p class="muted">List found items, review and publish photos, manage private claims, and record each return in your school’s staff workspace.</p><p class="muted">Staff access is assigned by your school. Creating an account does not grant staff permissions.</p></div><div class="actions"><a class="button secondary" href="/sign-in">Staff sign in <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></section>`,
    bind: (root) => {
      root.querySelector("#home-retry")?.addEventListener("click", ctx.refresh);
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
        });
    },
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
    content = `<div class="results-heading"><div><h2>${data.limited ? "Top " : ""}${data.total} ${data.total === 1 ? "item" : "items"} ${hasFilters ? "found" : "available"}</h2><p class="muted">${values.q ? `Possible ${data.mode === "hybrid" ? "AI and keyword" : "keyword"} matches for “${e(values.q)}”${data.limited ? " · Showing at most 50 ranked matches" : ""}` : "Browse items listed by your school."}</p></div><span class="badge">${data.mode === "hybrid" ? "AI + keyword matching" : "Keyword matching"}</span></div>${values.q ? `<p class="muted">${data.mode === "hybrid" ? "AI compares the meaning of public descriptions alongside keyword matches." : "These results use keywords and public item details."} Reasons explain search signals, not ownership. School staff review private claims.</p>` : ""}${data.smartMatchingUnavailable ? '<p class="notice" role="status">Showing keyword and filter results while smart matching is unavailable.</p>' : ""}${data.items.length ? `<div class="item-grid">${data.items.map((item) => itemCard(item, ctx.orgSlug, ctx.api.live === true && ctx.session?.staffOrgSlugs.includes(ctx.orgSlug) === true)).join("")}</div>${pagination(data.page, data.totalPages, ctx.url)}` : `<div class="empty-state"><span class="empty-icon" aria-hidden="true">⌕</span><h2>${data.total > 0 ? "There are no items on this page" : hasFilters ? "No matching items found." : "No items are listed here yet."}</h2><p>${data.total > 0 ? "Return to the first page to see the available results." : hasFilters ? "Try fewer details, a different word, or clear your filters to browse." : "Your item may still be waiting to be handed in. Check with your school office."}</p><div class="actions">${data.total > 0 ? `<a class="button" href="${e(firstPage.pathname + firstPage.search)}">First page</a>` : `<a class="button secondary" href="${base}">Browse all items</a>`}</div>${data.total === 0 && hasFilters ? '<p class="muted">Still looking? Contact your school office. An item may have been found without being listed yet.</p>' : ""}</div>`}`;
  }
  return {
    title: `Found items · ${ctx.orgName}`,
    html: `<section class="page-heading"><p class="eyebrow">${e(ctx.orgName)}</p><h1>Let's find your item.</h1><p class="muted">Describe what you lost, or browse everything that's been handed in.</p>${ctx.contactEmail ? `<p>School office: <a href="mailto:${e(ctx.contactEmail)}">${e(ctx.contactEmail)}</a></p>` : ""}</section><div class="search-layout"><form id="item-search" class="filter-panel card stack" method="get" action="${base}"><h2>Your search</h2>${
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
    }<div class="field"><label for="q">Describe your item</label><input type="search" id="q" name="q" maxlength="300" value="${e(values.q)}" placeholder="Type, color, or a detail" aria-describedby="search-privacy${fields.query ? " query-error" : ""}"${fields.query ? ' aria-invalid="true"' : ""}>${fieldError("query")}<p class="muted" id="search-privacy">Use public details such as type and color. Keep names, contact information and secret identifying details for your private claim. AI matching compares descriptions within LostLink.</p></div><div class="field"><label for="category">Category</label><select id="category" name="category"${invalid("category")}>${option("", values.category, "All categories")}${unknownCategory ? option(values.category, values.category) : ""}${categories
      .filter((value) => !ctx.api.live || value !== "accessory")
      .map((value) => option(value, values.category))
      .join(
        "",
      )}</select>${fieldError("category")}</div><div class="field"><label for="color">Color</label><select id="color" name="color"${invalid("color")}>${option("", values.color, "All colors")}${unknownColor ? option(values.color, values.color) : ""}${colors.map((value) => option(value, values.color)).join("")}</select>${fieldError("color")}</div><div class="field"><label for="from">Found on or after</label><input id="from" name="from" type="${dateControl(values.from)}" value="${e(values.from)}"${invalid("from")}>${fieldError("from")}</div><div class="field"><label for="to">Found on or before</label><input id="to" name="to" type="${dateControl(values.to)}" value="${e(values.to)}"${invalid("to")}>${fieldError("to")}</div><button class="button" type="submit">Search items</button><a class="text-link" href="${base}">Clear search and filters</a><p class="muted">Results use public item details. A match does not establish ownership.</p></form><section class="stack" aria-label="Search results" aria-live="polite">${content}</section></div>`,
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
  const staffPhotoHelp =
    ctx.api.live &&
    item.photo.isPlaceholder &&
    ctx.session?.staffOrgSlugs.includes(ctx.orgSlug)
      ? `<aside class="notice"><p>No published photograph is visible on this listing. Open photo review to upload an image or publish a reviewed preview.</p><a class="button secondary" href="${schoolPath(ctx.orgSlug)}/staff/items/${encodeURIComponent(item.id)}">Review or add photos</a></aside>`
      : "";
  return {
    title: item.title,
    html: `<a class="text-link" href="${back}">&lt; Back to ${e(ctx.orgName)} items</a>${staffPhotoHelp}<section class="two-column item-detail">${itemImage(item, "detail-image")}<div class="stack"><div class="page-heading"><p class="eyebrow">${e(ctx.orgName)} · Found item</p><h1>${e(item.title)}</h1><p>${e(item.publicDescription)}</p></div><dl class="item-facts"><div><dt>Category</dt><dd>${e(label(item.category))}</dd></div><div><dt>Color</dt><dd>${e(label(item.color))}</dd></div><div><dt>Found near</dt><dd>${e(item.foundLocation)}</dd></div><div><dt>Date found</dt><dd>${date(item.foundDate)}</dd></div></dl><div class="card stack"><h2>Does this look familiar?</h2><p>Send a private ownership detail for school staff to review. A possible match doesn't guarantee the item is yours.</p><a class="button" href="${claimLink}">This might be mine <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>${!ctx.session ? '<p class="muted">You’ll sign in before sending your claim.</p>' : ""}<p class="muted">Staff verify ownership before arranging collection.</p></div></div></section>`,
  };
}

export async function publicView(ctx: ViewContext): Promise<View> {
  if (ctx.url.pathname === "/") return home(ctx);
  const item = /^\/o\/[^/]+\/items\/([^/]+)\/?$/.exec(ctx.url.pathname);
  if (item) return detail(ctx, item[1]);
  return search(ctx);
}
