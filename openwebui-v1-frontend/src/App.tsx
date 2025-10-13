import React, { useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import Login from "./pages/auth/Login";
import AcceptInvite from "./pages/auth/AcceptInvite";
import UserChat from "./pages/UserChat";
import OnboardingPage from "./pages/OnboardingPage";
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

  return (
    <div className="min-h-screen flex flex-col w-full">
      <main className="flex-1">
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          
          {/* Onboarding Route */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          
          {/* Chat Route */}
          {/* <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <UserChat />
              </ProtectedRoute>
            }
          /> */}
          
          {/* Organization User Chat Route */}
          <Route
            path="/:slug/org-user"
            element={
              <ProtectedRoute>
                <UserChat />
              </ProtectedRoute>
            }
          />
          
          {/* Legacy Routes - smart redirect to organization-based routes */}
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
