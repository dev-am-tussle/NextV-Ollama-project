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

export async function deleteConversation(conversationId, userId) {
  // First verify ownership
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user_id: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // Delete all messages associated with this conversation
  await Message.deleteMany({ conversation_id: conversationId });

  // Delete the conversation itself
  await Conversation.deleteOne({ _id: conversationId, user_id: userId });

  return { success: true, deletedId: conversationId };
}

export async function addUserMessage(conversationId, text, userId) {
  return Message.create({
    conversation_id: conversationId,
    user_id: userId || null,
    sender: "user",
    text,
    status: "done",
  });
}

export async function createModelMessage(conversationId, modelName, modelDisplayName) {
  return Message.create({
    conversation_id: conversationId,
    sender: "model",
    model: modelName || null,
    model_name: modelDisplayName || modelName || null,
    text: "",
    chunks: [],
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

export async function finalizeModelMessage(messageId) {
  const m = await Message.findById(messageId);
  if (!m) return null;
  // Merge chunks into text
  const finalText = (m.text || "") + (m.chunks ? m.chunks.join("") : "");
  m.text = finalText;
  m.chunks = [];
  m.status = "done";
  m.updated_at = new Date();
  await m.save();
  return m;
}

export async function markModelMessageError(messageId, errorMsg) {
  await Message.updateOne(
    { _id: messageId },
    { $set: { status: "error", error: errorMsg, updated_at: new Date() } }
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
