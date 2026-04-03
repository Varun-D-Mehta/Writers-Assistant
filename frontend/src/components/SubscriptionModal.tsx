"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/constants";

interface SubscriptionModalProps {
  onClose?: () => void;
}

export default function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: "monthly" | "annual") {
    setLoading(plan);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-md rounded-2xl border p-8 shadow-2xl"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-2) 100%)",
        }}
      >
        <h2 className="text-xl font-bold text-slate-100">Your free trial has ended</h2>
        <p className="mt-2 text-sm text-slate-400">
          Subscribe to continue using Writers Assistant with all AI-powered features.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleSubscribe("monthly")}
            disabled={loading !== null}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading === "monthly" ? "Redirecting..." : "Monthly — $9.99/mo"}
          </button>
          <button
            onClick={() => handleSubscribe("annual")}
            disabled={loading !== null}
            className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-50"
            style={{ borderColor: "var(--border-strong)" }}
          >
            {loading === "annual" ? "Redirecting..." : "Annual — $89.99/yr (save 25%)"}
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-400"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}
