import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { ChapterProposal } from "@/lib/types";

interface ProposalStore {
  proposals: ChapterProposal[];
  loadProposals: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string
  ) => Promise<void>;
  addProposal: (
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
  updateProposalStatus: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string,
    proposalId: string,
    status: "accepted" | "declined"
  ) => Promise<void>;
  /** @deprecated Use updateProposalStatus instead */
  removeProposal: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string,
    proposalId: string
  ) => Promise<void>;
}

export const useProposalStore = create<ProposalStore>((set) => ({
  proposals: [],
  loadProposals: async (projectSlug, partSlug, chapterSlug) => {
    const data = await apiFetch<ChapterProposal[]>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals`
    );
    set({ proposals: data });
  },
  addProposal: async (projectSlug, partSlug, chapterSlug, data) => {
    const proposal = await apiFetch<ChapterProposal>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals`,
      { method: "POST", body: JSON.stringify(data) }
    );
    set((state) => ({ proposals: [...state.proposals, proposal] }));
  },
  updateProposalStatus: async (projectSlug, partSlug, chapterSlug, proposalId, status) => {
    const updated = await apiFetch<ChapterProposal>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals/${proposalId}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    set((state) => ({
      proposals: state.proposals.map((p) =>
        p.id === proposalId ? updated : p
      ),
    }));
  },
  removeProposal: async (projectSlug, partSlug, chapterSlug, proposalId) => {
    await apiFetch(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals/${proposalId}`,
      { method: "DELETE" }
    );
    set((state) => ({
      proposals: state.proposals.filter((p) => p.id !== proposalId),
    }));
  },
}));
