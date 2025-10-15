import mongoose from "mongoose";

// Organization Schema
const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    description: {
      type: String,
      maxlength: 500,
      default: null
    },
    // Organization settings
    settings: {
      // Model access settings with enhanced tracking
      allowed_models: [{
        model_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AvailableModel",
          required: true
        },
        enabled: { type: Boolean, default: true },
        added_at: { type: Date, default: Date.now },
        // Purchase/subscription details
        purchase_details: {
          purchased_at: { type: Date, default: Date.now },
          purchased_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null
          },
          cost: { type: Number, default: 0 },
          billing_cycle: {
            type: String,
            enum: ['one-time', 'monthly', 'yearly'],
            default: 'monthly'
          }
        },
        // Usage tracking
        usage_stats: {
          total_downloads: { type: Number, default: 0 },
          active_users: { type: Number, default: 0 },
          last_used: { type: Date, default: null }
        }
      }],
      // User limits and permissions
      limits: {
        max_users: { type: Number, default: 10 },
        max_concurrent_sessions: { type: Number, default: 5 },
        monthly_request_limit: { type: Number, default: 10000 },
        storage_limit_mb: { type: Number, default: 1000 }
      },
      // Default settings for new employees
      default_employee_settings: {
        theme: { type: String, default: "dark" },
        default_model: { type: String, default: "gemma:2b" },
        can_save_prompts: { type: Boolean, default: true },
        can_upload_files: { type: Boolean, default: true }
      },
      // Organization features
      features: {
        analytics_enabled: { type: Boolean, default: true },
        file_sharing_enabled: { type: Boolean, default: true },
        custom_prompts_enabled: { type: Boolean, default: true },
        api_access_enabled: { type: Boolean, default: false }
      }
    },
    // Subscription and billing
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'trial'],
        default: 'trial'
      },
      trial_ends_at: { type: Date, default: null },
      billing_cycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      },
      next_billing_date: { type: Date, default: null }
    },
    // Bradning and customization
    brandings_settings: {
      titleName: { type: String, default: "Soverign AI" },
      logoName: { type: String, default: "soverign-logo.png" },
      primaryColor: { type: String, default: "#61dafbaa" },
      buttonTextColor: { type: String, default: "#ffffff" },
      faviconUrl: { type: String, default: null },
      logoUrl: { type: String, default: null },
      updated_at: { type: Date, default: null }
    },
    // Organization status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true
    },
    // Verification and onboarding
    verified: { type: Boolean, default: false },
    onboarding_completed: { type: Boolean, default: false },
    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true // Super admin who created this org
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
    }
  },
  {
    versionKey: false,
  }
);

// Indexes for performance
OrganizationSchema.index({ slug: 1, deleted_at: 1 });
OrganizationSchema.index({ status: 1, deleted_at: 1 });
OrganizationSchema.index({ created_at: -1 });
OrganizationSchema.index({ 'subscription.status': 1 });

// Pre-save middleware
OrganizationSchema.pre("save", function (next) {
  this.updated_at = new Date();

  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  next();
});

// Instance methods
OrganizationSchema.methods.addModel = function (modelId) {
  const existingModel = this.settings.allowed_models.find(
    m => m.model_id.toString() === modelId.toString()
  );

  if (!existingModel) {
    this.settings.allowed_models.push({
      model_id: modelId,
      enabled: true,
      added_at: new Date()
    });
  }

  return this.save();
};

OrganizationSchema.methods.removeModel = function (modelId) {
  this.settings.allowed_models = this.settings.allowed_models.filter(
    m => m.model_id.toString() !== modelId.toString()
  );

  return this.save();
};

OrganizationSchema.methods.getActiveModels = function () {
  return this.settings.allowed_models
    .filter(m => m.enabled)
    .map(m => m.model_id);
};

OrganizationSchema.methods.isWithinLimits = function (currentCounts) {
  const limits = this.settings.limits;

  return {
    users: currentCounts.users <= limits.max_users,
    sessions: currentCounts.concurrent_sessions <= limits.max_concurrent_sessions,
    requests: currentCounts.monthly_requests <= limits.monthly_request_limit,
    storage: currentCounts.storage_mb <= limits.storage_limit_mb
  };
};

// Static methods
OrganizationSchema.statics.findActiveBySlug = function (slug) {
  return this.findOne({
    slug: slug.toLowerCase(),
    status: 'active',
    deleted_at: null
  });
};

OrganizationSchema.statics.findActiveOrganizations = function () {
  return this.find({
    status: 'active',
    deleted_at: null
  }).sort({ created_at: -1 });
};

export const Organization = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);