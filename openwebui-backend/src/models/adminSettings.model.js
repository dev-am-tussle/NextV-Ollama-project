import mongoose from "mongoose";

// Admin Settings Schema for managing organizational hierarchy and permissions
const AdminSettingsSchema = new mongoose.Schema(
  {
    // Admin reference
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true
    },
    
    // Organization reference
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    
    // Hierarchy and permissions
    permissions: {
      // User management permissions
      can_invite_users: { type: Boolean, default: true },
      can_remove_users: { type: Boolean, default: true },
      can_modify_user_roles: { type: Boolean, default: false },
      can_view_all_users: { type: Boolean, default: true },
      
      // Model management permissions
      can_manage_models: { type: Boolean, default: false },
      can_assign_models: { type: Boolean, default: true },
      can_view_model_usage: { type: Boolean, default: true },
      
      // Organization permissions
      can_modify_org_settings: { type: Boolean, default: false },
      can_view_org_analytics: { type: Boolean, default: true },
      can_manage_departments: { type: Boolean, default: true },
      
      // Advanced permissions
      can_create_sub_admins: { type: Boolean, default: false },
      can_manage_invitations: { type: Boolean, default: true },
      can_export_data: { type: Boolean, default: false }
    },
    
    // Hierarchy management
    hierarchy: {
      // Which departments this admin can manage
      managed_departments: [{ type: String }],
      
      // Which users this admin can directly manage (by user IDs)
      managed_user_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }],
      
      // Reporting structure
      reports_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null
      },
      
      // Sub-admins under this admin
      sub_admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin"
      }],
      
      // Maximum number of users this admin can invite
      max_invitations: { type: Number, default: 50 },
      current_invitations_count: { type: Number, default: 0 }
    },
    
    // Settings and preferences
    settings: {
      // Email notification preferences
      email_notifications: {
        new_user_registration: { type: Boolean, default: true },
        invitation_accepted: { type: Boolean, default: true },
        monthly_analytics: { type: Boolean, default: true },
        system_alerts: { type: Boolean, default: true }
      },
      
      // Dashboard preferences
      dashboard_preferences: {
        default_view: { 
          type: String, 
          enum: ['users', 'analytics', 'models', 'invitations'], 
          default: 'users' 
        },
        show_quick_stats: { type: Boolean, default: true },
        auto_refresh_interval: { type: Number, default: 30000 } // milliseconds
      },
      
      // Security settings
      security: {
        require_2fa: { type: Boolean, default: false },
        session_timeout: { type: Number, default: 3600 }, // seconds
        ip_restrictions: [{ type: String }] // Array of allowed IP ranges
      }
    },
    
    // Activity tracking
    activity: {
      last_login: { type: Date, default: null },
      login_count: { type: Number, default: 0 },
      last_invitation_sent: { type: Date, default: null },
      total_invitations_sent: { type: Number, default: 0 },
      last_user_action: { type: Date, default: null }
    },
    
    // Status
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  {
    versionKey: false
  }
);

// Indexes for efficient queries
AdminSettingsSchema.index({ organization_id: 1, is_active: 1 });
AdminSettingsSchema.index({ "hierarchy.reports_to": 1 });
AdminSettingsSchema.index({ "hierarchy.managed_departments": 1 });

// Pre-save middleware
AdminSettingsSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Static method to create default admin settings
AdminSettingsSchema.statics.createDefault = function(adminId, organizationId) {
  return this.create({
    admin_id: adminId,
    organization_id: organizationId,
    permissions: {
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
  });
};

// Instance method to check if admin can perform action
AdminSettingsSchema.methods.canPerform = function(action) {
  return this.permissions[action] === true;
};

// Instance method to increment invitation count
AdminSettingsSchema.methods.incrementInvitations = function() {
  this.hierarchy.current_invitations_count += 1;
  this.activity.total_invitations_sent += 1;
  this.activity.last_invitation_sent = new Date();
  return this.save();
};

export const AdminSettings = mongoose.models.AdminSettings || mongoose.model("AdminSettings", AdminSettingsSchema);