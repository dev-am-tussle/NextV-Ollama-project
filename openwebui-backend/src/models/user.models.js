import mongoose from "mongoose";

// User Settings Schema
const UserSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    theme: { type: String, default: "light" },
    default_model: { type: String, default: "gemma:2b" },
    // User's available models from organization
    available_models: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "AvailableModel"
    }],
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
    // User role for access control
    role: {
      type: String,
      default: 'user',
      index: true
    },
    // Organization reference for employees
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true
    },
    // Employee-specific fields
    employee_details: {
      department: { type: String, default: null },
      job_title: { type: String, default: null },
      employee_id: { type: String, default: null },
      manager_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      // Admin settings reference for hierarchy and permissions
      admin_settings_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminSettings",
        default: null
      },
      // Current invitation reference
      current_invitation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invitation",
        default: null
      }
    },
    // User status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'active',
      index: true
    },
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
// Additional indexes for role-based queries
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ organization_id: 1, role: 1 });
UserSchema.index({ organization_id: 1, status: 1 });

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
