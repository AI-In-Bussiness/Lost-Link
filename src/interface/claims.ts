import type { MyClaim, Result } from "../mocks/contracts.ts";
import type { View, ViewContext } from "./types.ts";
import {
  badge,
  date,
  e,
  formError,
  itemImage,
  label,
  pagination,
  safeReturnPath,
  schoolPath,
  submitting,
  unavailable,
} from "./shared.ts";

const signInRequired = (): Extract<Result<unknown>, { ok: false }> => ({
  ok: false,
  error: {
    code: "UNAUTHENTICATED",
    message: "Sign in to continue.",
    requestId: "interface-sign-in",
  },
});
const missing = (): Extract<Result<unknown>, { ok: false }> => ({
  ok: false,
  error: {
    code: "NOT_FOUND",
    message: "This claim is unavailable.",
    requestId: "interface-not-found",
  },
});

function signIn(ctx: ViewContext): View {
  const requested = ctx.url.searchParams.get("returnTo");
  const returnTo = safeReturnPath(requested);
  return {
    title: "Sign in",
    html: `<section class="page-heading"><p class="eyebrow">Your belongings, safely returned</p><h1>Pick up where you left off.</h1><p>Sign in to send a private claim and follow its progress.</p></section>
      <section class="card stack"><h2>Interactive preview</h2><p class="notice">These fictional demo accounts let you explore the workflow. No password or real account is used.</p>
      ${ctx.session ? `<p>Current preview account: <strong>${e(ctx.session.name)}</strong>.</p><a class="button" href="${e(returnTo)}">Continue</a>` : ""}
      <div id="sign-in-errors" class="error-summary" role="alert" tabindex="-1" hidden></div>
      ${ctx.demoSignIn ? `<div class="actions"><button type="button" id="demo-student">Continue as demo student</button><button type="button" class="secondary" id="demo-staff">Continue as demo staff</button></div><p class="muted">Student preview: Avery. Staff preview: ${e(ctx.orgName || "Cedar Grove School")} office. Demo account selection does not grant real staff access.</p>` : "<p>Account sign-in is not connected in this interface preview.</p>"}
      <a href="${schoolPath(ctx.orgSlug)}/search">Back to school search</a></section>`,
    bind: (root) => {
      const signIn = async (kind: "student" | "staff", path: string) => {
        const buttons = [
          ...root.querySelectorAll<HTMLButtonElement>(
            "#demo-student, #demo-staff",
          ),
        ];
        buttons.forEach((button) => (button.disabled = true));
        try {
          await ctx.demoSignIn?.(kind, path);
        } catch {
          if (!root.isConnected) return;
          const box = root.querySelector<HTMLElement>("#sign-in-errors")!;
          box.textContent =
            "Sign-in is unavailable. Your item is still saved in this page’s return link. Try again.";
          box.hidden = false;
          box.focus();
        } finally {
          buttons.forEach((button) => (button.disabled = false));
        }
      };
      root
        .querySelector("#demo-student")
        ?.addEventListener("click", () => void signIn("student", returnTo));
      root
        .querySelector("#demo-staff")
        ?.addEventListener(
          "click",
          () =>
            void signIn(
              "staff",
              requested ? returnTo : schoolPath(ctx.orgSlug) + "/staff",
            ),
        );
    },
  };
}

async function claimsList(ctx: ViewContext): Promise<View> {
  const result = await ctx.api.listMyClaims({
    page: Number(ctx.url.searchParams.get("page") ?? 1),
    pageSize: 10,
  });
  if (!result.ok) return unavailable(result, ctx.refresh);
  const organizations = await ctx.api.listOrganizations();
  const names = new Map(
    organizations.ok ? organizations.data.map((org) => [org.id, org.name]) : [],
  );
  const claims = result.data;
  return {
    title: "My claims",
    html: `<section class="page-heading"><p class="eyebrow">Your lost-and-found</p><h1>My claims</h1><p>Check staff decisions and collection instructions here. Updates are not sent by email in this preview.</p></section>
      ${claims.items.length ? `<div class="stack">${claims.items.map((claim) => `<article class="card"><div class="actions">${badge(claim.status)}<span class="muted">${e(names.get(claim.organizationId) ?? "Your school")}</span></div><h2><a href="/my/claims/${encodeURIComponent(claim.id)}">${e(claim.item.title)}</a></h2><p class="muted">Submitted ${date(claim.createdAt)} · Reference ${e(claim.id)}</p><a class="text-link" href="/my/claims/${encodeURIComponent(claim.id)}">View claim details <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></article>`).join("")}</div>` : `<section class="empty-state"><h2>${claims.total ? "No claims on this page" : "No claims yet"}</h2><p>${claims.total ? "Return to the first page to see your claims." : "Found something that looks like yours? Send a private claim from its item page."}</p><a class="button" href="${claims.total ? "/my/claims" : schoolPath(ctx.orgSlug) + "/search"}">${claims.total ? "First page" : "Find my item"}</a></section>`}
      ${pagination(claims.page, claims.totalPages, ctx.url)}`,
  };
}

function statusMessage(claim: MyClaim): { heading: string; body: string } {
  switch (claim.status) {
    case "pending":
      return {
        heading: "Your claim is with staff.",
        body: "Staff will compare your ownership details with the item. Check this page again for a decision.",
      };
    case "approved":
      return {
        heading: "Ready for collection.",
        body: "Staff approved your claim and reserved the item for you. Follow the collection instructions below.",
      };
    case "rejected":
      return {
        heading: "This claim wasn’t approved.",
        body: "Staff reviewed your ownership details. You can read their reason below and continue looking for your item.",
      };
    case "fulfilled":
      return {
        heading: "Back where it belongs.",
        body: "Staff recorded the physical handover. This claim is complete.",
      };
  }
}

async function claimStatus(ctx: ViewContext, id: string): Promise<View> {
  const result = await ctx.api.getMyClaim(id);
  if (!result.ok) return unavailable(result, ctx.refresh);
  const claim = result.data;
  const status = statusMessage(claim);
  const organizations = await ctx.api.listOrganizations();
  const school = organizations.ok
    ? organizations.data.find((org) => org.id === claim.organizationId)
    : undefined;
  return {
    title: "Claim status",
    html: `<p><a href="/my/claims">&lt; My claims</a></p>
      ${ctx.url.searchParams.get("received") === "1" ? '<p class="notice" role="status">Claim received. Staff will review your ownership details.</p>' : ""}
      <section class="page-heading"><p class="eyebrow">${e(school?.name ?? "Your school")} · Claim status</p><h1>${e(status.heading)}</h1><p>${e(status.body)}</p>${badge(claim.status)}</section>
      <div class="two-column"><section class="card stack">${itemImage(claim.item)}<h2>${e(claim.item.title)}</h2><dl class="detail-list"><dt>Claim reference</dt><dd>${e(claim.id)}</dd><dt>Submitted</dt><dd>${date(claim.createdAt)}</dd><dt>Found at</dt><dd>${e(claim.item.foundLocation)}</dd><dt>Item status</dt><dd>${e(label(claim.item.status))}</dd></dl></section>
      <section class="card stack"><h2>What happens next</h2>
      ${claim.status === "approved" ? `<section class="notice"><h3>Collection instructions</h3><p>${e(claim.collectionInstructions ?? "Contact your school’s front office for collection instructions.")}</p><p>Keep your claim reference handy. Staff will verify the handover in person.</p></section>` : ""}
      ${claim.status === "rejected" ? `<section class="warning"><h3>Staff decision</h3><p>${e(claim.decisionReason ?? "Contact the school office if you need help understanding the decision.")}</p></section>` : ""}
      ${claim.status === "pending" ? "<p>Submitting a claim does not prove ownership. A staff member makes the decision.</p>" : ""}
      ${claim.status === "fulfilled" ? "<p>Thanks for helping keep the school lost-and-found organized.</p>" : ""}
      <h3>Your private submission</h3><p class="privacy">Only you and authorized school staff can view these details.</p><dl class="detail-list"><dt>Contact email</dt><dd>${e(claim.contactEmail)}</dd><dt>Ownership details</dt><dd class="evidence">${e(claim.ownershipEvidence)}</dd></dl>
      <a class="button secondary" href="${schoolPath(school?.slug ?? ctx.orgSlug)}/search">Browse found items</a></section></div>`,
  };
}

async function claimForm(ctx: ViewContext, itemId: string): Promise<View> {
  if (!ctx.session) return unavailable(signInRequired(), ctx.refresh);
  const result = await ctx.api.getPublicItem(ctx.orgSlug, itemId);
  if (!result.ok) return unavailable(result, ctx.refresh);
  const item = result.data;
  const itemPath =
    schoolPath(ctx.orgSlug) + "/items/" + encodeURIComponent(item.id);
  return {
    title: "Send a private claim",
    html: `<p><a href="${itemPath}">&lt; Back to item</a></p><section class="page-heading"><p class="eyebrow">${e(ctx.orgName)} · Claim an item</p><h1>Tell us what makes it yours.</h1><p>Share a detail that isn’t visible in the listing. Staff will review it before arranging collection.</p></section>
      <div class="two-column"><aside class="card stack">${itemImage(item)}<h2>${e(item.title)}</h2><p>${e(item.publicDescription)}</p><p class="muted">Found at ${e(item.foundLocation)} · ${date(item.foundDate)}</p></aside>
      <form id="claim-form" class="card stack" novalidate><h2>Your private claim</h2><div data-errors></div>
      <div class="field"><label for="contactEmail">Contact email</label><input id="contactEmail" name="contactEmail" type="email" autocomplete="email" required maxlength="254" value="${e(ctx.session.email)}" aria-describedby="email-help"><p id="email-help" class="muted">Use an address where school staff can contact you.</p></div>
      <div class="field"><label for="ownershipEvidence">How can staff tell this belongs to you?</label><textarea id="ownershipEvidence" name="ownershipEvidence" rows="7" minlength="20" maxlength="2000" required aria-describedby="evidence-help evidence-privacy"></textarea><p id="evidence-help" class="muted">20–2,000 characters. Describe contents, an identifying mark, or another detail absent from the listing.</p></div>
      <p id="evidence-privacy" class="privacy">Only you and authorized school staff can view these details. Do not include passwords, identity documents or sensitive personal information.</p>
      <p class="muted">A claim is a request for review. Approval and physical collection are separate steps.</p><div class="actions"><button type="submit">Send private claim</button><a class="button secondary" href="${itemPath}">Cancel</a></div></form></div>`,
    bind: (root) => {
      const form = root.querySelector<HTMLFormElement>("#claim-form")!;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        void submitting(form, async () => {
          const email = form.elements.namedItem(
            "contactEmail",
          ) as HTMLInputElement;
          const evidence = form.elements.namedItem(
            "ownershipEvidence",
          ) as HTMLTextAreaElement;
          const fields: Record<string, string> = {};
          if (
            !email.value.trim() ||
            !email.validity.valid ||
            email.value.trim().length > 254
          )
            fields.contactEmail =
              "Enter a valid email address, up to 254 characters.";
          if (
            evidence.value.trim().length < 20 ||
            evidence.value.trim().length > 2000
          )
            fields.ownershipEvidence =
              "Describe a private ownership detail using 20–2,000 characters.";
          if (Object.keys(fields).length) {
            formError(form, "Check the highlighted fields.", fields);
            return;
          }
          const saved = await ctx.api.submitClaim({
            orgSlug: ctx.orgSlug,
            itemId: item.id,
            contactEmail: email.value.trim(),
            ownershipEvidence: evidence.value.trim(),
          });
          if (!form.isConnected) return;
          if (saved.ok) {
            evidence.value = "";
            email.value = "";
            form.reset();
            ctx.navigate(
              "/my/claims/" + encodeURIComponent(saved.data.id) + "?received=1",
            );
            return;
          }
          formError(form, saved.error.message, saved.error.fieldErrors);
          if (
            saved.error.code === "CONFLICT" ||
            saved.error.code === "UNAUTHENTICATED"
          ) {
            const recovery = document.createElement("p");
            recovery.className = "actions";
            const link = document.createElement("a");
            link.href =
              saved.error.code === "CONFLICT"
                ? itemPath
                : "/sign-in?returnTo=" + encodeURIComponent(ctx.url.pathname);
            link.textContent =
              saved.error.code === "CONFLICT"
                ? "Refresh item availability"
                : "Sign in again";
            const claims = document.createElement("a");
            claims.href = "/my/claims";
            claims.textContent = "View my claims";
            recovery.append(link, claims);
            form.querySelector("[data-errors]")!.append(recovery);
          }
        });
      });
    },
  };
}

/** Views consume only the injected API; no personas or private fixture imports. */
export async function claimsView(ctx: ViewContext): Promise<View> {
  const path = ctx.url.pathname;
  if (path === "/sign-in") return signIn(ctx);
  if (path === "/my/claims") return claimsList(ctx);
  const own = path.match(/^\/my\/claims\/([^/]+)$/);
  if (own) return claimStatus(ctx, decodeURIComponent(own[1]));
  const item = path.match(/^\/o\/[^/]+\/items\/([^/]+)\/claim$/);
  if (item) return claimForm(ctx, decodeURIComponent(item[1]));
  return unavailable(missing(), ctx.refresh);
}
