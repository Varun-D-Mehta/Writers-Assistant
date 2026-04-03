"use client";

import { useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/constants";

/**
 * Hook that prompts user to export before closing the tab
 * and signals session end to the gateway.
 *
 * Uses `beforeunload` for the browser confirmation dialog
 * and `fetch` with `keepalive: true` to reliably notify the server.
 */
export function useSessionCleanup(hasProjects: boolean) {
  const hasProjectsRef = useRef(hasProjects);
  hasProjectsRef.current = hasProjects;

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    // Only prompt if user has active project data
    if (hasProjectsRef.current) {
      e.preventDefault();
      // Modern browsers show a generic message, but setting returnValue is required
      e.returnValue = "You have unsaved work. Export your project before leaving?";
    }

    // Signal session end to gateway (fire-and-forget)
    try {
      fetch(`${API_BASE}/api/session/end`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      });
    } catch {
      // Best effort — if this fails, the idle reaper will clean up
    }
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);
}
