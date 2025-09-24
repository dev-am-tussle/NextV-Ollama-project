import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "@/services/auth";

type User = any;

interface AuthContextType {
  user: User | null;
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
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const refreshUser = async () => {
    try {
      const me = await authService.me();
      setUser(me || null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = authService.getAuthToken();
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    const res = await authService.login(payload);
    await refreshUser();
    return res;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const res = await authService.register(payload);
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
