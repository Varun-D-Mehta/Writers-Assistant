"use client";

import { useEffect, useState } from "react";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:9000";

interface UserData {
  name: string;
  email: string;
  profile_pic: string;
  subscription_status: string;
  plan: string;
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${GATEWAY_URL}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe(plan: "monthly" | "annual") {
    setActionLoading(plan);
    try {
      const res = await fetch(`${GATEWAY_URL}/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.subscription_id && data.razorpay_key) {
        openRazorpay({
          key: data.razorpay_key,
          subscription_id: data.subscription_id,
          name: data.name,
          description: data.description,
          prefill: data.prefill,
          theme: { color: "#d4af37" },
          handler: () => window.location.reload(),
          modal: { ondismiss: () => setActionLoading(null) },
        });
      }
    } catch {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll retain access until the end of your billing period.")) return;
    setActionLoading("cancel");
    try {
      await fetch(`${GATEWAY_URL}/subscribe/cancel`, {
        method: "POST",
        credentials: "include",
      });
      window.location.reload();
    } catch {
      setActionLoading(null);
    }
  }

  function openRazorpay(options: Record<string, unknown>) {
    if (window.Razorpay) {
      new window.Razorpay(options).open();
    } else {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => new window.Razorpay(options).open();
      document.body.appendChild(script);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center">
        <div>
          <p style={{ color: "var(--text-body)" }}>Please sign in to manage your subscription.</p>
          <a
            href={`${GATEWAY_URL}/auth/google`}
            className="mt-4 inline-block rounded-xl px-8 py-3 text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }}
          >
            Sign in with Google
          </a>
        </div>
      </div>
    );
  }

  const isActive = user.subscription_status === "active";
  const isTrial = user.subscription_status === "trial";
  const isExpired = ["expired", "trial_expired"].includes(user.subscription_status);
  const isCancelled = user.subscription_status === "cancelled";
  const trialDaysLeft = user.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(user.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl" style={{ color: "var(--gold)" }}>✒️</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}>
            Writers Assistant
          </span>
        </a>
        <a href="/pricing" className="text-sm transition hover:text-white" style={{ color: "var(--text-muted)" }}>
          Pricing
        </a>
      </nav>

      <div className="mx-auto max-w-2xl px-6 pb-20 pt-8">
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}
        >
          Subscription
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Manage your Writers Assistant plan
        </p>

        {/* Current status card */}
        <div
          className="mt-8 rounded-2xl border p-6"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div className="flex items-center gap-4">
            {user.profile_pic && (
              <img src={user.profile_pic} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
            )}
            <div>
              <p className="font-medium" style={{ color: "var(--text-bright)" }}>{user.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>Status</p>
              <p className={`mt-1 text-sm font-medium ${
                isActive ? "text-green-400" : isTrial ? "text-amber-400" : isCancelled ? "text-orange-400" : "text-red-400"
              }`}>
                {isActive ? "Active" : isTrial ? `Trial (${trialDaysLeft}d left)` : isCancelled ? "Cancelled" : "Expired"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>Plan</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-body)" }}>
                {user.plan === "annual" ? "Annual" : user.plan === "monthly" ? "Monthly" : "Free Trial"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
                {isTrial ? "Trial Ends" : isCancelled ? "Access Until" : "Next Billing"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-body)" }}>
                {isTrial ? formatDate(user.trial_expires_at) : formatDate(user.subscription_expires_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Subscribe actions */}
        {(isTrial || isExpired) && (
          <div className="mt-10">
            <h2
              className="text-xl"
              style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}
            >
              Choose a Plan
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={actionLoading !== null}
                className="feature-card rounded-2xl border p-6 text-left transition disabled:opacity-50"
                style={{ borderColor: "var(--border-glow)", background: "linear-gradient(180deg, var(--bg-card) 0%, rgba(212, 175, 55, 0.03) 100%)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>Monthly</p>
                <p className="mt-2 text-3xl font-light" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}>
                  ₹799<span className="text-sm" style={{ color: "var(--text-muted)" }}>/mo</span>
                </p>
                <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Cancel anytime</p>
              </button>
              <button
                onClick={() => handleSubscribe("annual")}
                disabled={actionLoading !== null}
                className="feature-card rounded-2xl border p-6 text-left transition disabled:opacity-50"
                style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>Annual</p>
                <p className="mt-2 text-3xl font-light" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}>
                  ₹6,999<span className="text-sm" style={{ color: "var(--text-muted)" }}>/yr</span>
                </p>
                <p className="mt-2 text-xs text-green-400">Save 27%</p>
              </button>
            </div>
          </div>
        )}

        {/* Cancel / resubscribe */}
        {isActive && (
          <div className="mt-10">
            <button
              onClick={handleCancel}
              disabled={actionLoading !== null}
              className="rounded-xl border px-6 py-3 text-sm transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel Subscription"}
            </button>
          </div>
        )}

        {isCancelled && (
          <div className="mt-10">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your subscription is cancelled. Access continues until {formatDate(user.subscription_expires_at)}.
            </p>
            <button
              onClick={() => handleSubscribe(user.plan === "annual" ? "annual" : "monthly")}
              className="mt-3 rounded-xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }}
            >
              Resubscribe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
