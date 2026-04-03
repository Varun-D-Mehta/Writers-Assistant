"use client";

import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import ChatTab from "./ChatTab";
import ContextCheckTab from "./ContextCheckTab";
import ProposalsTab from "./ProposalsTab";
import { useProposalStore } from "@/stores/useProposalStore";

type Tab = "chat" | "context" | "proposals";

interface SidePanelProps {
  projectSlug: string;
  partSlug: string;
  chapterSlug: string;
  editor: Editor | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  rewriteRequest?: string | null;
  onRewriteHandled?: () => void;
}

export default function SidePanel({
  projectSlug,
  partSlug,
  chapterSlug,
  editor,
  collapsed,
  onToggleCollapse,
  rewriteRequest,
  onRewriteHandled,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const proposals = useProposalStore((s) => s.proposals);

  // Switch to proposals tab when a rewrite is requested from the editor
  useEffect(() => {
    if (rewriteRequest) {
      setActiveTab("proposals");
    }
  }, [rewriteRequest]);

  const pendingCount = proposals.filter((p) => p.status === "pending").length;

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center gap-3 border-l pt-3 surface-1" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onToggleCollapse}
          className="rounded p-1.5 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
          title="Expand panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => { onToggleCollapse(); setActiveTab("chat"); }}
          className="rounded p-1.5 text-slate-500 transition hover:bg-white/[0.05]"
          title="Chat"
        >
          💬
        </button>
        <button
          onClick={() => { onToggleCollapse(); setActiveTab("context"); }}
          className="rounded p-1.5 text-slate-500 transition hover:bg-white/[0.05]"
          title="Context Check"
        >
          🔍
        </button>
        <button
          onClick={() => { onToggleCollapse(); setActiveTab("proposals"); }}
          className="relative rounded p-1.5 text-slate-500 transition hover:bg-white/[0.05]"
          title="Proposals"
        >
          📝
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "chat", label: "Chat", icon: "💬" },
    { key: "context", label: "Context Check", icon: "🔍" },
    { key: "proposals", label: "Proposals", icon: "📝" },
  ];

  return (
    <div className="flex h-full flex-col border-l surface-1" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-2.5 text-xs font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-indigo-400 text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            {tab.key === "proposals" && pendingCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          className="px-2 py-2 text-slate-500 transition hover:text-slate-300"
          title="Collapse panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <ChatTab projectSlug={projectSlug} partSlug={partSlug} chapterSlug={chapterSlug} editor={editor} />
        )}
        {activeTab === "context" && (
          <ContextCheckTab projectSlug={projectSlug} partSlug={partSlug} chapterSlug={chapterSlug} editor={editor} onSwitchToProposals={() => setActiveTab("proposals")} />
        )}
        {activeTab === "proposals" && (
          <ProposalsTab projectSlug={projectSlug} partSlug={partSlug} chapterSlug={chapterSlug} editor={editor} rewriteRequest={rewriteRequest} onRewriteHandled={onRewriteHandled} />
        )}
      </div>
    </div>
  );
}
