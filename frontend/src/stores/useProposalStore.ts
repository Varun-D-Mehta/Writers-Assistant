import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Proposal } from "@/lib/types";

interface ProposalStore {
  proposals: Proposal[];
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
    const data = await apiFetch<Proposal[]>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals`
    );
    set({ proposals: data });
  },
  addProposal: async (projectSlug, partSlug, chapterSlug, data) => {
    const proposal = await apiFetch<Proposal>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/proposals`,
      { method: "POST", body: JSON.stringify(data) }
    );
    set((state) => ({ proposals: [...state.proposals, proposal] }));
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
