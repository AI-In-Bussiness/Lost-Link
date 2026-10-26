import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMockStore, createMockApi, createMockStore } from './client.ts';
import type { CreateItemInput, Result } from './contracts.ts';

function data<T>(result: Result<T>): T {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.data;
}
function error(result: Result<unknown>, code: string) {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('Expected failure');
  assert.equal(result.error.code, code); assert.match(result.error.requestId, /^mock-/);
}
const cedar = 'cedar-grove';
const claimInput = { orgSlug: cedar, itemId: 'item-duffel', contactEmail: 'avery@example.invalid',
  ownershipEvidence: 'The inside pocket contains a purple jump rope.' };
const newItem: CreateItemInput = {
  orgSlug: cedar, title: 'Purple pencil case', publicDescription: 'Purple zip pencil case with a fabric handle.',
  category: 'accessory', color: 'purple', foundLocation: 'Art room', foundDate: '2026-10-25',
  verificationNotes: 'Contains two green pencils.', storageLocation: 'Cabinet C',
  photo: { url: '/mock-assets/item-placeholder.svg', alt: 'Pencil case placeholder illustration', isPlaceholder: true },
  upload: { mimeType: 'image/jpeg', sizeBytes: 240000 },
};

test('public results are school-scoped, available-only and private-field-free', async () => {
  const api = createMockApi();
  const result = data(await api.searchItems({ orgSlug: cedar, query: 'black Nike duffel' }));
  assert.equal(result.items[0].id, 'item-duffel');
  assert.ok(result.items.every(i => i.organizationId === 'org-cedar' && i.status === 'available'));
  for (const forbidden of ['verificationNotes', 'storageLocation', 'ownershipEvidence', 'contactEmail', 'purple jump rope'])
    assert.ok(!JSON.stringify(result).includes(forbidden), forbidden);
  const detail = data(await api.getPublicItem(cedar, 'item-duffel'));
  assert.ok(!('verificationNotes' in detail));
  error(await api.getPublicItem(cedar, 'item-maple-duffel'), 'NOT_FOUND');
  error(await api.getPublicItem(cedar, 'item-jacket'), 'NOT_FOUND');
  error(await api.getPublicItem(cedar, 'item-headphones'), 'NOT_FOUND');
});

test('private verification words never affect search', async () => {
  const result = data(await createMockApi().searchItems({ orgSlug: cedar, query: 'purple jump rope' }));
  assert.equal(result.total, 0);
});

test('browsing, filters, stable pagination and no-match results', async () => {
  const api = createMockApi();
  const browse = data(await api.searchItems({ orgSlug: cedar }));
  assert.equal(browse.total, 9);
  const filtered = data(await api.searchItems({ orgSlug: cedar, category: 'bag', color: 'black', from: '2026-10-23', to: '2026-10-25' }));
  assert.deepEqual(filtered.items.map(i => i.id), ['item-duffel']);
  const first = data(await api.searchItems({ orgSlug: cedar, pageSize: 2 }));
  const second = data(await api.searchItems({ orgSlug: cedar, pageSize: 2, page: 2 }));
  assert.equal(first.totalPages, 5);
  assert.ok(first.items.every(i => !second.items.some(j => j.id === i.id)));
  assert.equal(data(await api.searchItems({ orgSlug: cedar, query: 'telescope' })).total, 0);
});

test('invalid search inputs return structured validation errors', async () => {
  const api = createMockApi();
  for (const fields of [{ page: 0 }, { pageSize: 51 }, { page: 1.5 }, { query: 'x'.repeat(301) },
    { from: '2026-02-31' }, { from: '2026-10-24', to: '2026-10-01' }, { to: '2026-10-26' }]) {
    error(await api.searchItems({ orgSlug: cedar, ...fields }), 'VALIDATION_ERROR');
  }
  error(await api.searchItems({ orgSlug: 'closed-school' }), 'NOT_FOUND');
  error(await api.searchItems({ orgSlug: 'not-a-school' }), 'NOT_FOUND');
  assert.equal(data(await api.listOrganizations()).length, 2);
});

test('keyword fallback remains available during simulated AI outage', async () => {
  const result = data(await createMockApi(undefined, { aiUnavailable: true }).searchItems({ orgSlug: cedar, query: 'dark gym bag' }));
  assert.equal(result.mode, 'keyword'); assert.equal(result.smartMatchingUnavailable, true);
  assert.equal(result.items[0].id, 'item-duffel');
  assert.ok(result.items[0].matchReasons[0].includes('gym'));
});

test('anonymous, claimant and wrong-school staff cannot use protected operations', async () => {
  const store = createMockStore(), anon = createMockApi(store), student = createMockApi(store, { persona: 'student' });
  const maple = createMockApi(store, { persona: 'otherStaff' });
  error(await anon.submitClaim(claimInput), 'UNAUTHENTICATED');
  error(await anon.listMyClaims(), 'UNAUTHENTICATED');
  error(await anon.listStaffInventory({ orgSlug: cedar }), 'UNAUTHENTICATED');
  error(await student.createItem(newItem), 'FORBIDDEN');
  error(await student.decideClaim({ orgSlug: cedar, claimId: 'claim-pending', decision: 'approve' }), 'FORBIDDEN');
  error(await maple.listStaffClaims({ orgSlug: cedar }), 'FORBIDDEN');
  error(await maple.getStaffItem('maple-hill', 'item-duffel'), 'NOT_FOUND');
  error(await maple.getStaffClaim('maple-hill', 'claim-pending'), 'NOT_FOUND');
});

test('claim ownership, form validation and duplicate receipt behavior', async () => {
  const store = createMockStore(), student = createMockApi(store, { persona: 'student' });
  error(await student.getMyClaim('claim-competing'), 'NOT_FOUND');
  error(await student.submitClaim({ ...claimInput, contactEmail: 'bad-address' }), 'VALIDATION_ERROR');
  error(await student.submitClaim({ ...claimInput, ownershipEvidence: 'mine' }), 'VALIDATION_ERROR');
  const first = data(await student.submitClaim(claimInput));
  assert.equal(first.status, 'pending'); assert.equal(first.collectionInstructions, null);
  assert.equal(data(await student.submitClaim(claimInput)).id, first.id);
  assert.ok(data(await student.listMyClaims()).items.every(c => c.claimantId === first.claimantId));
  const staff = createMockApi(store, { persona: 'staff' });
  data(await staff.decideClaim({ orgSlug: cedar, claimId: first.id, decision: 'approve' }));
  assert.equal(data(await student.submitClaim(claimInput)).id, first.id);
  assert.ok(data(await student.getMyClaim(first.id)).collectionInstructions);
});

test('full intake, claim, approval and physical return persists across new clients/snapshot', async () => {
  const store = createMockStore(), staff = createMockApi(store, { persona: 'staff' });
  const student = createMockApi(store, { persona: 'student' });
  const item = data(await staff.createItem(newItem));
  assert.equal(data(await createMockApi(store).getPublicItem(cedar, item.id)).title, newItem.title);
  const claim = data(await student.submitClaim({ ...claimInput, itemId: item.id }));
  const approved = data(await staff.decideClaim({ orgSlug: cedar, claimId: claim.id, decision: 'approve' }));
  assert.equal(approved.item.status, 'reserved'); assert.equal(approved.claim.status, 'approved');
  error(await staff.recordReturn({ orgSlug: cedar, itemId: 'item-duffel', approvedClaimId: claim.id }), 'CONFLICT');
  const result = data(await staff.recordReturn({ orgSlug: cedar, itemId: item.id, approvedClaimId: claim.id }));
  assert.equal(result.item.status, 'returned'); assert.equal(result.claim.status, 'fulfilled');
  const restored = createMockStore(store.snapshot());
  const refreshed = createMockApi(restored, { persona: 'student' });
  assert.equal(data(await refreshed.getMyClaim(claim.id)).status, 'fulfilled');
  error(await createMockApi(restored).getPublicItem(cedar, item.id), 'NOT_FOUND');
  assert.ok(data(await staff.getStaffItem(cedar, item.id)).activity.some(a => a.action === 'item_returned'));
  assert.ok(!JSON.stringify(store.snapshot().activity).includes(claim.ownershipEvidence));
});

test('competing approvals have one winner and return rejects remaining pending claims', async () => {
  const store = createMockStore(), staff = createMockApi(store, { persona: 'staff', latencyMs: 2 });
  const results = await Promise.all(['claim-pending', 'claim-competing'].map(claimId => staff.decideClaim({ orgSlug: cedar, claimId, decision: 'approve' })));
  assert.equal(results.filter(r => r.ok).length, 1);
  const winner = results.find(r => r.ok)!;
  if (!winner.ok) throw new Error('No approval');
  error(results.find(r => !r.ok)!, 'CONFLICT');
  const another = createMockApi(store, { persona: winner.data.claim.claimantId === 'demo-student-avery' ? 'otherStudent' : 'student' });
  // Existing pending claimant receives their receipt, but no second approval is possible.
  assert.equal(data(await another.submitClaim({ ...claimInput, itemId: 'item-bottle' })).status, 'pending');
  data(await staff.recordReturn({ orgSlug: cedar, itemId: 'item-bottle', approvedClaimId: winner.data.claim.id }));
  assert.equal(store.snapshot().claims.filter(c => c.itemId === 'item-bottle' && c.status === 'fulfilled').length, 1);
  const rejected = store.snapshot().claims.find(c => c.itemId === 'item-bottle' && c.status === 'rejected')!;
  assert.equal(rejected.decisionReason, 'This item has been returned.');
  error(await staff.recordReturn({ orgSlug: cedar, itemId: 'item-bottle', approvedClaimId: winner.data.claim.id }), 'CONFLICT');
});

test('new claims blocked for reserved/returned items; rejection needs reason and leaves item available', async () => {
  const store = createMockStore(), student = createMockApi(store, { persona: 'student' }), other = createMockApi(store, { persona: 'otherStudent' });
  const staff = createMockApi(store, { persona: 'staff' });
  error(await other.submitClaim({ ...claimInput, itemId: 'item-jacket' }), 'CONFLICT');
  error(await student.submitClaim({ ...claimInput, itemId: 'item-headphones' }), 'CONFLICT');
  error(await staff.decideClaim({ orgSlug: cedar, claimId: 'claim-pending', decision: 'reject', reason: '' }), 'VALIDATION_ERROR');
  const rejected = data(await staff.decideClaim({ orgSlug: cedar, claimId: 'claim-pending', decision: 'reject', reason: 'The hidden detail did not match.' }));
  assert.equal(rejected.item.status, 'available');
  error(await staff.decideClaim({ orgSlug: cedar, claimId: 'claim-pending', decision: 'approve' }), 'CONFLICT');
});

test('intake metadata validation is explicit and has no partial writes', async () => {
  const store = createMockStore(), staff = createMockApi(store, { persona: 'staff' });
  const before = store.snapshot().items.length;
  for (const overrides of [{ title: '' }, { foundDate: '2026-10-26' },
    { upload: { mimeType: 'image/jpeg' as const, sizeBytes: 6 * 1024 * 1024 } },
    { photo: { url: 'https://untrusted.invalid/image.jpg', alt: 'Untrusted', isPlaceholder: false } }])
    error(await staff.createItem({ ...newItem, ...overrides }), 'VALIDATION_ERROR');
  assert.equal(store.snapshot().items.length, before);
});

test('returned responses and caller snapshots cannot mutate the store', async () => {
  const store = createMockStore(), staff = createMockApi(store, { persona: 'staff' });
  const item = data(await staff.getStaffItem(cedar, 'item-duffel'));
  item.item.verificationNotes = 'altered'; item.item.photo.alt = 'altered';
  const snapshot = store.snapshot(); snapshot.items[0].title = 'altered';
  const fresh = data(await staff.getStaffItem(cedar, 'item-duffel'));
  assert.notEqual(fresh.item.verificationNotes, 'altered'); assert.notEqual(fresh.item.photo.alt, 'altered');
  assert.notEqual(fresh.item.title, 'altered');
});

test('empty, network, rate limit and loading scenarios are reproducible', async () => {
  const emptyStore = createEmptyMockStore(), empty = createMockApi(emptyStore, { persona: 'student' });
  assert.equal(data(await empty.searchItems({ orgSlug: cedar })).total, 0);
  assert.equal(data(await empty.listMyClaims()).total, 0);
  error(await empty.getPublicItem(cedar, 'item-duffel'), 'NOT_FOUND');
  error(await createMockApi(undefined, { failure: 'network' }).searchItems({ orgSlug: cedar }), 'INTERNAL_ERROR');
  error(await createMockApi(undefined, { failure: 'rateLimit' }).searchItems({ orgSlug: cedar }), 'RATE_LIMITED');
  let resolved = false;
  const pending = createMockApi(undefined, { latencyMs: 20 }).listOrganizations().then(r => { resolved = true; return r; });
  assert.equal(resolved, false); data(await pending); assert.equal(resolved, true);
});

test('reset restores deterministic fixtures and separate stores never share mutations', async () => {
  const store = createMockStore(), otherStore = createMockStore();
  data(await createMockApi(store, { persona: 'staff' }).recordReturn({ orgSlug: cedar, itemId: 'item-jacket', approvedClaimId: 'claim-approved' }));
  assert.equal(otherStore.snapshot().items.find(i => i.id === 'item-jacket')!.status, 'reserved');
  store.reset(); assert.deepEqual(store.snapshot(), otherStore.snapshot());
});
