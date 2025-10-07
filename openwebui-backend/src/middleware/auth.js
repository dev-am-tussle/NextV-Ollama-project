import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../services/auth.service.js";

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

    req.user = { id: decoded.sub, email: decoded.email };
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Authentication check failed" });
  }
}

// Enhanced authentication middleware for unified tokens
export function authenticateToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authorization token missing" });
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

    // Enhanced user object with unified token info
    req.user = {
      sub: decoded.sub,
      id: decoded.sub, // backward compatibility
      email: decoded.email,
      role: decoded.role,
      userType: decoded.userType || 'user', // admin or user
      admin_type: decoded.admin_type, // super_admin, org_admin
      organization_id: decoded.organization_id
    };

    return next();
  } catch (err) {
    console.error("authenticateToken error:", err);
    return res.status(500).json({ error: "Authentication check failed" });
  }
}
