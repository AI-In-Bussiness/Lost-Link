import type { LostLinkApi } from "../mocks/contracts.ts";
import type { Session, ViewContext } from "./types.ts";
import { e, schoolPath, unavailable } from "./shared.ts";
import { publicView } from "./public.ts";
import { claimsView } from "./claims.ts";
import { staffView } from "./staff.ts";

export interface InterfaceHost {
  getApi(): LostLinkApi;
  getSession(): Session | null;
  signOut(): void;
  demoSignIn?: ViewContext["demoSignIn"];
}
/** Mountable browser interface. The host supplies transport and session behavior. */
export function mountLostLink(root: HTMLElement, host: InterfaceHost) {
  let generation = 0;
  let destroyed = false;
  const navigate = (path: string) => {
    const next = new URL(path, location.origin);
    if (next.origin !== location.origin) return;
    history.pushState({}, "", next.pathname + next.search + next.hash);
    void render(true);
  };
  async function render(focus = false) {
    const ticket = ++generation;
    const api = host.getApi(),
      session = host.getSession();
    const url = new URL(location.href);
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    // Keep malformed route escapes inside the normal unavailable-page behavior.
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return "";
        }
      });
    const orgSlug = parts[0] === "o" ? parts[1] : "cedar-grove";
    const base = schoolPath(orgSlug);
    const staff = session?.staffOrgSlugs.includes(orgSlug);
    const nav = `<a href="${base}/search" ${parts[2] === "search" ? 'aria-current="page"' : ""}>Find an item</a><a href="/my/claims" ${parts[0] === "my" ? 'aria-current="page"' : ""}>My claims</a>${staff ? `<a href="${base}/staff" ${parts[2] === "staff" ? 'aria-current="page"' : ""}>Staff workspace</a>` : ""}`;
    // Replacing the old view immediately clears all private forms on navigation/sign-out.
    root.innerHTML = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="LostLink home"><span class="brand-mark" aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Lost<span>Link</span><span class="brand-dot" aria-hidden="true">.</span></a><nav class="main-nav" aria-label="Main navigation">${nav}</nav><div class="account">${session ? `<span class="account-name">${e(session.name)}</span><button class="plain" id="sign-out" type="button">Sign out</button>` : `<a class="button secondary" href="/sign-in">Sign in <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`}</div></div></header><div class="school-strip"><div class="container"><span aria-hidden="true">⌂</span> <span id="school-name">School lost &amp; found</span><span class="strip-divider">/</span><a href="/">Change school</a></div></div><main id="main" class="container main-content" tabindex="-1" aria-busy="true"><div class="loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Loading your page…</div></main><footer class="site-footer"><div class="container footer-inner"><a class="brand small" href="/">LostLink.</a><p>A little less lost. A little more found.</p><span>Staff verify every return.</span></div></footer>`;
    root.querySelector("#sign-out")?.addEventListener("click", () => {
      host.signOut();
      navigate("/");
    });
    const main = root.querySelector<HTMLElement>("main")!;
    try {
      let orgName = "";
      if (parts[0] === "o") {
        const orgs = await api.listOrganizations();
        if (ticket !== generation || destroyed) return;
        if (!orgs.ok) {
          const view = unavailable(orgs, () => void render());
          main.innerHTML = view.html;
          main.removeAttribute("aria-busy");
          view.bind?.(main);
          document.title = view.title + " · LostLink";
          if (focus) focusHeading(main);
          return;
        }
        const org = orgs.data.find((o) => o.slug === orgSlug);
        if (!org) {
          const view = unavailable({
            ok: false,
            error: {
              code: "NOT_FOUND",
              message: "This school is unavailable.",
              requestId: "ui",
            },
          });
          main.innerHTML = view.html;
          main.removeAttribute("aria-busy");
          document.title = view.title + " · LostLink";
          if (focus) focusHeading(main);
          return;
        }
        orgName = org.name;
      }
      root.querySelector("#school-name")!.textContent =
        orgName || "Your school, your belongings";
      const active = () => ticket === generation && !destroyed;
      const ctx: ViewContext = {
        api,
        url,
        orgSlug,
        orgName,
        session,
        navigate: (path) => {
          if (active()) navigate(path);
        },
        refresh: () => {
          if (active()) void render();
        },
        demoSignIn: host.demoSignIn
          ? (kind, path) => {
              if (active()) host.demoSignIn?.(kind, path);
            }
          : undefined,
      };
      let view;
      if (
        !["", "o", "sign-in", "my"].includes(parts[0] || "") ||
        (parts[0] === "o" && !["search", "items", "staff"].includes(parts[2]))
      )
        view = unavailable({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "This page is unavailable.",
            requestId: "ui",
          },
        });
      else if (parts[2] === "staff") view = await staffView(ctx);
      else if (
        parts[0] === "sign-in" ||
        parts[0] === "my" ||
        parts[4] === "claim"
      )
        view = await claimsView(ctx);
      else view = await publicView(ctx);
      if (ticket !== generation || destroyed) return;
      main.innerHTML = view.html;
      main.removeAttribute("aria-busy");
      view.bind?.(main);
      document.title = view.title + " · LostLink";
      // Form views may have focused a validation summary; retain that useful focus.
      if (focus) {
        window.scrollTo(0, 0);
        if (!main.querySelector(".error-summary:focus")) focusHeading(main);
      }
    } catch {
      if (ticket !== generation || destroyed) return;
      const view = unavailable(
        {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Unable to load this page. Try again.",
            requestId: "ui",
          },
        },
        () => void render(),
      );
      main.innerHTML = view.html;
      main.removeAttribute("aria-busy");
      view.bind?.(main);
      document.title = view.title + " · LostLink";
      if (focus) focusHeading(main);
    }
  }
  function focusHeading(main: HTMLElement) {
    const heading = main.querySelector<HTMLElement>("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href);
    if (
      url.origin !== location.origin ||
      (url.hash &&
        url.pathname === location.pathname &&
        url.search === location.search)
    )
      return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  };
  const onPop = () => void render(true);
  root.addEventListener("click", onClick);
  window.addEventListener("popstate", onPop);
  void render();
  return {
    navigate,
    refresh: () => void render(),
    destroy() {
      destroyed = true;
      generation++;
      root.replaceChildren();
      root.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
    },
  };
}
