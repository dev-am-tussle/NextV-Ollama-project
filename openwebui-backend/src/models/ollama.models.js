import mongoose from "mongoose";

// Conversation Schema
const ConversationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Keep updated_at fresh on any save/update
ConversationSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Useful indexes
ConversationSchema.index({ user_id: 1, updated_at: -1 });
// Optional text search on title (future search feature)
ConversationSchema.index({ title: "text" });

// Message Schema
const MessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "model"],
      required: true,
      index: true,
    },
    text: { type: String, required: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Compound index to efficiently paginate messages per conversation
MessageSchema.index({ conversation_id: 1, created_at: 1, _id: 1 });
// Export Message only from this file (Conversation moved to its own model file)
export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
