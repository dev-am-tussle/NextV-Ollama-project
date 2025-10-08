import { 
  listConversations as userListConversations,
  createConversation as userCreateConversation,
  getMessages as userGetMessages,
  postMessage as userPostMessage,
  deleteConversation as userDeleteConversation,
} from "@/services/conversation";

import {
  createSavedPrompt as userCreateSavedPrompt,
  deleteSavedPrompt as userDeleteSavedPrompt,
  updateSavedPrompt as userUpdateSavedPrompt,
} from "@/services/savedPrompts";

import { 
  listAdminConversations,
  createAdminConversation,
  getAdminMessages,
  postAdminMessage,
  deleteAdminConversation,
  createAdminSavedPrompt,
  deleteAdminSavedPrompt,
  updateAdminSavedPrompt,
} from "@/services/adminConversation";

export type UserType = 'user' | 'admin';

export interface ChatServiceInterface {
  listConversations: (limit?: number) => Promise<any>;
  createConversation: (data: any) => Promise<any>;
  getMessages: (conversationId: string, limit?: number) => Promise<any>;
  postMessage: (conversationId: string, data: any) => Promise<any>;
  deleteConversation: (conversationId: string) => Promise<any>;
  createSavedPrompt: (title: string, content: string) => Promise<any>;
  deleteSavedPrompt: (id: string) => Promise<any>;
  updateSavedPrompt: (id: string, data: any) => Promise<any>;
}

class UserChatService implements ChatServiceInterface {
  async listConversations(limit?: number) {
    return userListConversations(limit);
  }

  async createConversation(data: any) {
    return userCreateConversation(data);
  }

  async getMessages(conversationId: string, limit?: number) {
    return userGetMessages(conversationId, limit);
  }

  async postMessage(conversationId: string, data: any) {
    return userPostMessage(conversationId, data);
  }

  async deleteConversation(conversationId: string) {
    return userDeleteConversation(conversationId);
  }

  async createSavedPrompt(title: string, content: string) {
    return userCreateSavedPrompt(title, content);
  }

  async deleteSavedPrompt(id: string) {
    return userDeleteSavedPrompt(id);
  }

  async updateSavedPrompt(id: string, data: any) {
    return userUpdateSavedPrompt(id, data);
  }
}

class AdminChatService implements ChatServiceInterface {
  async listConversations(limit?: number) {
    return listAdminConversations(limit);
  }

  async createConversation(data: any) {
    return createAdminConversation(data);
  }

  async getMessages(conversationId: string, limit?: number) {
    return getAdminMessages(conversationId, limit);
  }

  async postMessage(conversationId: string, data: any) {
    return postAdminMessage(conversationId, data);
  }

  async deleteConversation(conversationId: string) {
    return deleteAdminConversation(conversationId);
  }

  async createSavedPrompt(title: string, content: string) {
    return createAdminSavedPrompt(title, content);
  }

  async deleteSavedPrompt(id: string) {
    return deleteAdminSavedPrompt(id);
  }

  async updateSavedPrompt(id: string, data: any) {
    return updateAdminSavedPrompt(id, data);
  }
}

export const createChatService = (userType: UserType): ChatServiceInterface => {
  switch (userType) {
    case 'admin':
      return new AdminChatService();
    case 'user':
    default:
      return new UserChatService();
  }
};

// Helper function to get model suggestions based on user type
export const getModelSuggestions = (modelName: string, userType: UserType) => {
  const lowerName = modelName.toLowerCase();
  
  if (userType === 'admin') {
    if (lowerName.includes('gemma')) {
      return {
        intro: "Gemma for administrative tasks & data analysis.",
        suggestions: [
          "Generate organization reports",
          "Analyze user engagement metrics",
          "Create admin documentation"
        ]
      };
    } else if (lowerName.includes('phi')) {
      return {
        intro: "Phi for quick admin scripts & automation.",
        suggestions: [
          "Write user management scripts",
          "Create automated workflows",
          "Generate SQL queries for reports"
        ]
      };
    } else {
      return {
        intro: "This model is optimized for administrative workflows.",
        suggestions: [
          "Help with organization management",
          "Generate admin reports",
          "Analyze system metrics"
        ]
      };
    }
  } else {
    // User suggestions
    if (lowerName.includes('gemma')) {
      return {
        intro: "Gemma excels at reasoning & structured generation.",
        suggestions: [
          "Explain this algorithm step by step",
          "Help me learn new concepts",
          "Write creative content"
        ]
      };
    } else if (lowerName.includes('phi')) {
      return {
        intro: "Phi is lightweight and great for quick iterative coding tasks.",
        suggestions: [
          "Create a simple Express route",
          "Debug this code snippet",
          "Write unit tests"
        ]
      };
    } else {
      return {
        intro: "This model is great for general AI tasks.",
        suggestions: [
          "Help me with coding",
          "Explain this concept",
          "Write documentation"
        ]
      };
    }
  }
};