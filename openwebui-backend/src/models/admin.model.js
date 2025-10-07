import mongoose from "mongoose";

// Admin Settings Schema
const AdminSettingsSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    theme: { type: String, default: "light" },
    notifications_enabled: { type: Boolean, default: true },
    email_notifications: { type: Boolean, default: true },
    dashboard_preferences: {
      default_view: { type: String, default: "overview" },
      widgets_enabled: [{ type: String }],
      refresh_interval: { type: Number, default: 30 }, // seconds
    },
    // Admin-specific permissions
    permissions: {
      manage_users: { type: Boolean, default: true },
      manage_models: { type: Boolean, default: true },
      manage_organizations: { type: Boolean, default: false }, // only for super admin
      view_analytics: { type: Boolean, default: true },
      system_settings: { type: Boolean, default: false }, // only for super admin
    },
    // Organization-specific settings (if admin belongs to org)
    organization_settings: {
      default_user_models: [{ type: String }], // default models for new employees
      max_users_allowed: { type: Number, default: 10 },
      usage_limits: {
        monthly_requests: { type: Number, default: 10000 },
        concurrent_users: { type: Number, default: 5 },
      },
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

AdminSettingsSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

AdminSettingsSchema.index({ admin_id: 1 });

// Admin Schema
const AdminSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    role: {
      type: String,
      required: true,
      default: 'org_admin',
      index: true
    },
    // Admin type for flexible role management
    admin_type: {
      type: String,
      enum: ['super_admin', 'org_admin'],
      required: true,
      default: 'org_admin',
      index: true
    },
    password_hash: { 
      type: String, 
      required: true 
    },
    // Organization reference (null for super_admin, required for org_admin)
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true
    },
    // Admin status and verification
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true
    },
    email_verified: { 
      type: Boolean, 
      default: false 
    },
    email_verification_token: { 
      type: String, 
      default: null 
    },
    // Login and security
    last_login: { 
      type: Date, 
      default: null 
    },
    login_attempts: { 
      type: Number, 
      default: 0 
    },
    locked_until: { 
      type: Date, 
      default: null 
    },
    // Password reset
    password_reset_token: { 
      type: String, 
      default: null 
    },
    password_reset_expires: { 
      type: Date, 
      default: null 
    },
    // Two-factor authentication
    two_factor_enabled: { 
      type: Boolean, 
      default: false 
    },
    two_factor_secret: { 
      type: String, 
      default: null 
    },
    // Admin profile and contact
    profile: {
      phone: { type: String, default: null },
      department: { type: String, default: null },
      job_title: { type: String, default: null },
      avatar_url: { type: String, default: null },
    },
    // Settings reference
    settings_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminSettings",
      default: null,
    },
    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null // null for super admin, set for org_admin created by super admin
    },
    created_at: { 
      type: Date, 
      default: Date.now,
      index: true 
    },
    updated_at: { 
      type: Date, 
      default: Date.now 
    },
    // Soft delete
    deleted_at: { 
      type: Date, 
      default: null 
    },
  },
  {
    versionKey: false,
  }
);

// Indexes for performance
AdminSchema.index({ email: 1, deleted_at: 1 });
AdminSchema.index({ admin_type: 1, status: 1 });
AdminSchema.index({ organization_id: 1, admin_type: 1 });
AdminSchema.index({ created_at: -1 });

// Virtual for checking if admin is locked
AdminSchema.virtual('isLocked').get(function() {
  return !!(this.locked_until && this.locked_until > Date.now());
});

// Pre-save middleware
AdminSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Instance methods
AdminSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.locked_until && this.locked_until < Date.now()) {
    return this.updateOne({
      $unset: { locked_until: 1 },
      $set: { login_attempts: 1 }
    });
  }
  
  const updates = { $inc: { login_attempts: 1 } };
  
  // If we have reached max attempts and it's not locked already, lock the account
  if (this.login_attempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { locked_until: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

AdminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { login_attempts: 1, locked_until: 1 }
  });
};

// Static methods
AdminSchema.statics.findActiveByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    status: 'active',
    deleted_at: null 
  });
};

AdminSchema.statics.findByOrganization = function(orgId) {
  return this.find({ 
    organization_id: orgId,
    status: 'active',
    deleted_at: null 
  }).populate('settings_id');
};

// Helper function to create admin with default settings
async function createAdminWithDefaults(adminData) {
  const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
  const AdminSettings = mongoose.models.AdminSettings || mongoose.model("AdminSettings", AdminSettingsSchema);

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Create admin
    const admin = await Admin.create([adminData], { session });
    
    // Create default settings
    const defaultPermissions = adminData.admin_type === 'super_admin' ? {
      manage_users: true,
      manage_models: true,
      manage_organizations: true,
      view_analytics: true,
      system_settings: true,
    } : {
      manage_users: true,
      manage_models: true,
      manage_organizations: false,
      view_analytics: true,
      system_settings: false,
    };

    const settings = await AdminSettings.create([{
      admin_id: admin[0]._id,
      permissions: defaultPermissions,
    }], { session });

    // Link settings back to admin
    await Admin.updateOne(
      { _id: admin[0]._id },
      { $set: { settings_id: settings[0]._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    
    return { admin: admin[0], settings: settings[0] };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export const AdminSettings = mongoose.models.AdminSettings || mongoose.model("AdminSettings", AdminSettingsSchema);
export const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
export { createAdminWithDefaults };
