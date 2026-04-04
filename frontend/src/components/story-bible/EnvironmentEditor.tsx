"use client";

import type { Environment } from "@/lib/types";

export default function EnvironmentEditor({
  environment,
  onChange,
}: {
  environment: Environment[];
  onChange: (e: Environment[]) => void;
}) {
  function addEnvironment() {
    onChange([...environment, { name: "", description: "", details: {} }]);
  }

  function update(
    index: number,
    field: keyof Environment,
    value: string | Record<string, string>
  ) {
    const updated = [...environment];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function remove(index: number) {
    onChange(environment.filter((_, i) => i !== index));
  }

  function updateDetailKey(envIndex: number, oldKey: string, newKey: string) {
    const details = { ...environment[envIndex].details };
    const value = details[oldKey];
    delete details[oldKey];
    details[newKey] = value;
    update(envIndex, "details", details);
  }

  function updateDetailValue(envIndex: number, key: string, value: string) {
    const details = { ...environment[envIndex].details };
    details[key] = value;
    update(envIndex, "details", details);
  }

  function addDetail(envIndex: number) {
    const details = { ...environment[envIndex].details };
    let key = "New Detail";
    let n = 1;
    while (key in details) {
      key = `New Detail ${n++}`;
    }
    details[key] = "";
    update(envIndex, "details", details);
  }

  function removeDetail(envIndex: number, key: string) {
    const details = { ...environment[envIndex].details };
    delete details[key];
    update(envIndex, "details", details);
  }

  return (
    <div className="space-y-5">
      {environment.map((env, i) => (
        <div
          key={i}
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <input
              value={env.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Setting / Location name"
              className="bg-transparent text-lg font-semibold text-slate-100 placeholder-slate-600 focus:outline-none"
            />
            <button
              onClick={() => remove(i)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
            >
              Remove
            </button>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Description
              </label>
              <textarea
                value={env.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Geography, atmosphere, rules, history..."
                rows={4}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>

            {/* Details key-value editor */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Details
                </label>
                <button
                  onClick={() => addDetail(i)}
                  className="text-xs text-indigo-400 transition hover:text-indigo-300"
                >
                  + Add Detail
                </button>
              </div>
              {Object.keys(env.details).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(env.details).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        value={key}
                        onChange={(e) => updateDetailKey(i, key, e.target.value)}
                        placeholder="Key"
                        className="w-1/3 rounded-lg border px-2.5 py-2 text-xs font-medium text-slate-300 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                      />
                      <input
                        value={value}
                        onChange={(e) => updateDetailValue(i, key, e.target.value)}
                        placeholder="Value"
                        className="flex-1 rounded-lg border px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                      />
                      <button
                        onClick={() => removeDetail(i, key)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-slate-600">
                  Add key-value pairs like Climate, Population, etc.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addEnvironment}
        className="w-full rounded-xl border-2 border-dashed py-4 text-sm text-slate-500 transition hover:border-indigo-500/30 hover:text-indigo-400"
        style={{ borderColor: "var(--border)" }}
      >
        + Add Setting / Location
      </button>
    </div>
  );
}
