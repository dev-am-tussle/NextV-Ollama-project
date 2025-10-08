import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { isAuthenticated as isUnifiedAuthenticated } from "@/services/unifiedAuth";
import { CircleLoader } from "@/components/ui/loader";

/**
 * Protects private routes. If user not authenticated and auth loading finished,
 * redirect to /auth/login. While loading, you can return a minimal placeholder.
 * Now supports both regular user auth and unified admin auth.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  // Check both regular auth and unified auth (for admin)
  const isUserAuthenticated = isAuthenticated || isUnifiedAuthenticated();

  if (loading) {
    return <CircleLoader fullscreen label="Authorizing session..." showLabel />;
  }
  
  if (!isUserAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;