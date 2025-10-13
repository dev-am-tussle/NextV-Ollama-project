import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserType } from "@/services/unifiedAuth";
import UserChat from "./UserChat";

/**
 * Legacy Chat component - redirects to appropriate chat interface based on user type
 * This maintains backward compatibility while enabling separate user/admin experiences
 */
const Chat: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check user type from localStorage and redirect accordingly
    const userType = getCurrentUserType();
    
    if (userType === 'admin') {
      // Redirect admin users to admin chat interface
      navigate('/admin/chat', { replace: true });
    } else if (userType === 'user') {
      // Redirect regular users to user chat interface
      navigate('/user/chat', { replace: true });
    } else {
      // No user type detected, use default user chat
      // This maintains backward compatibility
    }
  }, [navigate]);

  // Fallback to UserChat if no redirect happens
  return <UserChat />;
};

export default Chat;