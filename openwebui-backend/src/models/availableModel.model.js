import mongoose from "mongoose";

const AvailableModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    display_name: { type: String },
    description: { type: String },
    owner_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

AvailableModelSchema.index({ name: 1 });

export const AvailableModel =
  mongoose.models.AvailableModel ||
  mongoose.model("AvailableModel", AvailableModelSchema);
