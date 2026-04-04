"use client";

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { usePreferencesStore, type EditorFont } from "@/stores/usePreferencesStore";

interface EditorToolbarProps {
  editor: Editor | null;
  onRequestRewrite?: (selectedText: string) => void;
}

const FONTS: { value: EditorFont; label: string; preview: string }[] = [
  { value: "sans", label: "Sans Serif", preview: "Aa" },
  { value: "serif", label: "Serif", preview: "Aa" },
  { value: "mono", label: "Monospace", preview: "Aa" },
];

const FONT_SIZES = [14, 15, 16, 17, 18, 20];

export default function EditorToolbar({ editor, onRequestRewrite }: EditorToolbarProps) {
  const [hasSelection, setHasSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { editorFont, editorFontSize, setEditorFont, setEditorFontSize, loadFromStorage } = usePreferencesStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };
    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);
    return () => {
      editor.off("selectionUpdate", updateSelection);
      editor.off("transaction", updateSelection);
    };
  }, [editor]);

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSettings]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-xs font-medium transition ${
      active
        ? "bg-indigo-500/10 text-indigo-400"
        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
    }`;

  function handleRewrite() {
    if (!editor || !onRequestRewrite) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to);
    onRequestRewrite(selectedText);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive("bold"))}
        title="Bold"
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
        title="Italic"
      >
        I
      </button>
      <span className="mx-1 h-4 w-px bg-slate-700" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
        title="Heading"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
        title="Subheading"
      >
        H3
      </button>
      <span className="mx-1 h-4 w-px bg-slate-700" />
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive("blockquote"))}
        title="Quote"
      >
        &ldquo;&rdquo;
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive("bulletList"))}
        title="Bullet list"
      >
        List
      </button>

      {/* Suggest Rewrite */}
      {hasSelection && onRequestRewrite && (
        <>
          <span className="mx-1 h-4 w-px bg-slate-700" />
          <button
            onClick={handleRewrite}
            className="rounded bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 transition hover:bg-indigo-600/30"
            title="Suggest a rewrite for selected text"
          >
            ✨ Rewrite
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings dropdown */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`rounded px-2 py-1 text-xs transition ${
            showSettings ? "bg-white/[0.05] text-slate-200" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Editor settings"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {showSettings && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border p-4 shadow-xl"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
            }}
          >
            {/* Font family */}
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Editor Font
              </label>
              <div className="flex gap-1">
                {FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setEditorFont(f.value)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition ${
                      editorFont === f.value
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                        : "text-slate-400 hover:bg-white/[0.05]"
                    }`}
                    style={{
                      borderColor: editorFont === f.value ? undefined : "var(--border)",
                      fontFamily: f.value === "serif" ? "Georgia, serif" : f.value === "mono" ? "var(--font-mono), monospace" : "inherit",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Font Size
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorFontSize(Math.max(12, editorFontSize - 1))}
                  className="rounded-lg border px-2 py-1 text-xs text-slate-400 transition hover:bg-white/[0.05]"
                  style={{ borderColor: "var(--border)" }}
                >
                  −
                </button>
                <span className="min-w-[3ch] text-center text-xs text-slate-300">{editorFontSize}</span>
                <button
                  onClick={() => setEditorFontSize(Math.min(24, editorFontSize + 1))}
                  className="rounded-lg border px-2 py-1 text-xs text-slate-400 transition hover:bg-white/[0.05]"
                  style={{ borderColor: "var(--border)" }}
                >
                  +
                </button>
                <div className="ml-1 flex gap-1">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditorFontSize(s)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition ${
                        editorFontSize === s
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
