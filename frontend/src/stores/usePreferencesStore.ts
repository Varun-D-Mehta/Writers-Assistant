import { create } from "zustand";

export type EditorFont = "sans" | "serif" | "mono";
export type AppTheme = "midnight" | "navy" | "dark";

interface PreferencesState {
  editorFont: EditorFont;
  editorFontSize: number;
  theme: AppTheme;
  setEditorFont: (font: EditorFont) => void;
  setEditorFontSize: (size: number) => void;
  setTheme: (theme: AppTheme) => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = "wa_preferences";

function saveToStorage(state: Partial<PreferencesState>) {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const updated = { ...current, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function loadFromStorage(): Partial<PreferencesState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  editorFont: "sans",
  editorFontSize: 16,
  theme: "midnight",

  setEditorFont: (font) => {
    set({ editorFont: font });
    saveToStorage({ editorFont: font });
  },

  setEditorFontSize: (size) => {
    set({ editorFontSize: size });
    saveToStorage({ editorFontSize: size });
  },

  setTheme: (theme) => {
    set({ theme });
    saveToStorage({ theme });
  },

  loadFromStorage: () => {
    const saved = loadFromStorage();
    set({
      editorFont: (saved.editorFont as EditorFont) || "sans",
      editorFontSize: (saved.editorFontSize as number) || 16,
      theme: (saved.theme as AppTheme) || "midnight",
    });
  },
}));
