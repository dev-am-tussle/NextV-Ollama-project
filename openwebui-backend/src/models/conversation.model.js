import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    last_seq: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

ConversationSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

ConversationSchema.index({ user_id: 1, updated_at: -1 });
ConversationSchema.index({ title: "text" });

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
