import mongoose from "mongoose";

const AvailableModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // exact ollama model name (e.g. "gemma:2b")
    display_name: { type: String, required: true }, // user-friendly name (e.g. "Gemma 2B")
    description: { type: String, required: true }, // model capabilities/description
    size: { type: String, required: true }, // model size (e.g. "1.4GB", "2.8GB")
    category: { type: String, default: "general" }, // general, coding, math, creative, etc.
    tags: [{ type: String }], // ["lightweight", "fast", "coding", "reasoning"]
    is_active: { type: Boolean, default: true }, // admin can enable/disable model
    provider: { type: String, default: "ollama" }, // ollama, openai, etc (future expansion)
    model_family: { type: String }, // "gemma", "phi", "llama", etc.
    parameters: { type: String }, // "2B", "7B", "13B" parameter count
    use_cases: [{ type: String }], // ["chat", "coding", "creative-writing", "analysis"]
    performance_tier: { type: String, enum: ["fast", "balanced", "powerful"], default: "balanced" },
    min_ram_gb: { type: Number }, // minimum RAM requirement
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

AvailableModelSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const AvailableModel =
  mongoose.models.AvailableModel ||
  mongoose.model("AvailableModel", AvailableModelSchema);
