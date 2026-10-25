/** FICTIONAL DEVELOPMENT DATA. Includes pretend private evidence: never production seed data. */
import type { Activity, Claim, Organization, Persona, StaffItem } from './contracts.ts';
export const DEMO_NOW = '2026-10-25T14:00:00.000Z';
export const organizations: Organization[] = [
  { id: 'org-cedar', slug: 'cedar-grove', name: 'Cedar Grove School', publicListingEnabled: true },
  { id: 'org-maple', slug: 'maple-hill', name: 'Maple Hill School', publicListingEnabled: true },
  { id: 'org-closed', slug: 'closed-school', name: 'Disabled Demo School', publicListingEnabled: false },
];
export const collectionInstructions: Record<string, string> = {
  'org-cedar': 'Visit the Cedar Grove front office on a school day. Show your claim reference to staff.',
  'org-maple': 'Visit the Maple Hill front office. Show your claim reference to staff.',
};
export const personas: Record<Persona, { userId: string | null; staffOrgIds: string[] }> = {
  anonymous: { userId: null, staffOrgIds: [] },
  student: { userId: 'demo-student-avery', staffOrgIds: [] },
  otherStudent: { userId: 'demo-student-jordan', staffOrgIds: [] },
  staff: { userId: 'demo-staff-cedar', staffOrgIds: ['org-cedar'] },
  otherStaff: { userId: 'demo-staff-maple', staffOrgIds: ['org-maple'] },
};
const rows: [string, string, string, StaffItem['category'], string, string, string, string, StaffItem['status']][] = [
  ['item-duffel', 'Black Nike duffel bag', 'Black sports duffel with a white logo and two carry handles.', 'bag', 'black', 'Gym entrance', '2026-10-23', 'Inside pocket contains a purple jump rope; zipper has a green thread.', 'available'],
  ['item-backpack', 'Black athletic backpack', 'Black backpack with padded straps and a mesh side pocket.', 'bag', 'black', 'Locker room', '2026-10-22', 'Small star patch inside the main compartment.', 'available'],
  ['item-bottle', 'Blue reusable water bottle', 'Blue metal water bottle with a screw-top lid.', 'bottle', 'blue', 'Library', '2026-10-24', 'Sticker under base reads Moon Club.', 'available'],
  ['item-hoodie', 'Grey zip hoodie', 'Grey cotton hoodie with a full-length zip.', 'clothing', 'grey', 'Basketball court', '2026-10-21', 'Yellow repair stitch on inside left cuff.', 'available'],
  ['item-calculator', 'Scientific calculator', 'Black scientific calculator with a sliding cover.', 'electronics', 'black', 'Science corridor', '2026-10-20', 'Back cover has an orange triangle drawn inside.', 'available'],
  ['item-keys', 'Keys on a red loop', 'Two keys on a plain red fabric key loop.', 'keys', 'red', 'Cafeteria', '2026-10-24', 'One key has a tiny flower engraving on its reverse.', 'available'],
  ['item-cap', 'Navy baseball cap', 'Navy cap with an adjustable fabric strap.', 'accessory', 'navy', 'Sports field', '2026-10-19', 'Green initials on the inside sweatband.', 'available'],
  ['item-umbrella', 'Yellow folding umbrella', 'Compact yellow umbrella with a black handle.', 'other', 'yellow', 'Main entrance', '2026-10-18', 'One inner rib is wrapped in blue tape.', 'available'],
  ['item-lunchbag', 'Green insulated lunch bag', 'Green lunch bag with a grey handle and zip.', 'bag', 'green', 'Cafeteria', '2026-10-23', 'Reusable fork with a rainbow handle inside.', 'available'],
  ['item-jacket', 'Red rain jacket', 'Lightweight red jacket with a hood.', 'clothing', 'red', 'Bus waiting area', '2026-10-17', 'Inner pocket holds a folded fictional chess score sheet.', 'reserved'],
  ['item-headphones', 'White over-ear headphones', 'White wireless headphones with padded ear cups.', 'electronics', 'white', 'Music room', '2026-10-16', 'Left inner band has a tiny blue paint mark.', 'returned'],
  ['item-maple-duffel', 'Black Nike duffel bag', 'Black sports duffel with a white logo and two carry handles.', 'bag', 'black', 'Gym entrance', '2026-10-24', 'Maple-only hidden detail; never visible at Cedar Grove.', 'available'],
];
export function seedItems(): StaffItem[] {
  return rows.map(([id, title, publicDescription, category, color, foundLocation, foundDate, verificationNotes, status]) => ({
    id, organizationId: id.startsWith('item-maple') ? 'org-maple' : 'org-cedar', title, publicDescription,
    category, color, foundLocation, foundDate, verificationNotes, status,
    storageLocation: `Fictional cabinet ${id === 'item-jacket' ? 'B' : 'A'}`,
    photo: { url: '/mock-assets/item-placeholder.svg', alt: `Illustration placeholder for ${title.toLowerCase()}; not a photograph`, isPlaceholder: true },
    createdAt: `${foundDate}T10:00:00.000Z`, updatedAt: `${foundDate}T10:00:00.000Z`,
  }));
}
function claim(id: string, itemId: string, claimantId: string, status: Claim['status'], evidence: string): Claim {
  return { id, itemId, organizationId: 'org-cedar', claimantId,
    contactEmail: claimantId === personas.student.userId ? 'avery@example.invalid' : 'jordan@example.invalid',
    ownershipEvidence: evidence, status, decisionReason: status === 'rejected' ? 'The identifying detail did not match.' : null,
    decidedBy: status === 'pending' ? null : 'demo-staff-cedar',
    decidedAt: status === 'pending' ? null : '2026-10-24T12:00:00.000Z', createdAt: '2026-10-24T11:00:00.000Z' };
}
export function seedClaims(): Claim[] {
  return [
    claim('claim-pending', 'item-bottle', 'demo-student-avery', 'pending', 'The sticker on the base says Moon Club.'),
    claim('claim-competing', 'item-bottle', 'demo-student-jordan', 'pending', 'I think the bottle has a silver star underneath.'),
    claim('claim-approved', 'item-jacket', 'demo-student-avery', 'approved', 'There is a folded chess score sheet in the inner pocket.'),
    claim('claim-rejected', 'item-backpack', 'demo-student-avery', 'rejected', 'I left a notebook with a red cover inside.'),
    claim('claim-fulfilled', 'item-headphones', 'demo-student-jordan', 'fulfilled', 'Blue paint mark on the left inner band.'),
  ];
}
export function seedActivity(): Activity[] {
  return seedItems().map(item => ({ id: `activity-${item.id}`, organizationId: item.organizationId,
    actorId: item.organizationId === 'org-cedar' ? 'demo-staff-cedar' : 'demo-staff-maple', itemId: item.id,
    action: 'item_created', timestamp: item.createdAt }));
}
