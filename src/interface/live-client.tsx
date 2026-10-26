"use client";
import { useEffect, useRef } from "react";
import { mountLostLink } from "./app";
import { createHttpApi } from "./http";
import type { Session } from "./types";

export default function LiveClient({ session, slugs }: { session: Session | null; slugs: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const api = createHttpApi(slugs);
    const app = mountLostLink(root.current!, { live: true, getApi: () => api, getSession: () => session, signOut: () => undefined });
    const restored = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => { app.destroy(); window.removeEventListener("pageshow", restored); };
  }, [session, slugs]);
  return <div ref={root}><main id="main" className="container main-content" role="status">Loading LostLink…</main><noscript>Enable JavaScript to search inventory and manage claims.</noscript></div>;
}
