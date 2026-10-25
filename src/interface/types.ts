import type { LostLinkApi } from "../mocks/contracts.ts";

/** Host-provided session display only. Authorization always belongs in the adapter. */
export interface Session {
  name: string;
  email: string;
  staffOrgSlugs: string[];
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
  session: Session | null;
  navigate(path: string): void;
  refresh(): void;
  /** Development-only session actions are injected by the preview host. */
  demoSignIn?: (kind: "student" | "staff", returnTo: string) => void;
}
