"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { StoryBible, StoryEvent } from "@/lib/types";
import EventsTimeline from "@/components/story-bible/EventsTimeline";
import StoryBibleSidePanel from "@/components/side-panel/StoryBibleSidePanel";

export default function EventsPage() {
  const params = useParams<{ projectSlug: string }>();
  const [bible, setBible] = useState<StoryBible | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    apiFetch<StoryBible>(`/api/projects/${params.projectSlug}/story-bible`).then(setBible);
  }, [params.projectSlug]);

  async function saveBible(updated: StoryBible) {
    setSaving(true);
    setBible(updated);
    try {
      await apiFetch(`/api/projects/${params.projectSlug}/story-bible`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleAcceptEntry(entryIndex: number, updatedEntry: Record<string, unknown>) {
    if (!bible) return;
    const updated = [...bible.events];
    updated[entryIndex] = updatedEntry as unknown as StoryEvent;
    saveBible({ ...bible, events: updated });
  }

  if (!bible)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );

  return (
    <div className="flex h-full">
      <div className={`overflow-y-auto p-6 transition-all ${panelCollapsed ? "flex-1" : "w-[65%]"}`}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-100">Events Timeline</h2>
            <span className="text-xs text-slate-500">{saving ? "Saving..." : ""}</span>
          </div>
          <EventsTimeline
            events={bible.events}
            onChange={(events) => saveBible({ ...bible, events })}
          />
        </div>
      </div>
      <div className={`overflow-hidden transition-all ${panelCollapsed ? "w-12" : "w-[35%]"}`}>
        <StoryBibleSidePanel
          projectSlug={params.projectSlug}
          section="events"
          entries={bible.events as unknown as Record<string, unknown>[]}
          onAcceptEntry={handleAcceptEntry}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
        />
      </div>
    </div>
  );
}
