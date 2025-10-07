import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin, AdminSettings } from "../models/admin.model.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.models.js";

// Admin Login
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Email and password are required" 
      });
    }

    // Find admin by email
    const admin = await Admin.findActiveByEmail(email)
      .populate('settings_id')
      .populate('organization_id');

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({ 
        success: false,
        error: "Account temporarily locked due to too many failed attempts" 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incrementLoginAttempts();
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Update last login
    admin.last_login = new Date();
    await admin.save();

    // Create JWT token
    const tokenPayload = {
      sub: admin._id,
      email: admin.email,
      role: admin.role,
      admin_type: admin.admin_type,
      organization_id: admin.organization_id?._id || null,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d' // 7 days
    });

    // Prepare response data
    const responseData = {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        admin_type: admin.admin_type,
        status: admin.status,
        email_verified: admin.email_verified,
        profile: admin.profile,
        created_at: admin.created_at,
        last_login: admin.last_login
      },
      settings: admin.settings_id,
      organization: admin.organization_id ? {
        id: admin.organization_id._id,
        name: admin.organization_id.name,
        status: admin.organization_id.status,
        subscription: admin.organization_id.subscription
      } : null,
      token
    };

    res.json({
      success: true,
      data: responseData,
      message: "Login successful"
    });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
}

// Get Admin Profile
export async function getAdminProfile(req, res) {
  try {
    const admin = await Admin.findById(req.user.id)
      .select('-password_hash')
      .populate('settings_id')
      .populate('organization_id');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          admin_type: admin.admin_type,
          status: admin.status,
          email_verified: admin.email_verified,
          profile: admin.profile,
          created_at: admin.created_at,
          last_login: admin.last_login
        },
        settings: admin.settings_id,
        organization: admin.organization_id ? {
          id: admin.organization_id._id,
          name: admin.organization_id.name,
          status: admin.organization_id.status,
          subscription: admin.organization_id.subscription,
          settings: admin.organization_id.settings
        } : null
      }
    });

  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get admin profile"
    });
  }
}

// Update Admin Profile
export async function updateAdminProfile(req, res) {
  try {
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password_hash;
    delete updates.admin_type;
    delete updates.organization_id;
    delete updates._id;

    const admin = await Admin.findByIdAndUpdate(
      req.user.id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      data: admin,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error("Update admin profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile"
    });
  }
}

// Change Admin Password
export async function changeAdminPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required"
      });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect"
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    admin.password_hash = newPasswordHash;
    admin.updated_at = new Date();
    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change admin password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password"
    });
  }
}

// Admin Logout
export async function adminLogout(req, res) {
  try {
    // Here you might want to add token to a blacklist
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({
      success: false,
      error: "Logout failed"
    });
  }
}

// Get Admin Dashboard Stats
export async function getAdminDashboardStats(req, res) {
  try {
    const adminId = req.user.id;
    const admin = req.admin;

    let stats = {};

    if (admin.admin_type === 'super_admin') {
      // Super admin sees platform-wide stats
      const [totalOrgs, totalAdmins, totalEmployees] = await Promise.all([
        Organization.countDocuments({ deleted_at: null }),
        Admin.countDocuments({ deleted_at: null, admin_type: 'org_admin' }),
        User.countDocuments({ role: 'employee' })
      ]);

      stats = {
        type: 'super_admin',
        organizations: totalOrgs,
        org_admins: totalAdmins,
        total_employees: totalEmployees,
        platform_wide: true
      };

    } else if (admin.admin_type === 'org_admin') {
      // Org admin sees organization-specific stats
      const [totalEmployees, activeEmployees, pendingEmployees] = await Promise.all([
        User.countDocuments({ 
          organization_id: admin.organization_id,
          role: 'employee'
        }),
        User.countDocuments({ 
          organization_id: admin.organization_id,
          role: 'employee',
          status: 'active'
        }),
        User.countDocuments({ 
          organization_id: admin.organization_id,
          role: 'employee',
          status: 'pending'
        })
      ]);

      stats = {
        type: 'org_admin',
        organization_id: admin.organization_id,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        pending_employees: pendingEmployees,
        organization_specific: true
      };
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard stats"
    });
  }
}