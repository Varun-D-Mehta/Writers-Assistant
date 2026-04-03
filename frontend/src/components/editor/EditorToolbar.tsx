"use client";

import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor | null;
  onRequestRewrite?: (selectedText: string) => void;
}

export default function EditorToolbar({ editor, onRequestRewrite }: EditorToolbarProps) {
  const [hasSelection, setHasSelection] = useState(false);

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
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={btnClass(editor.isActive("heading", { level: 2 }))}
        title="Heading"
      >
        H2
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
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

      {/* Suggest Rewrite — appears when text is selected */}
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
    </div>
  );
}
