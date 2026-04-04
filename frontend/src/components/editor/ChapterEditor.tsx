"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { apiFetch } from "@/lib/api";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import EditorToolbar from "./EditorToolbar";
import { InlinePrediction } from "./InlinePrediction";

interface ChapterEditorProps {
  projectSlug: string;
  partSlug: string;
  chapterSlug: string;
  onEditorReady?: (editor: Editor | null) => void;
  onRequestRewrite?: (selectedText: string) => void;
}

export default function ChapterEditor({
  projectSlug,
  partSlug,
  chapterSlug,
  onEditorReady,
  onRequestRewrite,
}: ChapterEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusRef = useRef<"saved" | "saving" | "unsaved">("saved");
  const statusElRef = useRef<HTMLSpanElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const { editorFont, editorFontSize } = usePreferencesStore();

  const updateStatus = (status: "saved" | "saving" | "unsaved") => {
    saveStatusRef.current = status;
    if (statusElRef.current) {
      statusElRef.current.textContent =
        status === "saving"
          ? "Saving..."
          : status === "unsaved"
            ? "Unsaved changes"
            : "Saved";
      statusElRef.current.className = `text-xs ${
        status === "saving"
          ? "text-amber-400"
          : status === "unsaved"
            ? "text-red-400"
            : "text-slate-500"
      }`;
    }
  };

  const saveContent = useCallback(
    async (json: Record<string, unknown>) => {
      updateStatus("saving");
      try {
        await apiFetch(
          `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}`,
          { method: "PUT", body: JSON.stringify(json) }
        );
        updateStatus("saved");
      } catch {
        updateStatus("unsaved");
      }
    },
    [projectSlug, partSlug, chapterSlug]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      CharacterCount,
      InlinePrediction.configure({ projectSlug }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      updateStatus("unsaved");
      setWordCount(editor.storage.characterCount?.words() ?? 0);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContent(editor.getJSON());
      }, 1500);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const load = async () => {
      try {
        const data = await apiFetch<{
          meta: Record<string, unknown>;
          content: Record<string, unknown>;
        }>(
          `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}`
        );
        editor.commands.setContent(data.content);
        setWordCount(editor.storage.characterCount?.words() ?? 0);
      } catch {
        // Chapter might be empty
      }
    };
    load();
  }, [editor, projectSlug, partSlug, chapterSlug]);

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 surface-1" style={{ borderColor: "var(--border)" }}>
        <EditorToolbar editor={editor} onRequestRewrite={onRequestRewrite} />
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{wordCount} words</span>
          <span ref={statusElRef} className="text-xs text-slate-500">
            Saved
          </span>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto px-12 py-8"
        style={{
          background: "var(--surface-1)",
          fontFamily: editorFont === "serif" ? "Georgia, 'Times New Roman', serif"
            : editorFont === "mono" ? "var(--font-mono), 'Courier New', monospace"
            : "var(--font-sans), system-ui, sans-serif",
          fontSize: `${editorFontSize}px`,
        }}
      >
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-lg mx-auto max-w-3xl"
        />
      </div>
    </div>
  );
}
