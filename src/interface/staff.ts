import { photoPanel, bindPhotoPanel } from "./live-photos.ts";
import { photoInputHtml, bindPhotoInput } from "./photo-input.ts";
import type {
  Category,
  Claim,
  ClaimStatus,
  CreateItemInput,
  ItemStatus,
  PublicItem,
  Result,
  StaffItem,
} from "./contracts.ts";
import type { View, ViewContext } from "./types.ts";
import {
  badge,
  categories,
  date,
  e,
  formError,
  itemImage,
  label,
  pagination,
  schoolPath,
  submitting,
  unavailable,
} from "./shared.ts";

const base = (ctx: ViewContext) => schoolPath(ctx.orgSlug) + "/staff";
const itemPath = (ctx: ViewContext, id: string) =>
  base(ctx) + "/items/" + encodeURIComponent(id);
const claimPath = (ctx: ViewContext, id: string) =>
  base(ctx) + "/claims/" + encodeURIComponent(id);
const pageNumber = (ctx: ViewContext) =>
  Number(ctx.url.searchParams.get("page") || 1);
const publicDetails = (item: PublicItem) =>
  `<dl class="detail-list"><div><dt>Category</dt><dd>${e(label(item.category))}</dd></div><div><dt>Color</dt><dd>${e(label(item.color))}</dd></div><div><dt>Found at</dt><dd>${e(item.foundLocation)}</dd></div><div><dt>Found on</dt><dd>${date(item.foundDate)}</dd></div></dl>`;
const header = (ctx: ViewContext, title: string, detail: string) =>
  `<div class="page-heading"><div><p class="eyebrow">${e(ctx.orgName)} · Staff workspace</p><h1>${e(title)}</h1><p class="muted">${e(detail)}</p></div><div class="actions"><a class="button secondary" href="${base(ctx)}/items">Inventory</a><a class="button" href="${base(ctx)}/items/new">Add found item</a></div></div>`;
const failureView = (ctx: ViewContext, message: string): View =>
  unavailable(
    {
      ok: false,
      error: { code: "NOT_FOUND", message, requestId: "interface" },
    },
    ctx.refresh,
  );

function mutationError(
  form: HTMLFormElement,
  result: Extract<Result<unknown>, { ok: false }>,
  ctx: ViewContext,
): void {
  const conflict = result.error.code === "CONFLICT";
  formError(
    form,
    result.error.message +
      (conflict
        ? " Refresh to see the current status before trying another action."
        : ""),
    result.error.fieldErrors,
  );
  if (conflict && !form.querySelector("[data-refresh]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.dataset.refresh = "";
    button.textContent = "Refresh current status";
    button.addEventListener("click", () => ctx.refresh());
    form.querySelector("[data-errors]")?.append(button);
  }
}
function valid(form: HTMLFormElement): boolean {
  if (form.checkValidity()) return true;
  const fields: Record<string, string> = {};
  for (const field of Array.from(form.elements)) {
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      if (!field.validity.valid) fields[field.name] = field.validationMessage;
    }
  }
  formError(form, "Check the highlighted fields.", fields);
  return false;
}

async function dashboard(ctx: ViewContext): Promise<View> {
  const status = (ctx.url.searchParams.get("status") || "pending") as
    | ClaimStatus
    | "all";
  if (
    ![
      "pending",
      "approved",
      "rejected",
      "fulfilled",
      "all",
      ...(ctx.api.live ? ["withdrawn", "cancelled"] : []),
    ].includes(status)
  )
    return failureView(ctx, "Unknown claim filter.");
  const [available, reserved, returned, pending, claims] = await Promise.all([
    ctx.api.listStaffInventory({
      orgSlug: ctx.orgSlug,
      status: "available",
      pageSize: 1,
    }),
    ctx.api.listStaffInventory({
      orgSlug: ctx.orgSlug,
      status: "reserved",
      pageSize: 1,
    }),
    ctx.api.listStaffInventory({
      orgSlug: ctx.orgSlug,
      status: "returned",
      pageSize: 1,
    }),
    ctx.api.listStaffClaims({
      orgSlug: ctx.orgSlug,
      status: "pending",
      pageSize: 1,
    }),
    ctx.api.listStaffClaims({
      orgSlug: ctx.orgSlug,
      ...(status === "all" ? {} : { status }),
      page: pageNumber(ctx),
      pageSize: 10,
    }),
  ]);
  for (const result of [available, reserved, returned, pending, claims])
    if (!result.ok) return unavailable(result, ctx.refresh);
  if (
    !available.ok ||
    !reserved.ok ||
    !returned.ok ||
    !pending.ok ||
    !claims.ok
  )
    throw new Error("Unreachable result");
  const titles = new Map<string, string>();
  await Promise.all(
    [...new Set(claims.data.items.map((c) => c.itemId))].map(async (id) => {
      const result = await ctx.api.getStaffItem(ctx.orgSlug, id);
      if (result.ok) titles.set(id, result.data.item.title);
    }),
  );
  return {
    title: "Staff dashboard",
    html:
      header(
        ctx,
        "A little care. A happy return.",
        "Keep found items organized and help them get home.",
      ) +
      `
    <section class="stats" aria-label="School inventory totals">
      ${(["available", "reserved", "returned"] as const).map((s, i) => `<a class="stat" href="${base(ctx)}/items?status=${s}"><span>${e(label(s))}</span><strong>${[available.data.total, reserved.data.total, returned.data.total][i]}</strong><span class="muted">View items <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`).join("")}
      <a class="stat" href="${base(ctx)}"><span>Pending claims</span><strong>${pending.data.total}</strong><span class="muted">Ready for review v</span></a>
    </section>
    <section class="card stack"><div class="page-heading"><div><p class="eyebrow">Human verification</p><h2>Claim review queue</h2><p class="muted">Compare private identifying details before approving collection.</p></div><form id="claim-filter" class="field"><label for="status">Claim status</label><select id="status" name="status">${["pending", "approved", "rejected", "fulfilled", ...(ctx.api.live ? ["withdrawn", "cancelled"] : []), "all"].map((s) => `<option value="${s}"${s === status ? " selected" : ""}>${s === "all" ? "All claims" : e(label(s))}</option>`).join("")}</select><button class="secondary" type="submit">Apply filter</button></form></div>
    <p role="status">${claims.data.total} ${status === "all" ? "" : e(status) + " "}claim${claims.data.total === 1 ? "" : "s"}</p>
    ${claims.data.items.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="Claim review table"><table><caption class="sr-only">Claims for ${e(ctx.orgName)}</caption><thead><tr><th scope="col">Item</th><th scope="col">Claim reference</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>${claims.data.items.map((c) => `<tr><td>${e(titles.get(c.itemId) || c.itemId)}</td><td>${e(c.id)}</td><td>${date(c.createdAt)}</td><td>${badge(c.status)}</td><td><a href="${claimPath(ctx, c.id)}">Review <span class="sr-only">${e(c.id)}</span> <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></td></tr>`).join("")}</tbody></table></div>${pagination(claims.data.page, claims.data.totalPages, ctx.url)}` : `<div class="empty-state"><h3>No ${status === "all" ? "" : e(status) + " "}claims here.</h3><p>New requests will appear in the pending queue.</p><a href="${base(ctx)}/items">View inventory</a></div>`}</section>`,
    bind: (root) =>
      root
        .querySelector<HTMLFormElement>("#claim-filter")!
        .addEventListener("submit", (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          ctx.navigate(
            base(ctx) +
              "?status=" +
              encodeURIComponent(String(new FormData(form).get("status"))),
          );
        }),
  };
}

async function inventory(ctx: ViewContext): Promise<View> {
  const status = ctx.url.searchParams.get("status") || "";
  if (
    status &&
    ![
      "available",
      "reserved",
      "returned",
      ...(ctx.api.live ? ["archived"] : []),
    ].includes(status)
  )
    return failureView(ctx, "Unknown item filter.");
  const result = await ctx.api.listStaffInventory({
    orgSlug: ctx.orgSlug,
    ...(status ? { status: status as ItemStatus } : {}),
    page: pageNumber(ctx),
    pageSize: 10,
  });
  if (!result.ok) return unavailable(result, ctx.refresh);
  const rows = result.data;
  return {
    title: "Staff inventory",
    html:
      header(
        ctx,
        "Found items",
        "A clear place for every item, from intake to handover.",
      ) +
      `
    <section class="card stack"><form id="inventory-filter" class="actions"><div class="field"><label for="status">Item status</label><select id="status" name="status"><option value="">All items</option>${["available", "reserved", "returned", ...(ctx.api.live ? ["archived"] : [])].map((s) => `<option value="${s}"${s === status ? " selected" : ""}>${e(label(s))}</option>`).join("")}</select></div><button type="submit" class="secondary">Apply filter</button><a href="${base(ctx)}">Claim review queue <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></form><p role="status">${rows.total} item${rows.total === 1 ? "" : "s"}</p>
    ${rows.items.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="Found-item inventory table"><table><caption class="sr-only">Found-item inventory</caption><thead><tr><th scope="col">Item</th><th scope="col">Found at</th><th scope="col">Found on</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>${rows.items.map((item) => `<tr><td><strong>${e(item.title)}</strong><br><span class="muted">${e(label(item.category))} · ${e(item.color)}</span></td><td>${e(item.foundLocation)}</td><td>${date(item.foundDate)}</td><td>${badge(item.status)}</td><td><a href="${itemPath(ctx, item.id)}">Manage <span class="sr-only">${e(item.title)}</span> <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></td></tr>`).join("")}</tbody></table></div>${pagination(rows.page, rows.totalPages, ctx.url)}` : `<div class="empty-state"><h2>No items in this view.</h2><p>Try another status or add a found item.</p><a href="${base(ctx)}/items/new">Add found item <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>`}</section>`,
    bind: (root) =>
      root
        .querySelector<HTMLFormElement>("#inventory-filter")!
        .addEventListener("submit", (event) => {
          event.preventDefault();
          const status = String(
            new FormData(event.currentTarget as HTMLFormElement).get("status"),
          );
          ctx.navigate(
            base(ctx) +
              "/items" +
              (status ? "?status=" + encodeURIComponent(status) : ""),
          );
        }),
  };
}

async function intake(ctx: ViewContext): Promise<View> {
  const permission = await ctx.api.listStaffInventory({
    orgSlug: ctx.orgSlug,
    pageSize: 1,
  });
  if (!permission.ok) return unavailable(permission, ctx.refresh);
  return {
    title: "Add a found item",
    html:
      header(
        ctx,
        "Give a found item a way home.",
        "Create a public listing and keep identifying details private.",
      ) +
      `
    <form id="intake-form" class="stack" novalidate><div data-errors></div><div class="two-column"><section class="card stack"><p class="eyebrow">Visible to students</p><h2>Public listing</h2>
    <div class="field"><label for="title">Item title</label><input id="title" name="title" required minlength="3" maxlength="100" placeholder="For example, Purple pencil case"></div>
    <div class="field"><label for="publicDescription">Public description</label><textarea id="publicDescription" name="publicDescription" required minlength="10" maxlength="1000" rows="4" aria-describedby="public-hint"></textarea><p id="public-hint" class="muted">Describe the outside. Keep hidden marks and contents for verification.</p></div>
    <div class="two-column"><div class="field"><label for="category">Category</label><select id="category" name="category" required>${categories
      .filter((c) => !ctx.api.live || c !== "accessory")
      .map((c) => `<option value="${c}">${e(label(c))}</option>`)
      .join(
        "",
      )}</select></div><div class="field"><label for="color">Color</label><input id="color" name="color" required maxlength="40" pattern="[a-z]+([ \\-][a-z]+)*" aria-describedby="color-hint"><p id="color-hint" class="muted">Use lowercase color words, for example black or dark blue.</p></div></div>
    <div class="field"><label for="foundLocation">Broad found location</label><input id="foundLocation" name="foundLocation" required maxlength="100" placeholder="For example, Library"></div>
    <div class="field"><label for="foundDate">Date found</label><input id="foundDate" name="foundDate" type="date" required max="${new Date().toISOString().slice(0, 10)}"></div>
    ${ctx.api.live ? "<p>Save the listing, then upload and review its photograph on the next screen.</p>" : photoInputHtml(Boolean(ctx.photoUpload))}
    ${ctx.api.live ? "" : `<div class="field"><label for="photo.alt">Image description</label><input id="photo.alt" name="photo.alt" required maxlength="200" value="Fictional found-item illustration, not a photograph"><p class="muted">Describe only public details for people using screen readers.</p></div>`}</section>
    <section class="card stack privacy"><p class="eyebrow">Staff only</p><h2>Private verification</h2><p>These details never appear in the public preview.</p><div class="field"><label for="verificationNotes">${ctx.api.live ? "Identifying notes (required)" : "Identifying notes (optional)"}</label><textarea id="verificationNotes" name="verificationNotes" ${ctx.api.live ? "required" : ""} maxlength="2000" rows="5" aria-describedby="private-hint"></textarea><p id="private-hint" class="muted">Record a hidden mark or contents staff can compare with a claim. Use fictional details in this demo.</p></div><div class="field"><label for="storageLocation">Staff storage location</label><input id="storageLocation" name="storageLocation" required maxlength="100"></div></section></div>
    <div class="actions"><button type="submit">Preview public listing &gt;</button><a href="${base(ctx)}/items">Cancel</a></div>
    <section id="public-preview" class="card stack" hidden aria-labelledby="preview-heading" tabindex="-1"></section></form>`,
    bind: (root) => {
      const form = root.querySelector<HTMLFormElement>("#intake-form")!;
      const preview = root.querySelector<HTMLElement>("#public-preview")!;
      const photo = ctx.api.live
        ? {
            ready: () => true,
            value: () => ({
              photo: {
                url: "/mock-assets/item-placeholder.svg",
                alt: "No photograph yet",
                isPlaceholder: true,
              },
              upload: { mimeType: "image/jpeg" as const, sizeBytes: 0 },
            }),
          }
        : bindPhotoInput(form, ctx.photoUpload);
      let reviewed = false;
      const value = (name: string) =>
        String(new FormData(form).get(name) || "").trim();
      const input = (): CreateItemInput => ({
        orgSlug: ctx.orgSlug,
        title: value("title"),
        publicDescription: value("publicDescription"),
        category: value("category") as Category,
        color: value("color"),
        foundLocation: value("foundLocation"),
        foundDate: value("foundDate"),
        photo: {
          ...photo.value()!.photo,
          alt: ctx.api.live ? value("title") : value("photo.alt"),
        },
        upload: photo.value()!.upload,
        verificationNotes: value("verificationNotes"),
        storageLocation: value("storageLocation"),
      });
      form.addEventListener("input", () => {
        reviewed = false;
        preview.hidden = true;
      });
      form.addEventListener("change", () => {
        reviewed = false;
        preview.hidden = true;
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!photo.ready() || !valid(form)) return;
        const item = input();
        reviewed = true;
        // Deliberately construct the public preview from its allowlisted fields.
        preview.innerHTML = `<p class="eyebrow">Public preview</p><h2 id="preview-heading">${e(item.title)}</h2><div class="two-column"><div class="item-image"><img src="${e(item.photo.url)}" alt="${e(item.photo.alt)}"><span class="photo-label">${item.photo.isPlaceholder ? "Illustration · demo item" : "Local photo · not uploaded"}</span></div><div><p>${e(item.publicDescription)}</p><dl class="detail-list"><div><dt>Category</dt><dd>${e(label(item.category))}</dd></div><div><dt>Color</dt><dd>${e(item.color)}</dd></div><div><dt>Found at</dt><dd>${e(item.foundLocation)}</dd></div><div><dt>Found on</dt><dd>${date(item.foundDate)}</dd></div></dl></div></div><p class="muted">Only the listing above will be shown publicly.</p><div class="actions"><button type="button" id="publish-item">${ctx.api.live ? "Save listing and add photo" : "Publish demo item"}</button><button type="button" class="secondary" id="edit-item">Back to editing</button></div>`;
        preview.hidden = false;
        preview.focus();
        preview.querySelector("#edit-item")!.addEventListener("click", () => {
          reviewed = false;
          preview.hidden = true;
          form.querySelector<HTMLInputElement>("#title")!.focus();
        });
        preview
          .querySelector("#publish-item")!
          .addEventListener("click", () => {
            if (!reviewed || !photo.ready() || !valid(form)) return;
            void submitting(form, async () => {
              const result = await ctx.api.createItem(input());
              if (!root.isConnected) return;
              if (result.ok) ctx.navigate(itemPath(ctx, result.data.id));
              else {
                reviewed = false;
                preview.hidden = true;
                mutationError(form, result, ctx);
              }
            });
          });
      });
    },
  };
}

async function manageItem(ctx: ViewContext, id: string): Promise<View> {
  const result = await ctx.api.getStaffItem(ctx.orgSlug, id);
  if (!result.ok) return unavailable(result, ctx.refresh);
  const { item, claims, activity, photos = [] } = result.data;
  const approved = claims.find((c) => c.status === "approved");
  return {
    title: "Manage " + item.title,
    html:
      header(
        ctx,
        item.title,
        "Manage the listing, review claims and record a verified return.",
      ) +
      `
    <div class="two-column"><section class="card stack">${badge(item.status)}${itemImage(item)}<h2>Public listing</h2><p>${e(item.publicDescription)}</p>${publicDetails(item)}${item.status === "available" ? `<a href="${schoolPath(ctx.orgSlug)}/items/${encodeURIComponent(item.id)}">View public listing <svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : '<p class="muted">This item is no longer in public search.</p>'}</section>
    <section class="card stack privacy"><p class="eyebrow">Staff only</p><h2>Verification details</h2><dl class="detail-list"><div><dt>Private notes</dt><dd>${e(item.verificationNotes || "No notes recorded.")}</dd></div><div><dt>Storage location</dt><dd>${e(item.storageLocation)}</dd></div></dl>
    <h2>Claims</h2>${claims.length ? `<ul class="stack">${claims.map((c) => `<li>${badge(c.status)} <a href="${claimPath(ctx, c.id)}">${e(c.id)}</a> · ${e(ctx.api.live ? c.claimantId : c.contactEmail)}</li>`).join("")}</ul>` : "<p>No claims yet.</p>"}
    ${approved && item.status === "reserved" ? returnForm(ctx, item, approved) : item.status === "returned" ? '<div class="notice"><strong>Return recorded</strong><p>The item has been handed over and is no longer available.</p></div>' : ""}</section></div>
    ${ctx.api.photos ? photoPanel(item, photos) : ""}<section class="card stack"><h2>Activity</h2>${activity.length ? `<ol class="stack">${activity.map((a) => `<li><strong>${e(a.action === "photo_upload_reserved" ? "Photo received" : label(a.action))}</strong> · ${date(a.timestamp)}</li>`).join("")}</ol>` : "<p>No activity recorded.</p>"}</section>`,
    bind: (root) => {
      if (approved) bindReturn(root, ctx, item, approved);
      bindPhotoPanel(root, ctx, item.id);
    },
  };
}

function returnForm(ctx: ViewContext, item: StaffItem, claim: Claim): string {
  return `<form id="return-form" class="stack"><div data-errors></div><h2>Record physical handover</h2><p>Approval reserves the item. Record a return only after staff have checked the claimant and handed it over.</p><label class="check"><input id="handover" name="handover" type="checkbox" required> I confirm <strong>${e(item.title)}</strong> has been handed to <strong>${e(ctx.api.live ? claim.claimantId : claim.contactEmail)}</strong> for claim ${e(claim.id)}.</label><button type="submit">Mark item returned</button></form>`;
}
function bindReturn(
  root: HTMLElement,
  ctx: ViewContext,
  item: StaffItem,
  claim: Claim,
): void {
  const form = root.querySelector<HTMLFormElement>("#return-form");
  if (!form) return;
  form.noValidate = true;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!valid(form)) return;
    void submitting(form, async () => {
      const result = await ctx.api.recordReturn({
        orgSlug: ctx.orgSlug,
        itemId: item.id,
        approvedClaimId: claim.id,
        expectedVersion: claim.version,
      });
      if (!root.isConnected) return;
      if (result.ok) ctx.refresh();
      else mutationError(form, result, ctx);
    });
  });
}

async function reviewClaim(ctx: ViewContext, id: string): Promise<View> {
  const result = await ctx.api.getStaffClaim(ctx.orgSlug, id);
  if (!result.ok) return unavailable(result, ctx.refresh);
  const claim = result.data;
  const detail = await ctx.api.getStaffItem(ctx.orgSlug, claim.itemId);
  if (!detail.ok) return unavailable(detail, ctx.refresh);
  const item = detail.data.item;
  return {
    title: "Review claim " + claim.id,
    html:
      header(
        ctx,
        "Review this claim",
        "A possible match starts a conversation. Staff verify ownership.",
      ) +
      `
    <div class="two-column"><section class="card stack"><p class="eyebrow">Item</p><h2><a href="${itemPath(ctx, item.id)}">${e(item.title)}</a></h2>${badge(item.status)}${itemImage(item)}<p>${e(item.publicDescription)}</p>${publicDetails(item)}<div class="privacy"><h3>Staff-only identifying notes</h3><p>${e(item.verificationNotes || "No notes recorded.")}</p><p><strong>Storage:</strong> ${e(item.storageLocation)}</p></div></section>
    <section class="card stack privacy"><p class="eyebrow">Private claim</p><h2>Ownership evidence</h2>${badge(claim.status)}<dl class="detail-list"><div><dt>Claim reference</dt><dd>${e(claim.id)}</dd></div><div><dt>${ctx.api.live ? "Claimant reference" : "Contact email"}</dt><dd>${e(ctx.api.live ? claim.claimantId : claim.contactEmail)}</dd></div><div><dt>Submitted</dt><dd>${date(claim.createdAt)}</dd></div></dl><blockquote>${e(claim.ownershipEvidence)}</blockquote>${ctx.api.live && claim.privateReviewNote ? `<h3>Private review note</h3><p>${e(claim.privateReviewNote)}</p>` : ""}
    ${claim.status === "pending" ? `<div class="notice"><p>Compare the evidence with the private notes. A search match does not prove ownership.</p></div><form id="approve-form" class="stack"><div data-errors></div><p>Approval reserves this item for this claimant. Physical handover is recorded separately.</p><button type="submit"${item.status !== "available" ? " disabled" : ""}>Approve for collection</button>${item.status !== "available" ? '<p class="muted">This item is unavailable for approval. Refresh or reject the claim with an explanation.</p>' : ""}</form><hr><form id="reject-form" class="stack" novalidate><div data-errors></div><div class="field"><label for="reason">Reason for rejection</label><textarea id="reason" name="reason" required minlength="5" maxlength="500" rows="3" aria-describedby="reason-hint"></textarea><p id="reason-hint" class="muted">The claimant can see this reason. Do not reveal hidden identifying details.</p></div>${ctx.api.live ? `<div class="field"><label for="privateNote">Private review note (optional)</label><textarea id="privateNote" name="privateNote" maxlength="1000" rows="3"></textarea><p class="muted">Only authorized staff can read this note.</p></div>` : ""}<button type="submit" class="secondary">Reject claim</button></form>` : claim.status === "approved" ? returnForm(ctx, item, claim) : `<div class="notice"><strong>${claim.status === "fulfilled" ? "Item returned" : claim.status === "rejected" ? "Claim rejected" : label(claim.status)}</strong><p>${e(claim.status === "fulfilled" ? "The physical handover has been recorded." : claim.decisionReason || "No reason recorded.")}</p></div>`}</section></div>`,
    bind: (root) => {
      const approve = root.querySelector<HTMLFormElement>("#approve-form");
      const reject = root.querySelector<HTMLFormElement>("#reject-form");
      approve?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (item.status !== "available") return;
        void submitting(approve, async () => {
          const result = await ctx.api.decideClaim({
            orgSlug: ctx.orgSlug,
            claimId: claim.id,
            expectedVersion: claim.version,
            decision: "approve",
          });
          if (!root.isConnected) return;
          if (result.ok) ctx.refresh();
          else mutationError(approve, result, ctx);
        });
      });
      reject?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!valid(reject)) return;
        void submitting(reject, async () => {
          const result = await ctx.api.decideClaim({
            orgSlug: ctx.orgSlug,
            claimId: claim.id,
            expectedVersion: claim.version,
            decision: "reject",
            reason: String(new FormData(reject).get("reason") || "").trim(),
            ...(ctx.api.live
              ? {
                  privateNote: String(
                    new FormData(reject).get("privateNote") || "",
                  ).trim(),
                }
              : {}),
          });
          if (!root.isConnected) return;
          if (result.ok) ctx.refresh();
          else mutationError(reject, result, ctx);
        });
      });
      if (claim.status === "approved") bindReturn(root, ctx, item, claim);
    },
  };
}

export async function staffView(ctx: ViewContext): Promise<View> {
  const path = ctx.url.pathname;
  const prefix = base(ctx);
  if (path === prefix || path === prefix + "/claims") return dashboard(ctx);
  if (path === prefix + "/items") return inventory(ctx);
  if (path === prefix + "/items/new") return intake(ctx);
  if (
    path.startsWith(prefix + "/items/") &&
    !path.slice((prefix + "/items/").length).includes("/")
  )
    return manageItem(
      ctx,
      decodeURIComponent(path.slice((prefix + "/items/").length)),
    );
  if (
    path.startsWith(prefix + "/claims/") &&
    !path.slice((prefix + "/claims/").length).includes("/")
  )
    return reviewClaim(
      ctx,
      decodeURIComponent(path.slice((prefix + "/claims/").length)),
    );
  return failureView(ctx, "This staff page is unavailable.");
}
