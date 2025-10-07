import jwt from "jsonwebtoken";
import { SuperAdmin } from "../models/superAdmin.model.js";

// Super Admin Authentication Middleware
export function requireSuperAdminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header) {
      return res.status(401).json({ 
        success: false,
        error: "Authorization header missing" 
      });
    }

    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Authorization token missing" 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid or expired token" 
      });
    }

    if (!decoded || !decoded.sub || decoded.type !== 'super_admin') {
      return res.status(401).json({ 
        success: false,
        error: "Invalid super admin token" 
      });
    }

    // Set user info for super admin
    req.user = { 
      id: decoded.sub, 
      email: decoded.email,
      role: decoded.role,
      type: decoded.type
    };
    
    return next();
  } catch (err) {
    console.error("requireSuperAdminAuth error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Authentication check failed" 
    });
  }
}

// Middleware to verify super admin exists and is active
export async function verifySuperAdminExists(req, res, next) {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id).select('-password_hash');
    
    if (!superAdmin || superAdmin.status !== 'active') {
      return res.status(403).json({ 
        success: false,
        error: "Super admin account not found or inactive" 
      });
    }

    // Add super admin details to request
    req.superAdmin = superAdmin;
    
    return next();
  } catch (error) {
    console.error("verifySuperAdminExists error:", error);
    return res.status(500).json({ 
      success: false,
      error: "Super admin verification failed" 
    });
  }
}

// Combined middleware for organization management routes
export function requireSuperAdminForOrganizations(req, res, next) {
  requireSuperAdminAuth(req, res, (err) => {
    if (err) return;
    
    // Super admin users have all permissions by default
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false,
        error: "Super admin access required" 
      });
    }
    
    return next();
  });
}