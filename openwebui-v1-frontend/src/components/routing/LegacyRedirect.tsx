import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserType } from "@/services/unifiedAuth";

/**
 * LegacyRedirect component for root path "/"
 * Redirects users to appropriate chat interface based on their user type
 */
const LegacyRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userType = getCurrentUserType();
    
    if (userType === 'admin') {
      navigate('/admin/chat', { replace: true });
    } else {
      // Default to user chat for regular users and undefined user types
      navigate('/user/chat', { replace: true });
    }
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