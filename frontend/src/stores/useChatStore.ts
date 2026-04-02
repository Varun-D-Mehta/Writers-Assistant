import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamedText: string;
  setStreaming: (s: boolean) => void;
  setStreamedText: (t: string) => void;
  appendStreamToken: (token: string) => void;
  loadHistory: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string
  ) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  clearChat: (
    projectSlug: string,
    partSlug: string,
    chapterSlug: string
  ) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamedText: "",
  setStreaming: (s) => set({ isStreaming: s }),
  setStreamedText: (t) => set({ streamedText: t }),
  appendStreamToken: (token) =>
    set((state) => ({ streamedText: state.streamedText + token })),
  loadHistory: async (projectSlug, partSlug, chapterSlug) => {
    const data = await apiFetch<{ messages: ChatMessage[] }>(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/chat`
    );
    set({ messages: data.messages });
  },
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearChat: async (projectSlug, partSlug, chapterSlug) => {
    await apiFetch(
      `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/chat`,
      { method: "DELETE" }
    );
    set({ messages: [] });
  },
}));
