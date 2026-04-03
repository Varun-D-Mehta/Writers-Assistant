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
  const { doc, schema } = editor.state;

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

  // Normalize whitespace for fuzzy matching
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

  // Try exact match first
  let index = fullText.indexOf(original);

  // Fuzzy fallback: normalize whitespace
  if (index === -1) {
    const normOriginal = normalize(original);
    const normFull = normalize(fullText);
    const normIndex = normFull.indexOf(normOriginal);
    if (normIndex !== -1) {
      // Map normalized index back to original text position
      let normCount = 0;
      let realIndex = 0;
      const fullTrimmed = fullText.replace(/^\s+/, "");
      const leadingSpaces = fullText.length - fullTrimmed.length;
      realIndex = leadingSpaces;

      for (let i = leadingSpaces; i < fullText.length && normCount < normIndex; i++) {
        if (fullText[i] === " " || fullText[i] === "\n" || fullText[i] === "\t") {
          // Skip consecutive whitespace
          while (i + 1 < fullText.length && /\s/.test(fullText[i + 1])) i++;
        }
        normCount++;
        realIndex = i + 1;
      }

      // Find end position similarly
      let normEndCount = 0;
      let realEnd = realIndex;
      for (let i = realIndex; i < fullText.length && normEndCount < normOriginal.length; i++) {
        if (/\s/.test(fullText[i])) {
          while (i + 1 < fullText.length && /\s/.test(fullText[i + 1])) i++;
          normEndCount++; // counts as one space in normalized
        } else {
          normEndCount++;
        }
        realEnd = i + 1;
      }

      // Use the real positions for the match
      index = realIndex;
      const matchedOriginal = fullText.slice(realIndex, realEnd);
      // Re-verify
      if (normalize(matchedOriginal) !== normOriginal) {
        index = -1;
      } else {
        // Proceed with realIndex and realEnd
        const from = posMap[realIndex];
        const to = posMap[realEnd - 1] + 1;
        if (from === undefined || from === -1 || to === undefined) return false;

        const { tr } = editor.state;
        const nodes = createParagraphNodes(schema, replacement);
        tr.replaceWith(from, to, nodes);
        editor.view.dispatch(tr);
        return true;
      }
    }
  }

  if (index === -1) {
    // Last resort: if original covers >80% of the doc, replace entire content
    if (normalize(original).length > normalize(fullText).length * 0.8) {
      const nodes = createParagraphNodes(schema, replacement);
      const { tr } = editor.state;
      tr.replaceWith(0, doc.content.size, nodes);
      editor.view.dispatch(tr);
      return true;
    }
    return false;
  }

  // Map flat text offsets to ProseMirror positions
  const from = posMap[index];
  const endIdx = index + original.length - 1;
  const to = posMap[endIdx] + 1;

  if (from === undefined || from === -1 || to === undefined) return false;

  const { tr } = editor.state;
  const nodes = createParagraphNodes(schema, replacement);
  tr.replaceWith(from, to, nodes);
  editor.view.dispatch(tr);

  return true;
}

/**
 * Split replacement text on newlines and create proper paragraph nodes
 * so multi-paragraph replacements preserve document structure.
 */
function createParagraphNodes(schema: Editor["state"]["schema"], text: string) {
  const lines = text.split("\n");

  // Single line — return plain text node
  if (lines.length === 1) {
    return schema.text(text);
  }

  // Multiple lines — create paragraph nodes
  return lines
    .filter((line) => line.length > 0)
    .map((line) => schema.nodes.paragraph.create(null, schema.text(line)));
}

export default function ProposalsTab({
  projectSlug,
  partSlug,
  chapterSlug,
  editor,
  rewriteRequest,
  onRewriteHandled,
}: ProposalsTabProps) {
  const { proposals, loadProposals, updateProposalStatus, addProposal } = useProposalStore();
  const [instruction, setInstruction] = useState("");
  const [proposalType, setProposalType] = useState("rewrite");
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
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

    await updateProposalStatus(projectSlug, partSlug, chapterSlug, proposalId, "accepted");
  }

  async function handleReject(proposalId: string) {
    await updateProposalStatus(projectSlug, partSlug, chapterSlug, proposalId, "declined");
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

  const pending = proposals.filter((p) => p.status === "pending");
  const history = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="flex h-full flex-col">
      {/* Request Proposal */}
      <div className="border-b border-slate-700/50 p-3">
        {showForm ? (
          <form onSubmit={requestProposal}>
            <select
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              {CHAPTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {selectedText && (
              <div className="mb-2 rounded-lg border border-indigo-500/30 bg-indigo-500/8 p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-indigo-400">
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
              className="mb-2 w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={requesting || !instruction.trim()}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
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
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.05]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-400 transition hover:border-indigo-500/50 hover:text-indigo-400"
          >
            + Request Proposal
          </button>
        )}
      </div>

      {/* Proposals list */}
      <div className="flex-1 overflow-y-auto p-3">
        {pending.length === 0 && history.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-sm text-slate-500">No pending proposals</p>
            <p className="mt-1 text-xs text-slate-600">
              Request a proposal above, or use chat suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((proposal) => (
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

            {/* History toggle */}
            {history.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.05]"
                >
                  {showHistory ? "Hide" : "Show"} History ({history.length})
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {history.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 opacity-60"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              proposal.status === "accepted"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {proposal.status}
                          </span>
                          <span className="truncate text-xs text-slate-500">
                            {proposal.source_label}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-500">
                          {proposal.proposed_text.slice(0, 120)}
                          {proposal.proposed_text.length > 120 ? "..." : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
