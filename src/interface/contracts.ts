/** UI view model. Live transport maps the backend contract explicitly. */
export type Category = 'bag' | 'clothing' | 'electronics' | 'bottle' | 'keys' | 'accessory' | 'other';
export type ItemStatus = 'available' | 'reserved' | 'returned' | 'archived';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'withdrawn' | 'cancelled';
export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
export type Result<T> = { ok: true; data: T } | {
  ok: false; error: { code: ErrorCode; message: string; requestId: string; fieldErrors?: Record<string, string> };
};
export interface Organization { id: string; slug: string; name: string; publicListingEnabled: boolean }
export interface Photo { url: string; alt: string; isPlaceholder: boolean }
export interface PublicItem {
  id: string; organizationId: string; title: string; publicDescription: string;
  category: Category; color: string; foundLocation: string; foundDate: string;
  photo: Photo; status: ItemStatus; createdAt: string; updatedAt: string;
}
export interface StaffItem extends PublicItem { verificationNotes: string; storageLocation: string }
export interface Claim {
  version?: number; privateReviewNote?: string | null;
  id: string; itemId: string; organizationId: string; claimantId: string;
  contactEmail: string; ownershipEvidence: string; status: ClaimStatus;
  decisionReason: string | null; decidedBy: string | null; decidedAt: string | null; createdAt: string;
}
export interface MyClaim extends Claim {
  item?: PublicItem; itemTitle?: string; collectionInstructions: string | null;
}
export interface StaffPhoto { id: string; status: 'pending' | 'published'; url: string; alt: string }
export interface PhotoApi {
  upload(orgSlug: string, itemId: string, file: File): Promise<Result<{ id: string; status: 'pending' }>>;
  publish(orgSlug: string, itemId: string, photoId: string): Promise<Result<unknown>>;
}
export interface Activity {
  id: string; organizationId: string; actorId: string; itemId: string;
  claimId?: string; action: string; timestamp: string;
}
export interface Pagination { page?: number; pageSize?: number }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface SearchInput extends Pagination {
  orgSlug: string; query?: string; category?: Category; color?: string; from?: string; to?: string;
}
export interface SearchItem extends PublicItem { matchReasons: string[] }
export interface SearchResults extends Page<SearchItem> {
  limited?: boolean; mode: 'keyword' | 'hybrid'; smartMatchingUnavailable: boolean;
}
export interface ClaimInput { orgSlug: string; itemId: string; contactEmail: string; ownershipEvidence: string }
/** Upload metadata is simulated only; real byte validation/storage belongs to Founder B. */
export interface CreateItemInput {
  orgSlug: string; title: string; publicDescription: string; category: Category; color: string;
  foundLocation: string; foundDate: string; photo: Photo;
  upload: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; sizeBytes: number };
  verificationNotes: string; storageLocation: string;
}
export interface DecisionInput { orgSlug: string; claimId: string; decision: 'approve' | 'reject'; reason?: string; privateNote?: string; expectedVersion?: number }
export interface ReturnInput { orgSlug: string; itemId: string; approvedClaimId: string; expectedVersion?: number }
export interface StaffQuery extends Pagination { orgSlug: string }
export interface StaffItemDetail { item: StaffItem; claims: Claim[]; activity: Activity[]; photos?: StaffPhoto[] }
export interface LostLinkApi {
  readonly live?: boolean;
  readonly photos?: PhotoApi;
  listOrganizations(): Promise<Result<Organization[]>>;
  searchItems(input: SearchInput): Promise<Result<SearchResults>>;
  getPublicItem(orgSlug: string, itemId: string): Promise<Result<PublicItem>>;
  submitClaim(input: ClaimInput): Promise<Result<MyClaim>>;
  listMyClaims(input?: Pagination): Promise<Result<Page<MyClaim>>>;
  getMyClaim(claimId: string): Promise<Result<MyClaim>>;
  createItem(input: CreateItemInput): Promise<Result<StaffItem>>;
  listStaffInventory(input: StaffQuery & { status?: ItemStatus }): Promise<Result<Page<StaffItem>>>;
  getStaffItem(orgSlug: string, itemId: string): Promise<Result<StaffItemDetail>>;
  listStaffClaims(input: StaffQuery & { status?: ClaimStatus }): Promise<Result<Page<Claim>>>;
  getStaffClaim(orgSlug: string, claimId: string): Promise<Result<Claim>>;
  decideClaim(input: DecisionInput): Promise<Result<unknown>>;
  recordReturn(input: ReturnInput): Promise<Result<unknown>>;
}
