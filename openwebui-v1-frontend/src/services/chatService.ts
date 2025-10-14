import { 
  listConversations,
  createConversation,
  getMessages,
  postMessage,
  deleteConversation,
} from "@/services/conversation";

import {
  createSavedPrompt,
  deleteSavedPrompt,
  updateSavedPrompt,
} from "@/services/savedPrompts";

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
    return listConversations(limit);
  }

  async createConversation(data: any) {
    return createConversation(data);
  }

  async getMessages(conversationId: string, limit?: number) {
    return getMessages(conversationId, limit);
  }

  async postMessage(conversationId: string, data: any) {
    return postMessage(conversationId, data);
  }

  async deleteConversation(conversationId: string) {
    return deleteConversation(conversationId);
  }

  async createSavedPrompt(title: string, content: string) {
    return createSavedPrompt(title, content);
  }

  async deleteSavedPrompt(id: string) {
    return deleteSavedPrompt(id);
  }

  async updateSavedPrompt(id: string, data: any) {
    return updateSavedPrompt(id, data);
  }
}

export const createChatService = (): ChatServiceInterface => {
  return new UserChatService();
};

// Helper function to get model suggestions
export const getModelSuggestions = (modelName: string) => {
  const lowerName = modelName.toLowerCase();
  
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
};