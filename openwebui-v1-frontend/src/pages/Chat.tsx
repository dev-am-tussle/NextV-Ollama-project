import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserType } from "@/services/unifiedAuth";
import UserChat from "./UserChat";

/**
 * Legacy Chat component - redirects to user chat interface
 * This maintains backward compatibility 
 */
const Chat: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check user type from localStorage and redirect accordingly
    const userType = getCurrentUserType();
    
    if (userType === 'user') {
      // Redirect regular users to user chat interface
      navigate('/user/chat', { replace: true });
    } else {
      // Use default user chat for all users
      // This maintains backward compatibility
    }
  }, [navigate]);

  // Fallback to UserChat
  return <UserChat />;
};

export default Chat;