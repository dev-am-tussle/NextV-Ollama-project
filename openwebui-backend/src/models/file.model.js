import mongoose from "mongoose";

const FileMetaSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
      default: null,
    },
    filename: String,
    content_type: String,
    size_bytes: Number,
    storage_url: String,
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

FileMetaSchema.index({ user_id: 1, created_at: -1 });

export const FileMeta =
  mongoose.models.FileMeta || mongoose.model("FileMeta", FileMetaSchema);
