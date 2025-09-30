import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import apiFetch from "@/lib/api";
import * as authService from "@/services/auth";
import { getUserSavedPrompts } from "@/services/savedPrompts";

type User = any;

interface AuthContextType {
  user: User | null;
  stats: any | null;
  savedPrompts?: any[] | null;
  availableModels?: string[] | null;
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
  refreshSavedPrompts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const refreshUser = async () => {
    try {
      // Prefer the login response persisted in localStorage to avoid extra API calls.
      const raw = localStorage.getItem("authProfile");
      if (raw) {
        const me = JSON.parse(raw);
        setUser(me?.user || null);
        setStats(me?.meta || me?.stats || null);
        const settings = me?.settings || me?.user?.settings || null;
        setAvailableModels(settings?.avail_models || null);

        // Load saved prompts from API if user exists
        if (me?.user?.id) {
          try {
            const savedPromptsFromAPI = await getUserSavedPrompts(me.user.id);
            setSavedPrompts(savedPromptsFromAPI);
          } catch (error) {
            console.error("Failed to load saved prompts:", error);
            // fallback to cached prompts
            setSavedPrompts(
              me?.saved_prompts || settings?.saved_prompts || null
            );
          }
        } else {
          setSavedPrompts(null);
        }
      } else {
        // no local profile available => treat as unauthenticated
        setUser(null);
        setSavedPrompts(null);
      }
    } catch (e) {
      setUser(null);
      setSavedPrompts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = authService.getAuthToken();
    if (token) {
      // if user lands on home '/', fetch root '/' which may include profile
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

              // Load saved prompts for authenticated user
              if (body.profile.user?.id) {
                try {
                  const savedPromptsFromAPI = await getUserSavedPrompts(
                    body.profile.user.id
                  );
                  setSavedPrompts(savedPromptsFromAPI);
                } catch (error) {
                  console.error("Failed to load saved prompts on init:", error);
                }
              }

              setLoading(false);
              return;
            }
          } catch (err) {
            console.warn("[AuthProvider] root / fetch failed:", err);
          }
          // fallback to persisted login profile
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
    // After login, prefer the persisted authProfile for user/settings. This
    // avoids races where protected routes navigate before user state is set.
    try {
      const raw = localStorage.getItem("authProfile");
      const me = raw ? JSON.parse(raw) : res;
      setUser(me?.user || null);
      setStats(me?.meta || me?.settings || null);

      const settings = me?.settings || me?.user?.settings || null;
      setAvailableModels(settings?.avail_models || null);

      // Load saved prompts from API after login
      if (me?.user?.id) {
        try {
          const savedPromptsFromAPI = await getUserSavedPrompts(me.user.id);
          setSavedPrompts(savedPromptsFromAPI);
        } catch (error) {
          console.error("Failed to load saved prompts after login:", error);
          // fallback to cached prompts
          setSavedPrompts(
            me?.saved_prompts ||
              me?.settings?.saved_prompts ||
              me?.user?.settings?.saved_prompts ||
              null
          );
        }
      }
    } catch (_) {
      // fall back to any user object returned directly
      setUser(res?.user || null);
    }
    setLoading(false);
    try {
      localStorage.setItem("authJustLoggedIn", "1");
    } catch (_) {}
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

  const refreshSavedPrompts = async () => {
    if (!user?.id) return;
    try {
      const prompts = await getUserSavedPrompts(user.id);
      setSavedPrompts(prompts);
    } catch (error) {
      console.error("Failed to refresh saved prompts:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        savedPrompts,
        availableModels,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
        refreshSavedPrompts,
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
