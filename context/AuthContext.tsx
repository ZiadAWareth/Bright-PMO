"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { getTokenExpiryMs, refreshIdpToken, storeRefreshedToken } from "@/lib/idp-refresh";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_BEFORE_MS = 60 * 1000; // refresh 1 min before expiry

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  };

  const scheduleProactiveRefresh = () => {
    clearRefreshTimer();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const expMs = getTokenExpiryMs(token);
    if (!expMs) return;
    const now = Date.now();
    const delay = expMs - now - REFRESH_BEFORE_MS;
    if (delay <= 0) {
      refreshIdpToken().then((newToken) => {
        if (newToken) storeRefreshedToken(newToken).then(scheduleProactiveRefresh);
      });
      return;
    }
    refreshTimeoutRef.current = setTimeout(async () => {
      refreshTimeoutRef.current = null;
      const newToken = await refreshIdpToken();
      if (newToken) {
        await storeRefreshedToken(newToken);
        scheduleProactiveRefresh();
      }
    }, delay);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) scheduleProactiveRefresh();
    setIsLoading(false);
    return clearRefreshTimer;
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    setUser(userData);
    scheduleProactiveRefresh();
  };

  const logout = () => {
    clearRefreshTimer();
    localStorage.removeItem("token");
    localStorage.removeItem("wujha-remember-email");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
