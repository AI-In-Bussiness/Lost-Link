"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { bindPageMotion, getMotionPreference } from "@/interface/motion";

/** Native pages use the same preference and cleanup rules as the mounted app. */
export default function PaperMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (!root.current) return;
    return bindPageMotion(root.current, getMotionPreference());
  }, [children, pathname]);
  return (
    <div className="paper-shell" ref={root}>
      {children}
    </div>
  );
}
