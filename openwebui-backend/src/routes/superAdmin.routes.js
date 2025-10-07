import express from "express";
import * as superAdminController from "../controllers/superAdmin.controller.js";
import { requireSuperAdminAuth } from "../middleware/superAdminAuth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for super admin
  message: { 
    success: false,
    error: "Too many login attempts, please try again later" 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no authentication required)
router.post("/login", authLimiter, superAdminController.login);

// Protected routes (authentication required)
router.get("/profile", requireSuperAdminAuth, superAdminController.getProfile);
router.put("/profile", requireSuperAdminAuth, superAdminController.updateProfile);
router.put("/password", requireSuperAdminAuth, superAdminController.changePassword);
router.post("/logout", requireSuperAdminAuth, superAdminController.logout);

export default router;