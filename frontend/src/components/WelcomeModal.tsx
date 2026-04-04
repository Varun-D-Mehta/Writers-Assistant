"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "wa_welcome_shown";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => setShow(true), 500);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border p-10 text-center shadow-2xl"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-2) 100%)",
        }}
      >
        <span className="text-4xl">✒️</span>
        <h2 className="mt-4 text-2xl font-bold text-slate-100">
          Welcome to Writers Assistant!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          This is your AI-powered creative writing workspace. Here&apos;s how to get started:
        </p>

        <div className="mt-6 space-y-3 text-left">
          {[
            { step: "1", title: "Create a project", desc: "Click \"New Project\" and give your novel a name." },
            { step: "2", title: "Build your story bible", desc: "Add characters, events, environments, and objects. The AI uses this to understand your world." },
            { step: "3", title: "Add parts & chapters", desc: "Organize your manuscript into parts, then create chapters to start writing." },
            { step: "4", title: "Write with AI", desc: "Use the editor, AI chat, smart ideas, and context checking — all in one workspace." },
            { step: "5", title: "Export before leaving", desc: "Your data is session-based. Always export as PDF or TXT before closing the tab!" },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
        >
          Got it — let&apos;s start!
        </button>
      </div>
    </div>
  );
}
