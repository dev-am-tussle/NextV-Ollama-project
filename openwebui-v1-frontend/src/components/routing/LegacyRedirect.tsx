import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserType } from "@/services/unifiedAuth";

/**
 * LegacyRedirect component for root path "/"
 * Redirects all users to user chat interface
 * Admins can access their organization admin panel via /:slug/org-admin
 */
const LegacyRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userType = getCurrentUserType();
    
    // All users (including admins) go to user chat now
    // Admins can access their organization admin panel via /:slug/org-admin
    navigate('/user/chat', { replace: true });
  }, [navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to chat...</p>
      </div>
    </div>
  );
};

export default LegacyRedirect;