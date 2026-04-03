import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { ChapterIdea } from "@/lib/types";

interface IdeaStore {
  ideas: ChapterIdea[];
  loadIdeas: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string
  ) => Promise<void>;
  addIdea: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string,
    data: {
      source: "chat" | "context-check";
      source_label: string;
      original_text: string;
      proposed_text: string;
      proposal_type?: string;
    }
  ) => Promise<void>;
  updateIdeaStatus: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string,
    ideaId: string,
    status: "accepted" | "declined"
  ) => Promise<void>;
  /** @deprecated Use updateIdeaStatus instead */
  removeIdea: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string,
    ideaId: string
  ) => Promise<void>;
}

export const useIdeaStore = create<IdeaStore>((set) => ({
  ideas: [],
  loadIdeas: async (projectSlug, partSlug, chapterSlug) => {
    const data = await apiFetch<ChapterIdea[]>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/ideas`
    );
    set({ ideas: data });
  },
  addIdea: async (projectSlug, partSlug, chapterSlug, data) => {
    const idea = await apiFetch<ChapterIdea>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/ideas`,
      { method: "POST", body: JSON.stringify(data) }
    );
    set((state) => ({ ideas: [...state.ideas, idea] }));
  },
  updateIdeaStatus: async (projectSlug, partSlug, chapterSlug, ideaId, status) => {
    const updated = await apiFetch<ChapterIdea>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/ideas/${ideaId}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    set((state) => ({
      ideas: state.ideas.map((p) =>
        p.id === ideaId ? updated : p
      ),
    }));
  },
  removeIdea: async (projectSlug, partSlug, chapterSlug, ideaId) => {
    await apiFetch(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/ideas/${ideaId}`,
      { method: "DELETE" }
    );
    set((state) => ({
      ideas: state.ideas.filter((p) => p.id !== ideaId),
    }));
  },
}));
