import React from "react";
import BaseChatInterface from "@/components/chat/BaseChatInterface";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createChatService } from "@/services/chatService";
import { 
  getStoredAdminProfile, 
  getStoredOrganization, 
  unifiedLogout,
  isAuthenticated as isUnifiedAuthenticated 
} from "@/services/unifiedAuth";
import { Building2 } from "lucide-react";

const AdminChat: React.FC = () => {
  const {
    isAuthenticated,
    user,
    logout: signout,
    loading,
    savedPrompts: authSavedPrompts,
    refreshSavedPrompts,
  } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const chatService = createChatService('admin');

  // Get admin data from unified auth or fallback to regular auth
  const adminProfile = getStoredAdminProfile();
  const organization = getStoredOrganization();
  const currentUser = adminProfile || user;
  const isAdminAuthenticated = isAuthenticated || isUnifiedAuthenticated();

  // Get admin-specific info
  const adminInfo = {
    organizationName: organization?.name || currentUser?.organization_name || currentUser?.organization?.name || "Organization",
    adminType: adminProfile?.admin_type || currentUser?.admin_type || "org_admin",
    role: adminProfile?.role || currentUser?.role || "admin"
  };

  const handleSignOut = async () => {
    try {
      if (adminProfile) {
        // Admin logged in via unified auth
        await unifiedLogout();
      } else {
        // Regular user logout
        await signout();
      }
      toast({
        title: "Admin Signed out",
        description: "You have been signed out from admin panel.",
      });
      navigate("/auth/login");
    } catch (error) {
      console.error("Admin sign out error:", error);
      toast({ 
        title: "Sign out", 
        description: "Admin sign out completed.",
      });
      navigate("/auth/login");
    }
  };

  const getHeaderTitle = () => {
    if (adminInfo.adminType === 'super_admin') {
      return "Super Admin Chat";
    } else {
      return `${adminInfo.organizationName} - Admin Chat`;
    }
  };

  const getDefaultModel = () => {
    // Admin might prefer different models for administrative tasks
    return "phi:latest"; // Lightweight model for quick admin tasks
  };

  return (
    <div className="relative">
      <BaseChatInterface
        userType="admin"
        chatService={chatService}
        user={currentUser}
        isAuthenticated={isAdminAuthenticated}
        loading={loading}
        savedPrompts={authSavedPrompts || []}
        refreshSavedPrompts={refreshSavedPrompts}
        onSignOut={handleSignOut}
        headerTitle={getHeaderTitle()}
        defaultModel={getDefaultModel()}
      />
    </div>
  );
};

export default AdminChat;