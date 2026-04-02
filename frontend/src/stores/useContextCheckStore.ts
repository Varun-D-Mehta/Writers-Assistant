import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { ContextIssue } from "@/lib/types";

interface ContextCheckStore {
  issues: ContextIssue[];
  isChecking: boolean;
  runCheck: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string
  ) => Promise<void>;
  clearIssues: () => void;
}

export const useContextCheckStore = create<ContextCheckStore>((set) => ({
  issues: [],
  isChecking: false,
  runCheck: async (projectSlug, partSlug, chapterSlug) => {
    set({ isChecking: true });
    try {
      const data = await apiFetch<{ issues: ContextIssue[] }>(
        "/api/context-check",
        {
          method: "POST",
          body: JSON.stringify({
            project_slug: projectSlug,
            part_slug: partSlug,
            chapter_slug: chapterSlug,
          }),
        }
      );
      set({ issues: data.issues });
    } finally {
      set({ isChecking: false });
    }
  },
  clearIssues: () => set({ issues: [] }),
}));
