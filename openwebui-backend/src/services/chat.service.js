import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

export async function createConversation(userId, title) {
  return Conversation.create({
    user_id: userId,
    title: title || "New Chat",
  });
}

export async function getConversation(conversationId, userId) {
  return Conversation.findOne({ _id: conversationId, user_id: userId });
}

export async function listConversations(userId, limit = 20) {
  return Conversation.find({ user_id: userId })
    .sort({ updated_at: -1 })
    .limit(limit)
    .lean();
}

export async function addUserMessage(conversationId, text) {
  return Message.create({
    conversation_id: conversationId,
    sender: "user",
    text,
    status: "done",
  });
}

export async function createModelMessage(conversationId) {
  return Message.create({
    conversation_id: conversationId,
    sender: "model",
    text: "",
    status: "streaming",
  });
}

// Simple append method for streaming chunks
export async function appendToModelMessage(messageId, chunk) {
  if (!chunk) return;
  // push chunk into chunks array (atomic)
  await Message.updateOne(
    { _id: messageId },
    { $push: { chunks: chunk }, $set: { updated_at: new Date() } }
  );
}

export async function finalizeConversationTouch(conversationId) {
  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { updated_at: new Date() } }
  );
}

export async function getMessages(conversationId, userId, limit = 50) {
  // Verify user owns the conversation first
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) return null;
  const messages = await Message.find({ conversation_id: conversationId })
    .sort({ created_at: 1 })
    .limit(limit)
    .lean();
  // If any model messages still have chunks, merge them virtually for output
  return messages.map((m) => {
    if (m.sender === "model" && m.chunks && m.chunks.length) {
      return { ...m, text: (m.text || "") + m.chunks.join("") };
    }
    return m;
  });
}
