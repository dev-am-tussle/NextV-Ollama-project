import React from 'react';
import AdminChatPage from '@/pages/AdminChat';

interface AdminChatProps {
  onBack?: () => void;
}

// Thin wrapper to keep org admin module self-contained in imports
export const AdminChat: React.FC<AdminChatProps> = ({ onBack }) => {
  return <AdminChatPage onBack={onBack} />;
};

export default AdminChat;
