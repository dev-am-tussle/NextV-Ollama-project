import apiFetch from "@/lib/api";

export interface Conversation {
  _id: string;
  title: string;
  user_id?: string;
  updated_at?: string;
}

export interface Message {
  _id?: string;
  sender: "user" | "model";
  text: string;
  created_at?: string;
}

export async function listConversations(limit = 50) {
  return apiFetch(`conversations?limit=${limit}`);
}

export async function createConversation(title?: string) {
  return apiFetch(`conversations`, { method: "POST", body: { title } as any });
}

export async function getMessages(conversationId: string, limit = 100) {
  return apiFetch(`conversations/${conversationId}/messages?limit=${limit}`);
}

export async function postMessage(
  conversationId: string,
  content: string,
  model?: string
) {
  return apiFetch(`conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content, model } as any,
  });
}

export async function deleteConversation(conversationId: string) {
  return apiFetch(`conversations/${conversationId}`, {
    method: "DELETE",
  });
}
