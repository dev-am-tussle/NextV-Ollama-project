import {
  loginSuperAdmin,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  changeSuperAdminPassword
} from "../services/superAdmin.service.js";

// POST /api/super-admin/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    const result = await loginSuperAdmin({ email, password });
    res.json(result);

  } catch (error) {
    console.error("Super admin login error:", error);
    
    // Return generic error message for security
    res.status(401).json({
      success: false,
      error: "Invalid credentials"
    });
  }
}

// GET /api/super-admin/auth/profile
export async function getProfile(req, res) {
  try {
    const result = await getSuperAdminProfile(req.user.id);
    res.json(result);

  } catch (error) {
    console.error("Get super admin profile error:", error);
    res.status(404).json({
      success: false,
      error: "Profile not found"
    });
  }
}

// PUT /api/super-admin/auth/profile
export async function updateProfile(req, res) {
  try {
    const result = await updateSuperAdminProfile(req.user.id, req.body);
    res.json(result);

  } catch (error) {
    console.error("Update super admin profile error:", error);
    res.status(400).json({
      success: false,
      error: "Failed to update profile"
    });
  }
}

// PUT /api/super-admin/auth/password
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters long"
      });
    }

    const result = await changeSuperAdminPassword(req.user.id, currentPassword, newPassword);
    res.json(result);

  } catch (error) {
    console.error("Change super admin password error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to change password"
    });
  }
}

// POST /api/super-admin/auth/logout
export async function logout(req, res) {
  try {
    // In a production environment, you might want to blacklist the token
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Super admin logout error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to logout"
    });
  }
}