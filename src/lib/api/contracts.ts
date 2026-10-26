import { z } from "zod";

export const uuid = z.uuid();
export const slug = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const category = z.enum(["bag", "clothing", "electronics", "keys", "bottle", "other"]);
const color = z.string().min(1).max(40).regex(/^[a-z]+(?:[ -][a-z]+)*$/);
const expectedVersion = z.number().int().min(1).max(2147483647);
const itemStatus = z.enum(["available", "reserved", "returned", "archived"]);
const claimStatus = z.enum(["submitted", "approved", "rejected", "withdrawn", "fulfilled", "cancelled"]);
const limit = z.preprocess((value) => typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : value, z.number().int().min(1).max(50)).default(20);
const cursor = z.string().max(100).transform((value, ctx) => {
  try { return decodeCursor(value); } catch { ctx.addIssue({ code: "custom", message: "Invalid cursor." }); return z.NEVER; }
}).optional();
const paging = { limit, cursor };
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.");
const dateRange = { from: calendarDate.optional(), to: calendarDate.optional() };
const orderedDates = (value: {from?: string; to?: string}) => !value.from || !value.to || value.from <= value.to;
const itemFields = {
  title: z.string().trim().min(1).max(100),
  publicDescription: z.string().trim().min(1).max(1000),
  category, color,
  publicLocation: z.string().trim().min(1).max(150),
  foundDate: calendarDate,
  identifyingDetails: z.string().trim().min(1).max(2000),
  storageLocation: z.string().trim().min(1).max(150),
};
const versionBody = z.strictObject({ expectedVersion });
const privateNote = z.string().trim().max(1000).optional();
const empty = z.strictObject({});

export const endpoints = {
  organization: { query: empty, authenticated: false },
  items: { query: z.strictObject({ ...paging, q: z.string().trim().max(300).optional(), category: category.optional(), color: color.optional(), ...dateRange }).refine(orderedDates, {message: "Choose an ordered date range.", path: ["to"]}), authenticated: false },
  item: { query: empty, authenticated: false },
  search: { query: empty, body: z.strictObject({ query: z.string().trim().min(1).max(300), category: category.optional(), color: color.optional(), ...dateRange, limit }).refine(orderedDates, {message: "Choose an ordered date range.", path: ["to"]}), authenticated: false },
  own_claims: { query: z.strictObject(paging), authenticated: true },
  submit_claim: { query: empty, body: z.strictObject({ evidenceText: z.string().trim().min(20).max(2000) }), authenticated: true, created: true },
  withdraw_claim: { query: empty, body: versionBody, authenticated: true },
  staff_items: { query: z.strictObject({ ...paging, status: itemStatus.optional() }), authenticated: true },
  staff_item: { query: empty, authenticated: true },
  create_item: { query: empty, body: z.strictObject(itemFields), authenticated: true, created: true },
  update_item: { query: empty, body: z.strictObject({ ...Object.fromEntries(Object.entries(itemFields).map(([key, schema]) => [key, schema.optional()])), expectedVersion }).refine((value) => Object.keys(value).length > 1, "Provide a field to update."), authenticated: true },
  archive_item: { query: empty, body: versionBody, authenticated: true },
  staff_claims: { query: z.strictObject({ ...paging, status: claimStatus.optional(), itemId: uuid.optional() }), authenticated: true },
  review_claim: { query: empty, body: z.strictObject({ expectedVersion, decision: z.enum(["approve", "reject"]), privateNote, claimantReason: z.string().trim().min(5).max(500).optional() }).refine(value => value.decision === "reject" ? !!value.claimantReason : value.claimantReason === undefined, {message: "Provide a claimant-safe reason when rejecting.", path: ["claimantReason"]}), authenticated: true },
  cancel_claim: { query: empty, body: z.strictObject({ expectedVersion, privateNote }), authenticated: true },
  return_claim: { query: empty, body: z.strictObject({ expectedVersion, ownershipVerified: z.literal(true) }), authenticated: true },
} satisfies Record<string, { query: z.ZodType; body?: z.ZodType; authenticated: boolean; created?: boolean }>;

export type Action = keyof typeof endpoints;

export function encodeCursor(value: string): string {
  return Buffer.from(`v1:${uuid.parse(value)}`, "utf8").toString("base64url");
}

export function decodeCursor(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid cursor");
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  if (!decoded.startsWith("v1:")) throw new Error("Invalid cursor version");
  const id = uuid.parse(decoded.slice(3));
  if (encodeCursor(id) !== value) throw new Error("Invalid cursor encoding");
  return id;
}

export function queryObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) throw new Error("Duplicate query parameter.");
    result[key] = value;
  }
  return result;
}
