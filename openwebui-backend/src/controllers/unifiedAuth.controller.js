import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { User, UserSettings } from "../models/user.models.js";
import { Organization } from "../models/organization.model.js";
import { loginUser } from "../services/auth.service.js";

// Unified Login Function
export async function unifiedLogin(req, res) {
  try {
    const { email, password, userType = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Email and password are required" 
      });
    }

    // Route to appropriate authentication based on userType
    if (userType === 'admin') {
      return await handleAdminLogin(req, res, email, password);
    } else {
      return await handleUserLogin(req, res, email, password);
    }

  } catch (error) {
    console.error("Unified login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
}

// Handle Admin Login
async function handleAdminLogin(req, res, email, password) {
  try {
    // Find admin by email
    const admin = await Admin.findActiveByEmail(email)
      .populate('settings_id')
      .populate('organization_id');

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid admin credentials",
        userType: 'admin'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({ 
        success: false,
        error: "Admin account temporarily locked due to too many failed attempts",
        userType: 'admin'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incrementLoginAttempts();
      return res.status(401).json({ 
        success: false,
        error: "Invalid admin credentials",
        userType: 'admin'
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Update last login
    admin.last_login = new Date();
    await admin.save();

    // Create JWT token for admin
    const tokenPayload = {
      sub: admin._id,
      email: admin.email,
      role: admin.role,
      admin_type: admin.admin_type,
      organization_id: admin.organization_id?._id || null,
      userType: 'admin'
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Prepare admin response data
    const responseData = {
      userType: 'admin',
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
        slug: admin.organization_id.slug,
        status: admin.organization_id.status,
        subscription: admin.organization_id.subscription
      } : null,
      token,
      redirectTo: getAdminRedirectPath(admin.admin_type)
    };

    res.json({
      success: true,
      data: responseData,
      message: "Admin login successful"
    });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      error: "Admin login failed",
      userType: 'admin'
    });
  }
}

// Handle User Login
async function handleUserLogin(req, res, email, password) {
  try {
    // Use existing user login service
    const userData = await loginUser({ email, password });
    
    // Add userType to response
    const responseData = {
      ...userData,
      userType: 'user',
      redirectTo: '/' // Default user chat page
    };

    res.json({
      success: true,
      data: responseData,
      message: "User login successful"
    });

  } catch (error) {
    console.error("User login error:", error);
    res.status(401).json({
      success: false,
      error: error.message || "Invalid user credentials",
      userType: 'user'
    });
  }
}

// Get redirect path based on admin type
function getAdminRedirectPath(adminType) {
  switch (adminType) {
    case 'super_admin':
      return '/admin/super-admin/dashboard';
    case 'org_admin':
      return '/admin/org-admin/dashboard';
    default:
      return '/admin/dashboard';
  }
}

// Unified Profile Retrieval
export async function getUnifiedProfile(req, res) {
  try {
    const { userType } = req.user;

    if (userType === 'admin') {
      return await getAdminProfile(req, res);
    } else {
      return await getUserProfile(req, res);
    }
  } catch (error) {
    console.error("Get unified profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile"
    });
  }
}

// Get Admin Profile (similar to existing adminAuth controller)
async function getAdminProfile(req, res) {
  try {
    const admin = await Admin.findById(req.user.sub)
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
        userType: 'admin',
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
          slug: admin.organization_id.slug,
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

// Get User Profile (basic implementation)
async function getUserProfile(req, res) {
  try {
    const user = await User.findById(req.user.sub)
      .select('-password_hash')
      .populate('settings_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      data: {
        userType: 'user',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          last_login: user.last_login
        },
        settings: user.settings_id
      }
    });

  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user profile"
    });
  }
}

// Unified Logout
export async function unifiedLogout(req, res) {
  try {
    // Clear any session data or add token to blacklist if needed
    res.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Unified logout error:", error);
    res.status(500).json({
      success: false,
      error: "Logout failed"
    });
  }
}