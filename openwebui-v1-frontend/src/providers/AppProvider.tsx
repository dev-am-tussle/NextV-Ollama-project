import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type Theme = "light" | "dark" | "system";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AppContextType {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signout: () => void;

  // UI State
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  reducedMotion: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "system";
  });

  // Auth state - mock for now
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // UI state
  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem("compactMode") === "true";
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Theme management
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Reduced motion detection
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Mock auth functions
  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call Supabase
    console.log("[v0] Mock login:", email);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

    setUser({ id: "1", email, name: email.split("@")[0] });
    setIsAuthenticated(true);
    navigate("/");
  };

  const signup = async (email: string, password: string) => {
    // Mock signup - in real app, this would call Supabase
    console.log("[v0] Mock signup:", email);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

    setUser({ id: "1", email, name: email.split("@")[0] });
    setIsAuthenticated(true);
    navigate("/");
  };

  const signout = () => {
    setUser(null);
    setIsAuthenticated(false);
    navigate("/home");
  };
  // Persist UI settings
  useEffect(() => {
    localStorage.setItem("compactMode", compactMode.toString());
  }, [compactMode]);

  const value: AppContextType = {
    theme,
    setTheme,
    user,
    isAuthenticated,
    login,
    signup,
    signout,
    compactMode,
    setCompactMode,
    reducedMotion,
    sidebarOpen,
    setSidebarOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
