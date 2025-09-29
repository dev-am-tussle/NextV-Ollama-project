import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import apiFetch from "@/lib/api";
import * as authService from "@/services/auth";

type User = any;

interface AuthContextType {
  user: User | null;
  stats: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<any>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const refreshUser = async () => {
    try {
      const me = await authService.me();
      console.log("[AuthProvider] /auth/me response:", me);
      // backend returns { user, stats }
      setUser(me?.user || null);
      setStats(me?.stats || null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = authService.getAuthToken();
    if (token) {
      // if user lands on home '/', fetch root '/' which may include profile
      // otherwise fall back to /auth/me inside refreshUser
      const locationPath = window.location.pathname;
      if (locationPath === "/" || locationPath === "/home") {
        (async () => {
          try {
            const url =
              (import.meta as any).env.VITE_API_URL.replace(/\/$/, "") + "/";
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json();
            console.log("[AuthProvider] root / response:", body);
            if (body?.profile?.user) {
              setUser(body.profile.user);
              setStats(body.profile.stats || null);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.warn("[AuthProvider] root / fetch failed:", err);
          }
          // fallback
          await refreshUser();
        })();
      } else {
        refreshUser();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    const res = await authService.login(payload);
    console.log("[AuthProvider] login response:", res);
    // If the login endpoint returns full user + settings/meta, use it directly
    if (res?.user) {
      setUser((res as any).user);
      // prefer `settings` or `meta` for stats (not declared in AuthResponse)
      setStats((res as any).settings || (res as any).meta || null);
      setLoading(false);
    } else {
      // fallback to calling /auth/me
      await refreshUser();
    }
    return res;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const res = await authService.register(payload);
    console.log("[AuthProvider] register response:", res);
    // registration usually returns minimal info; refresh
    await refreshUser();
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      authService.setAuthToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
