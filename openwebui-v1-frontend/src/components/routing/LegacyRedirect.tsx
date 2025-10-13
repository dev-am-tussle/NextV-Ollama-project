import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserType, getStoredAdminProfile, getStoredUserProfile } from "@/services/unifiedAuth";

/**
 * LegacyRedirect component for root path "/"
 * Redirects users to their organization-based routes
 * - Admins: /:orgSlug/org-admin
 * - Users: /:orgSlug/org-user
 */
const LegacyRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userType = getCurrentUserType();
    
    if (userType === 'admin') {
      // Get admin's organization slug
      const adminProfile = getStoredAdminProfile();
      const orgSlug = adminProfile?.organization?.slug;
      
      if (orgSlug) {
        navigate(`/${orgSlug}/org-admin`, { replace: true });
      } else {
        // Fallback if no organization slug found
        navigate('/auth/login', { replace: true });
      }
    } else if (userType === 'user') {
      // Get user's organization slug
      const userProfile = getStoredUserProfile();
      const orgSlug = userProfile?.organization?.slug;
      
      if (orgSlug) {
        navigate(`/${orgSlug}/org-user`, { replace: true });
      } else {
        // Fallback if no organization slug found
        navigate('/auth/login', { replace: true });
      }
    } else {
      // No valid user type, redirect to login
      navigate('/auth/login', { replace: true });
    }
  }, [navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to your organization...</p>
      </div>
    </div>
  );
};

export default LegacyRedirect;