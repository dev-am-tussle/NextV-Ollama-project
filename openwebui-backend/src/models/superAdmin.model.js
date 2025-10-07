import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// SuperAdmin Schema - Minimal fields for super admin authentication
const SuperAdminSchema = new mongoose.Schema(
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
    password_hash: {
      type: String,
      required: true
    },
    // Super admin specific fields
    role: {
      type: String,
      default: 'super_admin',
      immutable: true // Cannot be changed once set
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    },
    // Last login tracking
    last_login: {
      type: Date,
      default: null
    },
    // Account security fields
    login_attempts: {
      type: Number,
      default: 0
    },
    locked_until: {
      type: Date,
      default: null
    },
    // Audit fields
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false,
  }
);

// Indexes for performance
SuperAdminSchema.index({ email: 1, status: 1 });
SuperAdminSchema.index({ created_at: -1 });

// Virtual for checking if admin is locked
SuperAdminSchema.virtual('isLocked').get(function() {
  return !!(this.locked_until && this.locked_until > Date.now());
});

// Pre-save middleware
SuperAdminSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Instance methods
SuperAdminSchema.methods.incrementLoginAttempts = function() {
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

SuperAdminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { login_attempts: 1, locked_until: 1 }
  });
};

SuperAdminSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { last_login: new Date() }
  });
};

// Static methods
SuperAdminSchema.statics.findActiveByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    status: 'active'
  });
};

SuperAdminSchema.statics.validatePassword = async function(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

SuperAdminSchema.statics.hashPassword = async function(password) {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

export const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);