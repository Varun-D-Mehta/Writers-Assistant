"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "@/lib/constants";

export interface User {
  user_id: string;
  email: string;
  name: string;
  profile_pic: string;
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  trial_expires_at: string | null;
  plan: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const user = await res.json();
          setState({ user, loading: false, error: null });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      })
      .catch(() => {
        setState({ user: null, loading: false, error: "Failed to check auth" });
      });
  }, []);

  return state;
}

export function getLoginUrl() {
  return `${API_BASE}/auth/google`;
}

export function getLogoutUrl() {
  return `${API_BASE}/auth/logout`;
}
