import type { Activity, LostLinkApi, MyClaim, Organization, Page, Pagination, PublicItem, Result, StaffItem, StaffPhoto } from "./contracts.ts";

type ItemDto = {
  id: string; organizationSlug: string; title: string; publicDescription: string;
  category: PublicItem["category"]; color: string; publicLocation: string; foundDate: string;
  status?: StaffItem["status"]; identifyingDetails?: string; storageLocation?: string;
  createdAt?: string; updatedAt?: string; photos?: {url: string; alt: string}[];
};
type ClaimDto = {
  id: string; itemId: string; organizationSlug: string; itemTitle: string;
  status: "submitted" | "approved" | "rejected" | "fulfilled" | "withdrawn" | "cancelled";
  evidenceText: string | null; submittedAt: string; reviewedAt: string | null;
  decisionReason: string | null; version: number; claimantId?: string; reviewedBy?: string;
  privateReviewNote?: string | null; claimantReason?: string | null;
};
type Envelope<T> = { data: T; page?: { nextCursor: string | null }; search?: { mode: "structured" | "hybrid"; semanticStatus: "disabled" | "available" | "unavailable" } };
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const failure = (code: "INTERNAL_ERROR" | "NOT_FOUND" | "VALIDATION_ERROR", message: string): Result<never> =>
  ({ ok: false, error: { code, message, requestId: "browser" } });
const orgPath = (slug: string) => `/organizations/${encodeURIComponent(slug)}`;
const placeholder = { url: "/mock-assets/item-placeholder.svg", alt: "No item photograph available", isPlaceholder: true };

function item(dto: ItemDto): PublicItem {
  return { id: dto.id, organizationId: dto.organizationSlug, title: dto.title,
    publicDescription: dto.publicDescription, category: dto.category, color: dto.color,
    foundLocation: dto.publicLocation, foundDate: dto.foundDate, photo: dto.photos?.[0] ? { ...dto.photos[0], isPlaceholder: false } : placeholder,
    status: dto.status ?? "available", createdAt: dto.createdAt ?? "", updatedAt: dto.updatedAt ?? "" };
}
function staffItem(dto: ItemDto): StaffItem {
  return { ...item(dto), verificationNotes: dto.identifyingDetails ?? "", storageLocation: dto.storageLocation ?? "" };
}
function claim(dto: ClaimDto): MyClaim {
  return { id: dto.id, itemId: dto.itemId, organizationId: dto.organizationSlug,
    claimantId: dto.claimantId ?? "", contactEmail: dto.claimantId ?? "",
    ownershipEvidence: dto.evidenceText ?? "Evidence removed under the retention policy.",
    status: dto.status === "submitted" ? "pending" : dto.status,
    decisionReason: dto.claimantReason ?? (dto.decisionReason === "item_unavailable" ? "The item is no longer available for this claim." : dto.status === "rejected" ? "This claim was not approved. Contact school staff for help." : dto.decisionReason), decidedBy: dto.reviewedBy ?? null,
    decidedAt: dto.reviewedAt, createdAt: dto.submittedAt, version: dto.version,
    privateReviewNote: dto.privateReviewNote, itemTitle: dto.itemTitle, collectionInstructions: null };
}
function page<T>(items: T[], input: Pagination = {}): Result<Page<T>> {
  const number = input.page ?? 1, size = input.pageSize ?? 10;
  if (!Number.isSafeInteger(number) || number < 1 || !Number.isSafeInteger(size) || size < 1 || size > 50)
    return failure("VALIDATION_ERROR", "Choose a valid results page.");
  return ok({ items: items.slice((number - 1) * size, number * size), page: number,
    pageSize: size, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) });
}

/** Same-origin cookie transport. No credentials, fixtures or authorization decisions live here. */
export function createHttpApi(slugs: string[], transport: typeof fetch = fetch): LostLinkApi {
  async function request<T>(path: string, body?: unknown): Promise<Result<Envelope<T>>> {
    try {
      const response = await transport(`/api/v1${path}`, {
        method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
        ...(body === undefined ? {} : body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });
      const json = await response.json();
      if (!response.ok) {
        const codes = { UNAUTHORIZED: "UNAUTHENTICATED", UNAVAILABLE: "INTERNAL_ERROR", VALIDATION_ERROR: "VALIDATION_ERROR", FORBIDDEN: "FORBIDDEN", NOT_FOUND: "NOT_FOUND", CONFLICT: "CONFLICT", RATE_LIMITED: "RATE_LIMITED", PAYLOAD_TOO_LARGE: "VALIDATION_ERROR", UNSUPPORTED_MEDIA_TYPE: "VALIDATION_ERROR" } as const;
        const code = codes[json?.error?.code as keyof typeof codes] ?? "INTERNAL_ERROR";
        const names: Record<string, string> = { evidenceText: "ownershipEvidence", publicLocation: "foundLocation", identifyingDetails: "verificationNotes", privateNote: "privateNote", claimantReason: "reason" };
        const fieldErrors = Object.fromEntries(Object.entries(json?.error?.fields ?? {}).map(([key]) => [names[key] ?? key, "Check this value."]));
        const messages = { UNAUTHENTICATED: "Sign in to continue.", INTERNAL_ERROR: "The service is unavailable. Please try again.", VALIDATION_ERROR: "Check the highlighted fields.", FORBIDDEN: "This action is not allowed.", NOT_FOUND: "This resource is unavailable.", CONFLICT: "The record changed or an active claim already exists. Refresh the status or view My claims.", RATE_LIMITED: "Too many requests. Please wait an hour before trying again." };
        return { ok: false, error: { code, message: json?.error?.code === "PAYLOAD_TOO_LARGE" ? "Choose a photo of 4 MiB or smaller." : json?.error?.code === "UNSUPPORTED_MEDIA_TYPE" ? "Choose a valid JPEG, PNG or WebP photo." : messages[code], requestId: String(json?.error?.requestId ?? "browser"), fieldErrors } };
      }
      if (!json || !("data" in json)) throw new Error("Invalid response");
      return ok(json);
    } catch {
      return failure("INTERNAL_ERROR", "Unable to reach LostLink. Your entries are still here. Try again.");
    }
  }
  // Preserve the existing page-number UI over cursor APIs for this small showcase.
  // Never cache private records across requests or hide truncation as a complete total.
  async function all<T>(path: string): Promise<Result<T[]>> {
    const items: T[] = [], cursors = new Set<string>();
    let cursor: string | null = null;
    for (let count = 0; count < 100; count++) {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const result = await request<T[]>(path + (path.includes("?") ? "&" : "?") + params);
      if (!result.ok) return result;
      if (!Array.isArray(result.data.data)) return failure("INTERNAL_ERROR", "The service returned an invalid list.");
      items.push(...result.data.data);
      cursor = result.data.page?.nextCursor ?? null;
      if (!cursor) return ok(items);
      if (cursors.has(cursor)) break;
      cursors.add(cursor);
    }
    return failure("INTERNAL_ERROR", "This inventory is too large to load in this interface. Contact staff for help.");
  }
  async function ownClaims() {
    const result = await all<ClaimDto>("/me/claims");
    return result.ok ? ok(result.data.map(claim)) : result;
  }
  async function staffClaims(slug: string, filters: Record<string, string> = {}) {
    const params = new URLSearchParams(filters);
    const result = await all<ClaimDto>(orgPath(slug) + "/staff/claims" + (params.size ? "?" + params : ""));
    return result.ok ? ok(result.data.map(claim)) : result;
  }
  async function getStaffItem(slug: string, id: string) {
    const result = await request<ItemDto>(orgPath(slug) + "/staff/items/" + encodeURIComponent(id));
    if (!result.ok) return result;
    const base = orgPath(slug) + "/staff";
    const [claims, photos, activity] = await Promise.all([
      staffClaims(slug, { itemId: id }),
      request<StaffPhoto[]>(base + "/items/" + encodeURIComponent(id) + "/photos"),
      all<{ id: string; actorId: string; action: string; entityType: string; entityId: string; occurredAt: string }>(base + "/activity?itemId=" + encodeURIComponent(id)),
    ]);
    if (!claims.ok) return claims;
    if (!photos.ok) return photos;
    if (!activity.ok) return activity;
    const mapped = staffItem(result.data.data);
    const preview = photos.data.data.find(p => p.status === "published") ?? photos.data.data[0];
    if (preview) mapped.photo = { url: preview.url, alt: preview.alt, isPlaceholder: false };
    return ok({ item: mapped, claims: claims.data, photos: photos.data.data,
      activity: activity.data.map((row): Activity => ({ id: row.id, organizationId: slug, actorId: row.actorId,
        itemId: id, ...(row.entityType === "claim" ? { claimId: row.entityId } : {}), action: row.action, timestamp: row.occurredAt })).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)) });
  }
  return {
    live: true,
    photos: {
      async upload(slug, id, file) {
        const form = new FormData(); form.append("file", file);
        const result = await request<{id: string; status: "pending"}>(orgPath(slug) + "/staff/items/" + encodeURIComponent(id) + "/photos", form);
        return result.ok ? ok(result.data.data) : result;
      },
      publish(slug, id, photoId) {
        return request(orgPath(slug) + "/staff/items/" + encodeURIComponent(id) + "/photos/" + encodeURIComponent(photoId) + "/publish", {reviewed: true});
      },
    },
    async listOrganizations() {
      const results = await Promise.all([...new Set(slugs)].map(slug => request<Organization>(orgPath(slug))));
      const error = results.find(r => !r.ok && r.error.code !== "NOT_FOUND");
      if (error && !error.ok) return error;
      return ok(results.flatMap(r => r.ok ? [{ ...r.data.data, id: r.data.data.slug, publicListingEnabled: true }] : []));
    },
    async searchItems(input) {
      if (input.category === "accessory") return failure("VALIDATION_ERROR", "This filter is unavailable with the current service.");
      const path = orgPath(input.orgSlug);
      const filters = { ...(input.category ? { category: input.category } : {}), ...(input.color ? { color: input.color } : {}), ...(input.from ? { from: input.from } : {}), ...(input.to ? { to: input.to } : {}) };
      if (input.query?.trim()) {
        const result = await request<{ item: ItemDto; reasons: string[] }[]>(path + "/search", { query: input.query.trim(), ...filters, limit: 50 });
        if (!result.ok) return result;
        const paged = page(result.data.data.map(row => ({ ...item(row.item), matchReasons: row.reasons })), input);
        return paged.ok ? ok({ ...paged.data, mode: result.data.search?.mode === "hybrid" ? "hybrid" as const : "keyword" as const, smartMatchingUnavailable: result.data.search?.semanticStatus === "unavailable", limited: true }) : paged;
      }
      const params = new URLSearchParams(filters);
      const result = await all<ItemDto>(path + "/items" + (params.size ? "?" + params : ""));
      if (!result.ok) return result;
      const paged = page(result.data.map(dto => ({ ...item(dto), matchReasons: [] })), input);
      return paged.ok ? ok({ ...paged.data, mode: "keyword" as const, smartMatchingUnavailable: false }) : paged;
    },
    async getPublicItem(slug, id) {
      const result = await request<ItemDto>(orgPath(slug) + "/items/" + encodeURIComponent(id));
      return result.ok ? ok(item(result.data.data)) : result;
    },
    async submitClaim(input) {
      const result = await request<ClaimDto>(orgPath(input.orgSlug) + "/items/" + encodeURIComponent(input.itemId) + "/claims", { evidenceText: input.ownershipEvidence });
      return result.ok ? ok(claim(result.data.data)) : result;
    },
    async listMyClaims(input) { const result = await ownClaims(); return result.ok ? page(result.data, input) : result; },
    async getMyClaim(id) { const result = await ownClaims(); if (!result.ok) return result; const found = result.data.find(c => c.id === id); return found ? ok(found) : failure("NOT_FOUND", "This claim is unavailable."); },
    async createItem(input) {
      const result = await request<ItemDto>(orgPath(input.orgSlug) + "/staff/items", {
        title: input.title, publicDescription: input.publicDescription, category: input.category,
        color: input.color, publicLocation: input.foundLocation, foundDate: input.foundDate,
        identifyingDetails: input.verificationNotes, storageLocation: input.storageLocation,
      });
      return result.ok ? ok(staffItem(result.data.data)) : result;
    },
    async listStaffInventory(input) {
      const result = await all<ItemDto>(orgPath(input.orgSlug) + "/staff/items" + (input.status ? "?status=" + input.status : ""));
      return result.ok ? page(result.data.map(staffItem), input) : result;
    },
    getStaffItem,
    async listStaffClaims(input) { const result = await staffClaims(input.orgSlug, input.status ? { status: input.status === "pending" ? "submitted" : input.status } : {}); return result.ok ? page(result.data, input) : result; },
    async getStaffClaim(slug, id) { const result = await staffClaims(slug); if (!result.ok) return result; const found = result.data.find(c => c.id === id); return found ? ok(found) : failure("NOT_FOUND", "This claim is unavailable."); },
    async decideClaim(input) {
      if (!input.expectedVersion) return failure("VALIDATION_ERROR", "Refresh this claim before reviewing it.");
      return request(orgPath(input.orgSlug) + "/staff/claims/" + encodeURIComponent(input.claimId) + "/review", { expectedVersion: input.expectedVersion, decision: input.decision, ...(input.reason ? { claimantReason: input.reason } : {}), ...(input.privateNote ? { privateNote: input.privateNote } : {}) });
    },
    async recordReturn(input) {
      if (!input.expectedVersion) return failure("VALIDATION_ERROR", "Refresh this claim before recording the return.");
      return request(orgPath(input.orgSlug) + "/staff/claims/" + encodeURIComponent(input.approvedClaimId) + "/return", { expectedVersion: input.expectedVersion, ownershipVerified: true });
    },
  };
}
