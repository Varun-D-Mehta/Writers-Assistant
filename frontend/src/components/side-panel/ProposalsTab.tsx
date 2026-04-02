"use client";

import { useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useProposalStore } from "@/stores/useProposalStore";
import { apiFetch } from "@/lib/api";
import ProposalCard from "./ProposalCard";

const CHAPTER_TYPES = [
  { value: "rewrite", label: "Rewrite" },
  { value: "expand", label: "Expand" },
  { value: "fix_typo", label: "Fix Typos" },
  { value: "rephrase", label: "Rephrase" },
  { value: "restructure", label: "Restructure" },
  { value: "add_detail", label: "Add Detail" },
  { value: "fetch_info", label: "Fetch Info (Web)" },
];

interface ProposalsTabProps {
  projectSlug: string;
  partSlug: string;
  chapterSlug: string;
  editor: Editor | null;
  rewriteRequest?: string | null;
  onRewriteHandled?: () => void;
}

function findAndReplace(editor: Editor, original: string, replacement: string): boolean {
  const { doc } = editor.state;

  // Build a position map: for each character in the flat text, store its ProseMirror pos
  const posMap: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        posMap.push(pos + i);
      }
    } else if (node.isBlock && posMap.length > 0) {
      // Block boundaries = newline in textBetween
      posMap.push(-1); // sentinel for newline
    }
  });

  // Build the flat text from the posMap
  const flatChars: string[] = [];
  doc.descendants((node) => {
    if (node.isText && node.text) {
      flatChars.push(...node.text.split(""));
    } else if (node.isBlock && flatChars.length > 0) {
      flatChars.push("\n");
    }
  });
  const fullText = flatChars.join("");

  const index = fullText.indexOf(original);
  if (index === -1) return false;

  // Map flat text offsets to ProseMirror positions
  const from = posMap[index];
  const endIdx = index + original.length - 1;
  const to = posMap[endIdx] + 1;

  if (from === undefined || from === -1 || to === undefined) return false;

  const { tr } = editor.state;
  tr.replaceWith(from, to, editor.state.schema.text(replacement));
  editor.view.dispatch(tr);

  return true;
}

export default function ProposalsTab({
  projectSlug,
  partSlug,
  chapterSlug,
  editor,
  rewriteRequest,
  onRewriteHandled,
}: ProposalsTabProps) {
  const { proposals, loadProposals, removeProposal, addProposal } = useProposalStore();
  const [instruction, setInstruction] = useState("");
  const [proposalType, setProposalType] = useState("rewrite");
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle rewrite requests from the editor toolbar
  useEffect(() => {
    if (rewriteRequest) {
      setSelectedText(rewriteRequest);
      setShowForm(true);
      setInstruction("");
      onRewriteHandled?.();
      // Focus the textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [rewriteRequest, onRewriteHandled]);

  useEffect(() => {
    loadProposals(projectSlug, partSlug, chapterSlug);
  }, [projectSlug, partSlug, chapterSlug, loadProposals]);

  async function handleAccept(proposalId: string, original: string, proposed: string) {
    if (!editor) return;

    const success = findAndReplace(editor, original, proposed);
    if (success) {
      const json = editor.getJSON();
      await apiFetch(
        `/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}`,
        { method: "PUT", body: JSON.stringify(json) }
      );
    }

    await removeProposal(projectSlug, partSlug, chapterSlug, proposalId);
  }

  async function handleReject(proposalId: string) {
    await removeProposal(projectSlug, partSlug, chapterSlug, proposalId);
  }

  async function requestProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || !editor || requesting) return;

    setRequesting(true);
    try {
      const chapterText = editor.state.doc.textBetween(
        0,
        editor.state.doc.content.size,
        "\n"
      );

      // Use pre-selected text or check current selection
      let selText = selectedText;
      if (!selText) {
        const { from, to } = editor.state.selection;
        selText = from !== to ? editor.state.doc.textBetween(from, to) : null;
      }

      const result = await apiFetch<{ original: string; proposed: string }>(
        "/api/propose",
        {
          method: "POST",
          body: JSON.stringify({
            project_slug: projectSlug,
            chapter_content: chapterText,
            instruction: instruction.trim(),
            proposal_type: proposalType,
            selected_text: selText,
          }),
        }
      );

      await addProposal(projectSlug, partSlug, chapterSlug, {
        source: "chat",
        source_label: instruction.trim().slice(0, 40),
        original_text: result.original,
        proposed_text: result.proposed,
      });

      setInstruction("");
      setSelectedText(null);
      setShowForm(false);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Request Proposal */}
      <div className="border-b border-slate-700/50 p-3">
        {showForm ? (
          <form onSubmit={requestProposal}>
            <select
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {CHAPTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {selectedText && (
              <div className="mb-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-blue-400">
                  Selected text
                </div>
                <p className="line-clamp-3 text-xs italic text-slate-300">
                  &ldquo;{selectedText}&rdquo;
                </p>
              </div>
            )}
            <textarea
              ref={textareaRef}
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={
                selectedText
                  ? "How should this text be rewritten?"
                  : "Describe what you want changed..."
              }
              rows={2}
              disabled={requesting}
              className="mb-2 w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={requesting || !instruction.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {requesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {proposalType === "fetch_info" ? "Searching & generating..." : "Generating..."}
                  </span>
                ) : (
                  "Generate Proposal"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setInstruction(""); setSelectedText(null); }}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-400 transition hover:border-blue-500/50 hover:text-blue-400"
          >
            + Request Proposal
          </button>
        )}
      </div>

      {/* Proposals list */}
      <div className="flex-1 overflow-y-auto p-3">
        {proposals.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-sm text-slate-500">No pending proposals</p>
            <p className="mt-1 text-xs text-slate-600">
              Request a proposal above, or use chat suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onAccept={() =>
                  handleAccept(
                    proposal.id,
                    proposal.original_text,
                    proposal.proposed_text
                  )
                }
                onReject={() => handleReject(proposal.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
