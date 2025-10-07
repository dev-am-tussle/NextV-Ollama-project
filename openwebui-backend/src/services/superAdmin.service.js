import jwt from "jsonwebtoken";
import { SuperAdmin } from "../models/superAdmin.model.js";

// Sign JWT token for super admin
function signSuperAdminToken(superAdmin) {
  return jwt.sign(
    {
      sub: superAdmin._id.toString(),
      email: superAdmin.email,
      role: superAdmin.role,
      type: 'super_admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
}

// Super Admin Login
export async function loginSuperAdmin({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  email = email.toLowerCase().trim();

  // Find super admin by email
  const superAdmin = await SuperAdmin.findActiveByEmail(email);
  if (!superAdmin) {
    throw new Error("Invalid credentials");
  }

  // Check if account is locked
  if (superAdmin.isLocked) {
    throw new Error("Account temporarily locked due to too many failed attempts");
  }

  // Validate password
  const isValidPassword = await SuperAdmin.validatePassword(password, superAdmin.password_hash);
  if (!isValidPassword) {
    // Increment login attempts
    await superAdmin.incrementLoginAttempts();
    throw new Error("Invalid credentials");
  }

  // Reset login attempts and update last login
  await superAdmin.resetLoginAttempts();
  await superAdmin.updateLastLogin();

  // Generate JWT token
  const token = signSuperAdminToken(superAdmin);

  return {
    success: true,
    message: "Super admin login successful",
    data: {
      token,
      admin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        admin_type: 'super_admin',
        last_login: superAdmin.last_login
      }
    }
  };
}

// Get Super Admin Profile
export async function getSuperAdminProfile(superAdminId) {
  const superAdmin = await SuperAdmin.findById(superAdminId).select('-password_hash');
  if (!superAdmin || superAdmin.status !== 'active') {
    throw new Error("Super admin not found");
  }

  return {
    success: true,
    data: {
      admin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        admin_type: 'super_admin',
        last_login: superAdmin.last_login,
        created_at: superAdmin.created_at
      }
    }
  };
}

// Update Super Admin Profile
export async function updateSuperAdminProfile(superAdminId, updates) {
  // Remove sensitive fields that shouldn't be updated
  delete updates.password_hash;
  delete updates.role;
  delete updates._id;
  delete updates.created_at;

  const superAdmin = await SuperAdmin.findByIdAndUpdate(
    superAdminId,
    { ...updates, updated_at: new Date() },
    { new: true, runValidators: true }
  ).select('-password_hash');

  if (!superAdmin) {
    throw new Error("Super admin not found");
  }

  return {
    success: true,
    data: {
      admin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        admin_type: 'super_admin'
      }
    }
  };
}

// Change Super Admin Password
export async function changeSuperAdminPassword(superAdminId, currentPassword, newPassword) {
  const superAdmin = await SuperAdmin.findById(superAdminId);
  if (!superAdmin) {
    throw new Error("Super admin not found");
  }

  // Validate current password
  const isValidPassword = await SuperAdmin.validatePassword(currentPassword, superAdmin.password_hash);
  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password and update
  const newPasswordHash = await SuperAdmin.hashPassword(newPassword);
  await SuperAdmin.updateOne(
    { _id: superAdminId },
    { 
      $set: { 
        password_hash: newPasswordHash,
        updated_at: new Date()
      }
    }
  );

  return {
    success: true,
    message: "Password updated successfully"
  };
}