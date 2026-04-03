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
    // Find a unique default key
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
    <div className="space-y-4">
      {environment.map((env, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700 bg-[var(--surface-2)] p-4"
        >
          <div className="mb-3 flex items-start justify-between">
            <input
              value={env.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Environment / Setting name"
              className="bg-transparent text-lg font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => remove(i)}
              className="text-xs text-slate-500 hover:text-red-400"
            >
              Remove
            </button>
          </div>
          <textarea
            value={env.description}
            onChange={(e) => update(i, "description", e.target.value)}
            placeholder="Description (rules, geography, physics, magic system, etc.)..."
            rows={4}
            className="w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />

          {/* Details key-value editor */}
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Details
              </span>
              <button
                onClick={() => addDetail(i)}
                className="text-xs text-indigo-400 hover:text-blue-300"
              >
                + Add Detail
              </button>
            </div>
            {Object.keys(env.details).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(env.details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <input
                      value={key}
                      onChange={(e) => updateDetailKey(i, key, e.target.value)}
                      placeholder="Key"
                      className="w-1/3 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      value={value}
                      onChange={(e) =>
                        updateDetailValue(i, key, e.target.value)
                      }
                      placeholder="Value"
                      className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeDetail(i, key)}
                      className="shrink-0 rounded px-1.5 py-1.5 text-xs text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-600">
                No details yet — add key-value pairs like &quot;Climate&quot;,
                &quot;Population&quot;, etc.
              </p>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={addEnvironment}
        className="w-full rounded-xl border-2 border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400"
      >
        + Add Environment / Setting
      </button>
    </div>
  );
}
