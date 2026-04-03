"use client";

import type { User } from "@/hooks/useAuth";

export default function TrialBanner({ user }: { user: User }) {
  if (user.subscription_status !== "trial" || !user.trial_expires_at) return null;

  const expiresAt = new Date(user.trial_expires_at);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs"
      style={{
        borderColor: "var(--border)",
        background: daysLeft <= 2
          ? "rgba(239, 68, 68, 0.08)"
          : "rgba(99, 102, 241, 0.06)",
      }}
    >
      <span className={daysLeft <= 2 ? "text-red-400" : "text-indigo-400"}>
        {daysLeft === 1
          ? "Last day of your free trial"
          : `${daysLeft} days left in your free trial`}
      </span>
    </div>
  );
}
