"use client";

import { useState } from "react";
import StoryBibleChat from "./StoryBibleChat";
import StoryBibleIdeasTab from "./StoryBibleIdeasTab";

type Tab = "chat" | "ideas";

interface StoryBibleSidePanelProps {
  projectSlug: string;
  /** Which section: "characters", "events", "environment", "objects" */
  section: string;
  /** The entries array for this section */
  entries: Record<string, unknown>[];
  /** Called with entry index and the complete updated entry */
  onAcceptEntry: (entryIndex: number, updatedEntry: Record<string, unknown>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function StoryBibleSidePanel({
  projectSlug,
  section,
  entries,
  onAcceptEntry,
  collapsed,
  onToggleCollapse,
}: StoryBibleSidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center gap-3 border-l border-slate-700/50 bg-slate-900 pt-3">
        <button
          onClick={onToggleCollapse}
          className="rounded p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
          title="Expand panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={() => { onToggleCollapse(); setActiveTab("chat"); }} className="rounded p-1.5 text-slate-500 hover:bg-white/[0.05]" title="Chat">💬</button>
        <button onClick={() => { onToggleCollapse(); setActiveTab("ideas"); }} className="rounded p-1.5 text-slate-500 hover:bg-white/[0.05]" title="Ideas">📝</button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "chat", label: "Chat", icon: "💬" },
    { key: "ideas", label: "Ideas", icon: "📝" },
  ];

  return (
    <div className="flex h-full flex-col border-l border-slate-700/50 bg-slate-900">
      <div className="flex items-center border-b border-slate-700/50 bg-slate-900">
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
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          className="px-2 py-2 text-slate-500 hover:text-slate-300"
          title="Collapse panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && <StoryBibleChat projectSlug={projectSlug} />}
        {activeTab === "ideas" && (
          <StoryBibleIdeasTab
            projectSlug={projectSlug}
            section={section}
            entries={entries}
            onAcceptEntry={onAcceptEntry}
          />
        )}
      </div>
    </div>
  );
}
