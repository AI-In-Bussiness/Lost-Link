/** DEVELOPMENT ONLY. The mock includes all fictional personas/evidence in memory.
 * Never import into production or interpret mock permission checks as backend security.
 */
import type { Activity, Category, Claim, ClaimStatus, CreateItemInput, ErrorCode, ItemStatus,
  LostLinkApi, MockOptions, MyClaim, Page, Pagination, Persona, PublicItem, Result, StaffItem } from './contracts.ts';
import { collectionInstructions, DEMO_NOW, organizations, personas, seedActivity, seedClaims, seedItems } from './fixtures.ts';

export interface MockSnapshot { version: 1; items: StaffItem[]; claims: Claim[]; activity: Activity[]; nextId: number }
export interface MockStore {
  /** Only the mock adapter should use state; intentionally contains fictional private fields. */
  state: MockSnapshot;
  reset(): void;
  snapshot(): MockSnapshot;
}
export function createMockStore(snapshot?: MockSnapshot): MockStore {
  const fresh = (): MockSnapshot => ({ version: 1, items: seedItems(), claims: seedClaims(), activity: seedActivity(), nextId: 1 });
  if (snapshot && snapshot.version !== 1) throw new Error('Unsupported mock snapshot version');
  return { state: snapshot ? structuredClone(snapshot) : fresh(),
    reset() { this.state = fresh(); }, snapshot() { return structuredClone(this.state); } };
}
export function createEmptyMockStore(): MockStore {
  return createMockStore({ version: 1, items: [], claims: [], activity: [], nextId: 1 });
}
class MockFault extends Error {
  code: ErrorCode; fieldErrors?: Record<string, string>;
  constructor(code: ErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message); this.code = code; this.fieldErrors = fieldErrors;
  }
}
const fail = (code: ErrorCode, message: string, fields?: Record<string, string>): never => { throw new MockFault(code, message, fields); };
const categories: Category[] = ['bag', 'clothing', 'electronics', 'bottle', 'keys', 'accessory', 'other'];
const itemStatuses: ItemStatus[] = ['available', 'reserved', 'returned'];
const claimStatuses: ClaimStatus[] = ['pending', 'approved', 'rejected', 'fulfilled'];
function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    fail('VALIDATION_ERROR', 'Check the highlighted fields.', { [field]: `Use ${min}–${max} characters.` });
  return (value as string).trim();
}
function day(value: unknown, field: string, now: string): string {
  const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid || (value as string) > now.slice(0, 10))
    fail('VALIDATION_ERROR', 'Check the date.', { [field]: 'Use a valid date that is not in the future.' });
  return value as string;
}
function page<T>(items: T[], input: Pagination = {}): Page<T> {
  const number = input.page ?? 1, size = input.pageSize ?? 20;
  if (!Number.isInteger(number) || number < 1 || !Number.isInteger(size) || size < 1 || size > 50)
    fail('VALIDATION_ERROR', 'Page must be positive and page size between 1 and 50.');
  return { items: items.slice((number - 1) * size, number * size), page: number, pageSize: size,
    total: items.length, totalPages: Math.ceil(items.length / size) };
}
function publicItem(item: StaffItem): PublicItem {
  // Explicit allowlist: never spread a staff DTO into a public response.
  return { id: item.id, organizationId: item.organizationId, title: item.title, publicDescription: item.publicDescription,
    category: item.category, color: item.color, foundLocation: item.foundLocation, foundDate: item.foundDate,
    photo: { url: item.photo.url, alt: item.photo.alt, isPlaceholder: item.photo.isPlaceholder },
    status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt };
}
const stopWords = new Set('a an the i my with and or of at in near lost it is has for to me'.split(' '));
const tokens = (value: string) => [...new Set(value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(t => !stopWords.has(t));

export function createMockApi(store: MockStore = createMockStore(), config: MockOptions & { persona?: Persona; now?: string } = {}): LostLinkApi {
  const actor = personas[config.persona ?? 'anonymous'];
  if (!actor) throw new Error('Unknown mock persona');
  const now = config.now ?? DEMO_NOW;
  if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid mock clock');
  if (config.latencyMs !== undefined && (!Number.isFinite(config.latencyMs) || config.latencyMs < 0 || config.latencyMs > 10000))
    throw new Error('Mock latency must be 0–10000ms');
  let request = 0;
  async function run<T>(fn: () => T): Promise<Result<T>> {
    const requestId = `mock-${config.persona ?? 'anonymous'}-${++request}`;
    if (config.latencyMs) await new Promise(resolve => setTimeout(resolve, config.latencyMs));
    try {
      if (config.failure === 'network') fail('INTERNAL_ERROR', 'Unable to load data. Try again.');
      if (config.failure === 'rateLimit') fail('RATE_LIMITED', 'Too many requests. Try again later.');
      return { ok: true, data: structuredClone(fn()) };
    } catch (error) {
      if (!(error instanceof MockFault)) throw error;
      return { ok: false, error: { code: error.code, message: error.message, requestId,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } };
    }
  }
  const org = (slug: string, publicOnly = false) => {
    const value = organizations.find(o => o.slug === slug && (!publicOnly || o.publicListingEnabled));
    if (!value) fail('NOT_FOUND', 'This school is unavailable.');
    return value!;
  };
  const signedIn = (): string => actor.userId ?? fail('UNAUTHENTICATED', 'Sign in to continue.');
  const staffOrg = (slug: string) => {
    signedIn();
    const value = org(slug);
    if (!actor.staffOrgIds.includes(value.id)) fail('FORBIDDEN', 'Staff access is required.');
    return value;
  };
  const findItem = (orgId: string, id: string): StaffItem => store.state.items.find(i => i.organizationId === orgId && i.id === id)
    ?? fail('NOT_FOUND', 'This item is unavailable.');
  const findClaim = (orgId: string, id: string): Claim => store.state.claims.find(c => c.organizationId === orgId && c.id === id)
    ?? fail('NOT_FOUND', 'This claim is unavailable.');
  const mine = (claim: Claim): MyClaim => ({ ...claim, item: publicItem(findItem(claim.organizationId, claim.itemId)),
    collectionInstructions: claim.status === 'approved' ? collectionInstructions[claim.organizationId] ?? null : null });
  const event = (action: Activity['action'], item: StaffItem, claim?: Claim) => store.state.activity.push({
    id: `mock-activity-${store.state.nextId++}`, organizationId: item.organizationId, actorId: signedIn(),
    itemId: item.id, ...(claim ? { claimId: claim.id } : {}), action, timestamp: now,
  });
  return {
    listOrganizations: () => run(() => organizations.filter(o => o.publicListingEnabled)),
    searchItems: input => run(() => {
      const school = org(input.orgSlug, true);
      const query = text(input.query ?? '', 'query', 0, 300);
      if (input.category && !categories.includes(input.category)) fail('VALIDATION_ERROR', 'Unknown category.');
      if (input.color !== undefined) text(input.color, 'color', 0, 50);
      if (input.from) day(input.from, 'from', now);
      if (input.to) day(input.to, 'to', now);
      if (input.from && input.to && input.from > input.to) fail('VALIDATION_ERROR', 'Start date must precede end date.');
      const words = tokens(query);
      const results = store.state.items.filter(i => i.organizationId === school.id && i.status === 'available'
        && (!input.category || i.category === input.category) && (!input.color || i.color === input.color.trim().toLowerCase())
        && (!input.from || i.foundDate >= input.from) && (!input.to || i.foundDate <= input.to))
        .map(item => {
          const fields = [item.title, item.publicDescription, item.category, item.color, item.foundLocation];
          const matched = words.filter(word => fields.some(field => tokens(field).includes(word)));
          return { item, matched, score: matched.length };
        }).filter(row => words.length === 0 || row.score > 0)
        .sort((a, b) => b.score - a.score || b.item.foundDate.localeCompare(a.item.foundDate) || a.item.id.localeCompare(b.item.id))
        .map(({ item, matched }) => ({ ...publicItem(item), matchReasons: matched.length ? [`Matching public terms: ${matched.join(', ')}`] : [] }));
      return { ...page(results, input), mode: 'keyword' as const, smartMatchingUnavailable: config.aiUnavailable ?? false };
    }),
    getPublicItem: (slug, id) => run(() => {
      const school = org(slug, true);
      const item = findItem(school.id, id);
      if (item.status !== 'available') fail('NOT_FOUND', 'This item is unavailable.');
      return publicItem(item);
    }),
    submitClaim: input => run(() => {
      const userId = signedIn(), school = org(input.orgSlug, true);
      const item = findItem(school.id, input.itemId);
      const email = text(input.contactEmail, 'contactEmail', 3, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('VALIDATION_ERROR', 'Check your email.', { contactEmail: 'Enter a valid email address.' });
      const evidence = text(input.ownershipEvidence, 'ownershipEvidence', 20, 2000);
      const existing = store.state.claims.find(c => c.itemId === item.id && c.claimantId === userId && ['pending', 'approved'].includes(c.status));
      if (existing) return mine(existing);
      if (item.status !== 'available') fail('CONFLICT', 'This item is no longer available for new claims.');
      const claim: Claim = { id: `mock-claim-${store.state.nextId++}`, organizationId: school.id, itemId: item.id, claimantId: userId,
        contactEmail: email, ownershipEvidence: evidence, status: 'pending', decisionReason: null, decidedBy: null, decidedAt: null, createdAt: now };
      store.state.claims.push(claim); event('claim_submitted', item, claim); return mine(claim);
    }),
    listMyClaims: (input = {}) => run(() => {
      const id = signedIn(); return page(store.state.claims.filter(c => c.claimantId === id).map(mine), input);
    }),
    getMyClaim: id => run(() => {
      const userId = signedIn();
      const claim = store.state.claims.find(c => c.id === id && c.claimantId === userId) ?? fail('NOT_FOUND', 'This claim is unavailable.');
      return mine(claim);
    }),
    createItem: input => run(() => {
      const school = staffOrg(input.orgSlug);
      const title = text(input.title, 'title', 3, 100), description = text(input.publicDescription, 'publicDescription', 10, 1000);
      const location = text(input.foundLocation, 'foundLocation', 1, 100), foundDate = day(input.foundDate, 'foundDate', now);
      const color = text(input.color, 'color', 1, 50).toLowerCase();
      const notes = text(input.verificationNotes, 'verificationNotes', 0, 2000), storage = text(input.storageLocation, 'storageLocation', 1, 100);
      if (!categories.includes(input.category)) fail('VALIDATION_ERROR', 'Unknown category.');
      if (!input.upload || !['image/jpeg', 'image/png', 'image/webp'].includes(input.upload.mimeType)
        || !Number.isInteger(input.upload.sizeBytes) || input.upload.sizeBytes < 1 || input.upload.sizeBytes > 5 * 1024 * 1024)
        fail('VALIDATION_ERROR', 'Choose a JPEG, PNG or WebP up to 5 MB.', { photo: 'Unsupported photo metadata.' });
      text(input.photo?.alt, 'photo.alt', 1, 200);
      // Only the checked-in placeholder is supported. No pretend real upload or URL trust validation.
      if (input.photo?.url !== '/mock-assets/item-placeholder.svg' || input.photo.isPlaceholder !== true)
        fail('VALIDATION_ERROR', 'Use the development photo placeholder.');
      const item: StaffItem = { id: `mock-item-${store.state.nextId++}`, organizationId: school.id, title,
        publicDescription: description, category: input.category, color, foundLocation: location, foundDate,
        photo: { url: input.photo.url, alt: input.photo.alt.trim(), isPlaceholder: true }, status: 'available',
        verificationNotes: notes, storageLocation: storage, createdAt: now, updatedAt: now };
      store.state.items.push(item); event('item_created', item); return item;
    }),
    listStaffInventory: input => run(() => {
      const school = staffOrg(input.orgSlug);
      if (input.status && !itemStatuses.includes(input.status)) fail('VALIDATION_ERROR', 'Unknown item status.');
      return page(store.state.items.filter(i => i.organizationId === school.id && (!input.status || i.status === input.status)), input);
    }),
    getStaffItem: (slug, id) => run(() => {
      const school = staffOrg(slug), item = findItem(school.id, id);
      return { item, claims: store.state.claims.filter(c => c.organizationId === school.id && c.itemId === id),
        activity: store.state.activity.filter(a => a.organizationId === school.id && a.itemId === id) };
    }),
    listStaffClaims: input => run(() => {
      const school = staffOrg(input.orgSlug);
      if (input.status && !claimStatuses.includes(input.status)) fail('VALIDATION_ERROR', 'Unknown claim status.');
      return page(store.state.claims.filter(c => c.organizationId === school.id && (!input.status || c.status === input.status)), input);
    }),
    getStaffClaim: (slug, id) => run(() => findClaim(staffOrg(slug).id, id)),
    decideClaim: input => run(() => {
      const claim = findClaim(staffOrg(input.orgSlug).id, input.claimId), item = findItem(claim.organizationId, claim.itemId);
      if (!['approve', 'reject'].includes(input.decision)) fail('VALIDATION_ERROR', 'Choose approve or reject.');
      if (claim.status !== 'pending') fail('CONFLICT', 'This claim has already been reviewed.');
      const reason = input.decision === 'reject' ? text(input.reason, 'reason', 5, 500) : null;
      if (input.decision === 'approve' && item.status !== 'available') fail('CONFLICT', 'This item is no longer available.');
      // No await inside mutation: simulated atomic transition, NOT a database transaction.
      claim.status = input.decision === 'approve' ? 'approved' : 'rejected'; claim.decisionReason = reason;
      claim.decidedBy = signedIn(); claim.decidedAt = now;
      if (claim.status === 'approved') item.status = 'reserved';
      item.updatedAt = now; event(claim.status === 'approved' ? 'claim_approved' : 'claim_rejected', item, claim);
      return { item, claim };
    }),
    recordReturn: input => run(() => {
      const school = staffOrg(input.orgSlug), item = findItem(school.id, input.itemId), claim = findClaim(school.id, input.approvedClaimId);
      if (item.status !== 'reserved' || claim.itemId !== item.id || claim.status !== 'approved')
        fail('CONFLICT', 'Refresh the item and select its approved claim.');
      item.status = 'returned'; item.updatedAt = now; claim.status = 'fulfilled';
      for (const other of store.state.claims.filter(c => c.itemId === item.id && c.organizationId === school.id && c.status === 'pending')) {
        other.status = 'rejected'; other.decisionReason = 'This item has been returned.';
        other.decidedAt = now; other.decidedBy = signedIn(); event('claim_rejected', item, other);
      }
      event('item_returned', item, claim); return { item, claim };
    }),
  };
}
