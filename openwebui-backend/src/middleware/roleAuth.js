import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.models.js";
import { isTokenRevoked } from "../services/auth.service.js";

// Enhanced auth middleware that works for both regular users and admins
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authorization token missing" });
    }

    // Check for development mode mock token
    if (token.startsWith("eyJ") && !token.includes(".")) {
      // This is a base64 encoded mock token for development
      try {
        const mockPayload = JSON.parse(atob(token));
        if (mockPayload.sub === 'superadmin-dev-id' && mockPayload.is_super_admin) {
          req.user = { 
            id: mockPayload.sub, 
            email: mockPayload.email,
            role: mockPayload.role,
            is_super_admin: mockPayload.is_super_admin
          };
          return next();
        }
      } catch (e) {
        // If mock token parsing fails, continue with regular JWT validation
      }
    }

    if (isTokenRevoked(token)) {
      return res.status(401).json({ error: "Token revoked" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Set basic user info (works for both users and admins)
    req.user = { 
      id: decoded.sub, 
      email: decoded.email,
      role: decoded.role,
      admin_type: decoded.admin_type,
      organization_id: decoded.organization_id,
      is_super_admin: decoded.is_super_admin
    };
    
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Authentication check failed" });
  }
}

// Middleware to require admin access (any type of admin)
export function requireAdmin(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return;
    
    try {
      // Check if user is an admin
      const admin = await Admin.findById(req.user.id)
        .select('-password_hash')
        .populate('settings_id');
      
      if (!admin || admin.status !== 'active' || admin.deleted_at) {
        return res.status(403).json({ 
          error: "Admin access required" 
        });
      }

      // Add admin details to request
      req.admin = admin;
      req.user.admin_type = admin.admin_type;
      req.user.organization_id = admin.organization_id;
      
      return next();
    } catch (error) {
      console.error("requireAdmin error:", error);
      return res.status(500).json({ error: "Admin verification failed" });
    }
  });
}

// Middleware to require super admin access (using User collection)
export function requireSuperAdminUser(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return;
    
    try {
      // Handle development mode mock token
      if (req.user.id === 'superadmin-dev-id' && req.user.is_super_admin) {
        req.superAdminUser = {
          _id: 'superadmin-dev-id',
          name: 'Super Administrator (Dev)',
          email: req.user.email,
          role: 'super_admin',
          is_super_admin: true,
          status: 'active'
        };
        req.user.role = 'super_admin';
        req.user.is_super_admin = true;
        return next();
      }

      // Check if user is a super admin in User collection
      const user = await User.findById(req.user.id)
        .select('-password_hash')
        .populate('settings_id');
      
      if (!user || user.status !== 'active') {
        return res.status(403).json({ 
          error: "User not found or inactive" 
        });
      }

      // Check if user has super admin privileges
      if (!user.is_super_admin && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: "Super admin access required" 
        });
      }

      // Add user details to request
      req.superAdminUser = user;
      req.user.role = user.role;
      req.user.is_super_admin = user.is_super_admin;
      
      return next();
    } catch (error) {
      console.error("requireSuperAdminUser error:", error);
      return res.status(500).json({ error: "Super admin verification failed" });
    }
  });
}

// Middleware to require super admin access
export function requireSuperAdmin(req, res, next) {
  requireAdmin(req, res, (err) => {
    if (err) return;
    
    if (req.admin.admin_type !== 'super_admin') {
      return res.status(403).json({ 
        error: "Super admin access required" 
      });
    }
    
    return next();
  });
}

// Middleware to require organization admin access
export function requireOrgAdmin(req, res, next) {
  requireAdmin(req, res, (err) => {
    if (err) return;
    
    if (req.admin.admin_type !== 'org_admin') {
      return res.status(403).json({ 
        error: "Organization admin access required" 
      });
    }
    
    if (!req.admin.organization_id) {
      return res.status(403).json({ 
        error: "Admin must be associated with an organization" 
      });
    }
    
    return next();
  });
}

// Middleware to require employee access
export function requireEmployee(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return;
    
    try {
      // Check if user is an employee
      const user = await User.findById(req.user.id)
        .select('-password_hash')
        .populate('settings_id');
      
      if (!user || user.role !== 'employee' || user.status !== 'active') {
        return res.status(403).json({ 
          error: "Employee access required" 
        });
      }

      if (!user.organization_id) {
        return res.status(403).json({ 
          error: "Employee must be associated with an organization" 
        });
      }

      // Add user details to request
      req.employee = user;
      req.user.role = user.role;
      req.user.organization_id = user.organization_id;
      
      return next();
    } catch (error) {
      console.error("requireEmployee error:", error);
      return res.status(500).json({ error: "Employee verification failed" });
    }
  });
}

// Middleware to check if user belongs to the same organization
export function requireSameOrganization(req, res, next) {
  const { organizationId } = req.params;
  
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  
  // Super admin can access any organization
  if (req.admin && req.admin.admin_type === 'super_admin') {
    return next();
  }
  
  // Check if user belongs to the requested organization
  if (req.user.organization_id?.toString() !== organizationId) {
    return res.status(403).json({ 
      error: "Access denied: different organization" 
    });
  }
  
  return next();
}

// Middleware to check specific permissions
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin || !req.admin.settings_id) {
      return res.status(403).json({ 
        error: "Admin settings not found" 
      });
    }
    
    const permissions = req.admin.settings_id.permissions;
    
    if (!permissions || !permissions[permission]) {
      return res.status(403).json({ 
        error: `Permission required: ${permission}` 
      });
    }
    
    return next();
  };
}

// Middleware for role-based access control
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role || req.user.admin_type;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    return next();
  };
}