"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { BibleProposal } from "@/lib/types";

const STORY_BIBLE_TYPES = [
  { value: "rewrite", label: "Rewrite" },
  { value: "expand", label: "Expand" },
  { value: "fix_typo", label: "Fix Typos" },
  { value: "add_detail", label: "Add Detail" },
  { value: "fetch_info", label: "Fetch Info (Web)" },
  { value: "consistency", label: "Consistency Check" },
];

interface StoryBibleProposalsTabProps {
  projectSlug: string;
  /** Which section: "characters", "events", "environment", "objects" */
  section: string;
  /** The entries array for this section */
  entries: Record<string, unknown>[];
  /** Called with the entry index and the complete new entry to apply */
  onAcceptEntry: (entryIndex: number, updatedEntry: Record<string, unknown>) => void;
}

export default function StoryBibleProposalsTab({
  projectSlug,
  section,
  entries,
  onAcceptEntry,
}: StoryBibleProposalsTabProps) {
  const [proposals, setProposals] = useState<BibleProposal[]>([]);
  const [entryIndex, setEntryIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [proposalType, setProposalType] = useState("rewrite");
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load persisted proposals on mount
  useEffect(() => {
    apiFetch<BibleProposal[]>(
      `/api/projects/${projectSlug}/story-bible/proposals`
    ).then((data) => {
      // Filter to this section
      setProposals(data.filter((p) => p.section === section));
    });
  }, [projectSlug, section]);

  async function requestProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || requesting || entries.length === 0) return;

    setRequesting(true);
    try {
      const result = await apiFetch<{
        section: string;
        entry_index: number;
        current_entry: Record<string, unknown>;
        proposed_entry: Record<string, unknown>;
        proposal_type: string;
      }>(`/api/projects/${projectSlug}/story-bible/propose`, {
        method: "POST",
        body: JSON.stringify({
          section,
          entry_index: entryIndex,
          instruction: instruction.trim(),
          proposal_type: proposalType,
        }),
      });

      // Persist the proposal to the backend
      const saved = await apiFetch<BibleProposal>(
        `/api/projects/${projectSlug}/story-bible/proposals`,
        {
          method: "POST",
          body: JSON.stringify({
            section: result.section,
            entry_index: result.entry_index,
            current_entry: result.current_entry,
            proposed_entry: result.proposed_entry,
            proposal_type: result.proposal_type,
            source_label: instruction.trim().slice(0, 40),
          }),
        }
      );

      setProposals((prev) => [...prev, saved]);
      setInstruction("");
      setShowForm(false);
    } finally {
      setRequesting(false);
    }
  }

  async function handleAccept(proposal: BibleProposal) {
    onAcceptEntry(proposal.entry_index, proposal.proposed_entry);
    // Update status on backend
    const updated = await apiFetch<BibleProposal>(
      `/api/projects/${projectSlug}/story-bible/proposals/${proposal.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "accepted" }) }
    );
    setProposals((prev) => prev.map((p) => (p.id === proposal.id ? updated : p)));
  }

  async function handleReject(proposal: BibleProposal) {
    const updated = await apiFetch<BibleProposal>(
      `/api/projects/${projectSlug}/story-bible/proposals/${proposal.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "declined" }) }
    );
    setProposals((prev) => prev.map((p) => (p.id === proposal.id ? updated : p)));
  }

  function renderEntryDiff(current: Record<string, unknown>, proposed: Record<string, unknown>) {
    const allKeys = new Set([...Object.keys(current), ...Object.keys(proposed)]);
    const changes: { key: string; from: string; to: string }[] = [];
    for (const key of allKeys) {
      const fromVal = JSON.stringify(current[key] ?? "");
      const toVal = JSON.stringify(proposed[key] ?? "");
      if (fromVal !== toVal) {
        changes.push({
          key,
          from: typeof current[key] === "object" ? fromVal : String(current[key] ?? ""),
          to: typeof proposed[key] === "object" ? toVal : String(proposed[key] ?? ""),
        });
      }
    }

    if (changes.length === 0) {
      return <p className="text-xs italic text-slate-500">No changes detected</p>;
    }

    return (
      <div className="space-y-2">
        {changes.map((c) => (
          <div key={c.key} className="rounded-lg border border-slate-600 bg-slate-900 p-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {c.key.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-red-400 line-through">{c.from}</div>
            <div className="mt-1 text-xs text-green-400">{c.to}</div>
          </div>
        ))}
      </div>
    );
  }

  const entryNames = entries.map(
    (e, i) => (e.name as string) || `Entry ${i + 1}`
  );

  const pending = proposals.filter((p) => p.status === "pending");
  const history = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="flex h-full flex-col">
      {/* Request form */}
      <div className="border-b border-slate-700/50 p-3">
        {showForm ? (
          <form onSubmit={requestProposal}>
            {/* Target entry selector */}
            {entries.length > 0 && (
              <select
                value={entryIndex}
                onChange={(e) => setEntryIndex(Number(e.target.value))}
                className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {entryNames.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            )}
            {/* Proposal type */}
            <select
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              {STORY_BIBLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <textarea
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe what you want changed..."
              rows={2}
              disabled={requesting}
              className="mb-2 w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={requesting || !instruction.trim() || entries.length === 0}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {requesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {proposalType === "fetch_info" ? "Searching..." : "Generating..."}
                  </span>
                ) : (
                  "Generate Proposal"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setInstruction(""); }}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.05]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            disabled={entries.length === 0}
            className="w-full rounded-lg border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-400 transition hover:border-indigo-500/50 hover:text-indigo-400 disabled:opacity-50"
          >
            {entries.length === 0 ? "Add an entry first" : "+ Request Proposal"}
          </button>
        )}
      </div>

      {/* Proposals list */}
      <div className="flex-1 overflow-y-auto p-3">
        {pending.length === 0 && history.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-sm text-slate-500">No pending proposals</p>
            <p className="mt-1 text-xs text-slate-600">
              Select an entry and request a proposal
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                    {STORY_BIBLE_TYPES.find((t) => t.value === p.proposal_type)?.label || p.proposal_type}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(p.current_entry.name as string) || `Entry ${p.entry_index + 1}`}
                  </span>
                </div>
                {renderEntryDiff(p.current_entry, p.proposed_entry)}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAccept(p)}
                    className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(p)}
                    className="flex-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/[0.07]"
                  >
                    Reject
                  </button>
                </div>
              </div>
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
                    {history.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 opacity-60"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              p.status === "accepted"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="truncate text-xs text-slate-500">
                            {p.source_label}
                          </span>
                          <span className="text-xs text-slate-600">
                            {(p.current_entry.name as string) || `Entry ${p.entry_index + 1}`}
                          </span>
                        </div>
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
