import mongoose from "mongoose";

// User Settings Schema
const UserSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    theme: { type: String, default: "light" },
    default_model: { type: String, default: "gemma:2b" },
    saved_prompts_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavedPrompt",
      default: null,
    },
    saved_files_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileMeta",
      default: null,
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

UserSettingsSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

UserSettingsSchema.index({ user_id: 1 });

// User Schema
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // password_hash is optional to allow OAuth-only accounts
    password_hash: { type: String, required: false },
    // support multiple external auth providers (e.g. microsoft)
    auth_providers: [
      {
        provider: { type: String }, // e.g. 'microsoft'
        provider_id: { type: String }, // sub or oid from provider
        profile: { type: Object }, // raw profile data
        linked_at: { type: Date, default: Date.now },
      },
    ],
    // flag useful when provider verified email (or after email confirmation)
    email_verified: { type: Boolean, default: false },
    settings_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSettings",
      default: null,
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

// Secondary index for creation date queries (e.g., admin dashboards)
UserSchema.index({ created_at: -1 });

UserSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Helper: create user + default settings
async function createUserWithDefaults(userData) {
  const User = mongoose.models.User || mongoose.model("User", UserSchema);
  const UserSettings =
    mongoose.models.UserSettings ||
    mongoose.model("UserSettings", UserSettingsSchema);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.create([userData], { session });
    const settings = await UserSettings.create(
      [
        {
          user_id: user[0]._id,
        },
      ],
      { session }
    );

    // link settings back to user
    await User.updateOne(
      { _id: user[0]._id },
      { $set: { settings_id: settings[0]._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return { user: user[0], settings: settings[0] };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export const UserSettings =
  mongoose.models.UserSettings ||
  mongoose.model("UserSettings", UserSettingsSchema);
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export { createUserWithDefaults };
