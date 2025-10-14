import React from "react";
import BaseChatInterface from "@/components/chat/BaseChatInterface";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { createChatService } from "@/services/chatService";

const UserChat: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
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

  const chatService = createChatService();

  const handleSignOut = async () => {
    try {
      await signout();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/auth/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast({ 
        title: "Sign out", 
        description: "Sign out completed.",
      });
      navigate("/auth/login");
    }
  };

  return (
    <BaseChatInterface
      chatService={chatService}
      user={user}
      isAuthenticated={isAuthenticated}
      loading={loading}
      savedPrompts={authSavedPrompts || []}
      refreshSavedPrompts={refreshSavedPrompts}
      onSignOut={handleSignOut}
      headerTitle="User Chat"
      defaultModel="gemma:2b"
    />
  );
};

export default UserChat;