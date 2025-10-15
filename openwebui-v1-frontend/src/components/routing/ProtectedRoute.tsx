import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useOnboardingStatus } from "@/hooks/useOnboarding";
import { isAdminAuthenticated } from "@/services/adminAuth";
import { CircleLoader } from "@/components/ui/loader";

/**
 * Protects private routes. If user not authenticated and auth loading finished,
 * redirect to /auth/login. Also checks onboarding status for regular users.
 * Now supports both regular user auth and unified admin auth.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  
  // Check authentication for both user and admin
  const isUserAuth = isAuthenticated;
  const isAdminAuth = isAdminAuthenticated();
  const isAuthenticated_Any = isUserAuth || isAdminAuth;
  
  // Check user type to determine authentication type
  const isAdminRoute = location.pathname.includes('/org-admin');
  
  // For admin routes, only check admin authentication
  if (isAdminRoute && !isAdminAuth) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // For user routes, check user authentication and avoid onboarding calls for admins
  const shouldCheckOnboarding = isUserAuth && user && !isAdminAuth;
  const { 
    configStatus, 
    loading: onboardingLoading, 
    needsOnboarding 
  } = useOnboardingStatus(shouldCheckOnboarding ? user?.id : undefined);

  // Show loading while checking auth or onboarding
  if (loading || (shouldCheckOnboarding && onboardingLoading)) {
    return <CircleLoader fullscreen label="Authorizing session..." showLabel />;
  }
  
  // Redirect to login if not authenticated (unless it's an admin route and admin is authenticated)
  if (!isAuthenticated_Any) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // Redirect to onboarding if user needs it (skip for onboarding page itself)
  if (shouldCheckOnboarding && needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  // Redirect away from onboarding if already completed
  if (location.pathname === '/onboarding' && configStatus?.completed) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default ProtectedRoute;