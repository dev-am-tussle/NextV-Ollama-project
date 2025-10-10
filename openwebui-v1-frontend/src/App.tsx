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
import AcceptInvite from "./pages/auth/AcceptInvite";
import UserChat from "./pages/UserChat";
import LegacyRedirect from "@/components/routing/LegacyRedirect";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import SuperAdminProtectedRoute from "@/components/routing/SuperAdminProtectedRoute";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/supadmin/SuperAdmin";
import { initializeBrandingSettings } from "@/services/adminSettings";
import { CircleLoader } from "@/components/ui/loader";
import OrgAdmin from "./pages/admin/OrgAdmin";

// Lazy load SuperAdminLogin
const SuperAdminLogin = lazy(() => import("./pages/supadmin/SuperAdminLogin"));

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  // hide footer on auth pages (login, signup and any /auth/* routes)
  const hideFooter = location.pathname.startsWith("/auth") || location.pathname === "/" || location.pathname.startsWith("/superadmin") || location.pathname.includes("/org-admin") || location.pathname === "/accept-invite";
  // Also hide header on auth pages to avoid any timing issues
  const hideHeader =
    location.pathname.startsWith("/auth") || location.pathname === "/" || location.pathname.startsWith("/superadmin") || location.pathname.includes("/org-admin") || location.pathname === "/accept-invite";

  return (
    <div className="min-h-screen flex flex-col w-full">
      {!hideHeader && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          
          {/* User Chat Route */}
          <Route
            path="/user/chat"
            element={
              <ProtectedRoute>
                <UserChat />
              </ProtectedRoute>
            }
          />
          
          {/* Legacy Chat Route - smart redirect based on user type */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LegacyRedirect />
              </ProtectedRoute>
            }
          />
          
          {/* Organization Admin Route */}
          <Route
            path="/:slug/org-admin"
            element={
              <ProtectedRoute>
                <OrgAdmin />
              </ProtectedRoute>
            }
          />
           
          <Route path="/superadmin/auth/login" element={
            <React.Suspense fallback={<div className="py-10"><CircleLoader label="Loading view" showLabel /></div>}>
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
