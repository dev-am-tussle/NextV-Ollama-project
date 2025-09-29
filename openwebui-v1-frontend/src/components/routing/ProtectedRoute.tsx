import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Protects private routes. If user not authenticated and auth loading finished,
 * redirect to /auth/login. While loading, you can return a minimal placeholder.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return children;
};

export default ProtectedRoute;