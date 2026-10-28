import type { CreateItemInput, LostLinkApi, Photo } from "./contracts.ts";

/** Host-owned photo preparation; the Phase 2 host keeps bytes in this browser. */
export interface PreparedPhoto {
  photo: Photo;
  upload: CreateItemInput["upload"];
}
export interface PhotoUpload {
  upload(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<PreparedPhoto>;
  release(url: string): void;
}

/** Host-provided session display only. Authorization always belongs in the adapter. */
export interface Session {
  name: string;
  email: string;
  staffOrgSlugs: string[];
  websiteOwner?: boolean;
  schoolAdminOrgSlugs?: string[];
}
export interface View {
  title: string;
  html: string;
  bind?: (root: HTMLElement) => void;
}
export interface ViewContext {
  api: LostLinkApi;
  url: URL;
  orgSlug: string;
  orgName: string;
  contactEmail?: string;
  session: Session | null;
  navigate(path: string): void;
  refresh(): void;
  /** Development-only session actions are injected by the preview host. */
  demoSignIn?: (kind: "student" | "staff", returnTo: string) => void;
  photoUpload?: PhotoUpload;
}
