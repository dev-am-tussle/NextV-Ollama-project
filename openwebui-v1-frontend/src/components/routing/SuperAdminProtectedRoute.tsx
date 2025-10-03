import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface SuperAdminProtectedRouteProps {
  children: ReactNode;
}

const SuperAdminProtectedRoute = ({ children }: SuperAdminProtectedRouteProps) => {
  const superAdminToken = localStorage.getItem("superAdminToken");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  if (!superAdminToken || !isSuperAdmin) {
    return <Navigate to="/superadmin/auth/login" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;