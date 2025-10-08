import React from 'react';
import AdminChatPage from '@/pages/AdminChat';

// Thin wrapper to keep org admin module self-contained in imports
export const AdminChat: React.FC = () => {
  return <AdminChatPage />;
};

export default AdminChat;
