import React, { useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Chat from "./pages/Chat";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import SuperAdminProtectedRoute from "@/components/routing/SuperAdminProtectedRoute";
import NotFound from "./pages/NotFound";
import { Admin } from "./pages/admin/Admin";
import SuperAdmin from "./pages/supadmin/SuperAdmin";
import { initializeBrandingSettings } from "@/services/adminSettings";

// Lazy load SuperAdminLogin
const SuperAdminLogin = lazy(() => import("./pages/supadmin/SuperAdminLogin"));

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  // hide footer on auth pages (login, signup and any /auth/* routes)
  const hideFooter = location.pathname.startsWith("/auth") || location.pathname === "/" || location.pathname.startsWith("/admin") || location.pathname.startsWith("/superadmin");
  // Also hide header on auth pages to avoid any timing issues
  const hideHeader =
    location.pathname.startsWith("/auth") || location.pathname === "/" || location.pathname.startsWith("/admin") || location.pathname.startsWith("/superadmin");

  return (
    <div className="min-h-screen flex flex-col w-full">
      {!hideHeader && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          
          <Route path="/superadmin/auth/login" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <SuperAdminLogin />
            </React.Suspense>
          } />
          <Route
            path="/superadmin/*"
            element={
              <SuperAdminProtectedRoute>
                <SuperAdmin />
              </SuperAdminProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

const App = () => {
  // Initialize branding settings on app startup
  useEffect(() => {
    initializeBrandingSettings();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>
          <AuthProvider>
            <TooltipProvider>
              <AppContent />
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </AuthProvider>
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
