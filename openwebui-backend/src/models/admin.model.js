import mongoose from "mongoose";

// Admin Schema (AdminSettings is in separate file)
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
  });
};

// Helper function to create admin with default settings
async function createAdminWithDefaults(adminData) {
  const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
  // Import AdminSettings from the dedicated file
  const { AdminSettings } = await import("./adminSettings.model.js");

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Create admin first
    const admin = await Admin.create([adminData], { session });
    
    // Create corresponding settings in AdminSettings collection
    const settings = await AdminSettings.create([{
      admin_id: admin[0]._id,
      // Default permissions based on admin type
      permissions: adminData.admin_type === 'super_admin' ? {
        can_invite_users: true,
        can_remove_users: true,
        can_modify_user_roles: true,
        can_view_all_users: true,
        can_manage_models: true,
        can_assign_models: true,
        can_view_model_usage: true,
        can_modify_org_settings: true,
        can_view_org_analytics: true,
        can_manage_departments: true,
        can_create_sub_admins: true,
        can_manage_invitations: true,
        can_export_data: true
      } : {
        can_invite_users: true,
        can_remove_users: true,
        can_modify_user_roles: false,
        can_view_all_users: true,
        can_manage_models: false,
        can_assign_models: true,
        can_view_model_usage: true,
        can_modify_org_settings: false,
        can_view_org_analytics: true,
        can_manage_departments: true,
        can_create_sub_admins: false,
        can_manage_invitations: true,
        can_export_data: false
      }
    }], { session });

    await session.commitTransaction();
    session.endSession();
    
    return { admin: admin[0], settings: settings[0] };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
export { createAdminWithDefaults };
