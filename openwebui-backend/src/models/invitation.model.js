import mongoose from "mongoose";

// Invitation Schema for managing employee invitations
const InvitationSchema = new mongoose.Schema(
  {
    // Basic invitation info
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    invitation_token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // Organization and role info
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['employee', 'user'],
      default: 'employee',
      required: true
    },
    
    // Employee details for pre-filling
    employee_details: {
      department: { type: String, default: null },
      job_title: { type: String, default: null },
      employee_id: { type: String, default: null },
      manager_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    },
    
    // Invitation lifecycle
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
      default: 'pending',
      index: true
    },
    
    // Who invited and when
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true
    },
    invited_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    // Response tracking
    responded_at: { type: Date, default: null },
    accepted_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    
    // Expiration
    expires_at: {
      type: Date,
      required: true
    },
    
    // Email tracking
    email_sent_at: { type: Date, default: null },
    email_sent_count: { type: Number, default: 0 },
    last_email_sent_at: { type: Date, default: null },
    
    // Metadata
    invitation_metadata: {
      sent_via: { type: String, default: 'email' }, // 'email', 'sms', 'manual'
      sender_ip: { type: String, default: null },
      user_agent: { type: String, default: null },
      custom_message: { type: String, default: null }
    },
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  {
    versionKey: false
  }
);

// Indexes for efficient queries
InvitationSchema.index({ organization_id: 1, status: 1 });
InvitationSchema.index({ invited_by: 1, status: 1 });
InvitationSchema.index({ expires_at: 1 }); // For cleanup of expired invitations
InvitationSchema.index({ email: 1, organization_id: 1 }); // Prevent duplicate invitations

// Pre-save middleware
InvitationSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Static method to generate invitation token
InvitationSchema.statics.generateToken = function() {
  return require('crypto').randomBytes(32).toString('hex');
};

// Instance method to check if invitation is valid
InvitationSchema.methods.isValid = function() {
  return this.status === 'pending' && this.expires_at > new Date();
};

// Instance method to mark as accepted
InvitationSchema.methods.accept = function(userId) {
  this.status = 'accepted';
  this.responded_at = new Date();
  this.accepted_by_user_id = userId;
  return this.save();
};

// Instance method to mark as expired
InvitationSchema.methods.expire = function() {
  this.status = 'expired';
  this.responded_at = new Date();
  return this.save();
};

export const Invitation = mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);