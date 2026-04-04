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

  function update(index: number, field: "name" | "description", value: string) {
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
        {events.length > 0 && (
          <div
            className="absolute left-[19px] bottom-6 top-6 w-px"
            style={{ background: "linear-gradient(180deg, rgba(99, 102, 241, 0.4) 0%, transparent 100%)" }}
          />
        )}

        <div className="space-y-3">
          {events.map((event, i) => (
            <div key={i} className="relative flex gap-4 pb-3">
              {/* Timeline node */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold text-indigo-400"
                  style={{ borderColor: "rgba(99, 102, 241, 0.3)", background: "var(--surface-1)" }}
                >
                  {i + 1}
                </div>
              </div>

              {/* Event card */}
              <div
                className="flex-1 rounded-xl border p-5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <input
                    value={event.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder="Event name"
                    className="flex-1 bg-transparent text-base font-semibold text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                  <div className="ml-2 flex items-center gap-0.5">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300 disabled:opacity-20"
                      title="Move up"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === events.length - 1}
                      className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300 disabled:opacity-20"
                      title="Move down"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => remove(i)}
                      className="rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                      title="Remove"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    What happens
                  </label>
                  <textarea
                    value={event.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    placeholder="Describe this event and its significance to the story..."
                    rows={3}
                    className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={addEvent}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm text-slate-500 transition hover:border-indigo-500/30 hover:text-indigo-400"
        style={{ borderColor: "var(--border)" }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Event
      </button>
    </div>
  );
}
