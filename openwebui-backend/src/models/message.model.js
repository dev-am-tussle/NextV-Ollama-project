import mongoose from "mongoose";

// Enhanced Message Schema to support streaming, status, model metadata
const MessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "model"],
      required: true,
      index: true,
    },
    // Original prompt (only for user messages or for model debugging)
    prompt: { type: String, required: false, trim: true },
    // Accumulated final text (for model messages) or user message text
    text: { type: String, default: "", trim: true },
    // Optional streaming chunk array (joined into text when finalized)
    chunks: { type: [String], default: [] },
    model: { type: String, required: false, index: true },
    status: {
      type: String,
      enum: ["pending", "streaming", "done", "error"],
      default: "pending",
      index: true,
    },
    error: { type: String, required: false },
    usage: {
      prompt_tokens: { type: Number, required: false },
      completion_tokens: { type: Number, required: false },
      total_tokens: { type: Number, required: false },
    },
    meta: { type: mongoose.Schema.Types.Mixed, required: false },
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

MessageSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Conversation pagination + chronological ordering
MessageSchema.index({ conversation_id: 1, created_at: 1, _id: 1 });
// Fast fetch model messages still streaming
MessageSchema.index({ conversation_id: 1, status: 1 });

export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
