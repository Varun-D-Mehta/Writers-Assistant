import { API_BASE } from "./constants";

export class SubscriptionRequiredError extends Error {
  code: string;
  constructor(code: string) {
    super("Subscription required");
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (data.code === "trial_expired" || data.code === "expired") {
      throw new SubscriptionRequiredError(data.code);
    }
  }

  if (res.status === 401) {
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}
