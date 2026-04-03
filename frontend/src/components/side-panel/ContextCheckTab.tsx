"use client";

import type { Editor } from "@tiptap/react";
import { useContextCheckStore } from "@/stores/useContextCheckStore";
import { useIdeaStore } from "@/stores/useIdeaStore";
import { apiFetch } from "@/lib/api";
import type { ContextIssue } from "@/lib/types";
import IssueCard from "./IssueCard";

interface ContextCheckTabProps {
  projectSlug: string;
  partSlug: string;
  chapterSlug: string;
  editor: Editor | null;
  onSwitchToIdeas: () => void;
}

function highlightQuoteInEditor(editor: Editor, quote: string) {
  editor.chain().selectAll().unsetHighlight().run();

  const doc = editor.state.doc;
  let found = false;

  doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) return;
    const idx = node.text.indexOf(quote);
    if (idx !== -1) {
      const from = pos + idx;
      const to = from + quote.length;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setHighlight({ color: "#854d0e" })
        .run();

      const domNode = editor.view.domAtPos(from);
      if (domNode.node instanceof HTMLElement) {
        domNode.node.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (domNode.node.parentElement) {
        domNode.node.parentElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      found = true;
    }
  });
}

export default function ContextCheckTab({
  projectSlug,
  partSlug,
  chapterSlug,
  editor,
  onSwitchToIdeas,
}: ContextCheckTabProps) {
  const { issues, isChecking, runCheck } = useContextCheckStore();
  const { addIdea } = useIdeaStore();

  function handleQuoteClick(quote: string) {
    if (!editor) return;
    highlightQuoteInEditor(editor, quote);
  }

  async function handleAutoFix(issue: ContextIssue) {
    if (!editor) return;

    const chapterText = editor.state.doc.textBetween(
      0,
      editor.state.doc.content.size,
      "\n"
    );

    const result = await apiFetch<{ original: string; fixed: string }>(
      "/api/fix",
      {
        method: "POST",
        body: JSON.stringify({
          project_slug: projectSlug,
          issue,
          chapter_content: chapterText,
        }),
      }
    );

    await addIdea(projectSlug, partSlug, chapterSlug, {
      source: "context-check",
      source_label: `Fix: ${issue.title}`,
      original_text: result.original,
      proposed_text: result.fixed,
    });

    onSwitchToIdeas();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-700/50 p-3">
        <button
          onClick={() => runCheck(projectSlug, partSlug, chapterSlug)}
          disabled={isChecking}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isChecking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Checking...
            </span>
          ) : (
            "Run Context Check"
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {issues.length === 0 && !isChecking ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-500">
              Click &ldquo;Run Context Check&rdquo; to analyze your chapter
              against the story bible
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onQuoteClick={handleQuoteClick}
                onAutoFix={handleAutoFix}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
