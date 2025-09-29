import mongoose from "mongoose";

const SavedPromptSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    prompt: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

SavedPromptSchema.index({ user_id: 1, created_at: -1 });

export const SavedPrompt =
  mongoose.models.SavedPrompt ||
  mongoose.model("SavedPrompt", SavedPromptSchema);
