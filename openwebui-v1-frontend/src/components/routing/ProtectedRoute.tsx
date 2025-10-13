import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useOnboardingStatus } from "@/hooks/useOnboarding";
import { isAuthenticated as isUnifiedAuthenticated } from "@/services/unifiedAuth";
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
  
  // Check both regular auth and unified auth (for admin)
  const isUserAuthenticated = isAuthenticated || isUnifiedAuthenticated();
  
  // Check onboarding status for regular users (not admins)
  const shouldCheckOnboarding = isUserAuthenticated && user && !user.role?.includes('admin');
  const { 
    configStatus, 
    loading: onboardingLoading, 
    needsOnboarding 
  } = useOnboardingStatus(shouldCheckOnboarding ? user?.id : undefined);

  // Show loading while checking auth or onboarding
  if (loading || (shouldCheckOnboarding && onboardingLoading)) {
    return <CircleLoader fullscreen label="Authorizing session..." showLabel />;
  }
  
  // Redirect to login if not authenticated
  if (!isUserAuthenticated) {
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