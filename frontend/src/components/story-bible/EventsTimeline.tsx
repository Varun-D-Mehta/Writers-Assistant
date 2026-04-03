"use client";

import type { StoryEvent } from "@/lib/types";

export default function EventsTimeline({
  events,
  onChange,
}: {
  events: StoryEvent[];
  onChange: (e: StoryEvent[]) => void;
}) {
  function addEvent() {
    onChange([...events, { name: "", description: "", chapter_refs: [] }]);
  }

  function update(
    index: number,
    field: keyof StoryEvent,
    value: string | string[]
  ) {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function remove(index: number) {
    onChange(events.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const updated = [...events];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  }

  function moveDown(index: number) {
    if (index === events.length - 1) return;
    const updated = [...events];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  }

  return (
    <div>
      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        {events.length > 0 && (
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-blue-500/60 via-blue-500/30 to-transparent" />
        )}

        <div className="space-y-0">
          {events.map((event, i) => (
            <div key={i} className="relative flex gap-4 pb-6">
              {/* Timeline node */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500/50 bg-slate-900 text-sm font-bold text-indigo-400 shadow-lg shadow-blue-500/10">
                  {i + 1}
                </div>
              </div>

              {/* Event card */}
              <div className="flex-1 rounded-xl border border-slate-700 bg-[var(--surface-2)] p-4">
                <div className="mb-2 flex items-start justify-between">
                  <input
                    value={event.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder="Event name"
                    className="flex-1 bg-transparent text-base font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="rounded p-1 text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === events.length - 1}
                      className="rounded p-1 text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => remove(i)}
                      className="rounded p-1 text-slate-500 hover:bg-white/[0.07] hover:text-red-400"
                      title="Remove"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <textarea
                  value={event.description}
                  onChange={(e) => update(i, "description", e.target.value)}
                  placeholder="What happens in this event..."
                  rows={2}
                  className="mb-2 w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <input
                  value={event.chapter_refs.join(", ")}
                  onChange={(e) =>
                    update(
                      i,
                      "chapter_refs",
                      e.target.value
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="Related chapters (comma-separated)"
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add event button */}
      <button
        onClick={addEvent}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Event
      </button>
    </div>
  );
}
