import express from "express";
import * as adminAuthController from "../controllers/adminAuth.controller.js";
import { requireAdmin, requireSuperAdmin, requireOrgAdmin } from "../middleware/roleAuth.js";

const router = express.Router();

// Admin Authentication Routes
router.post("/login", adminAuthController.adminLogin);
router.post("/logout", requireAdmin, adminAuthController.adminLogout);

// Admin Profile Routes
router.get("/profile", requireAdmin, adminAuthController.getAdminProfile);
router.put("/profile", requireAdmin, adminAuthController.updateAdminProfile);
router.put("/password", requireAdmin, adminAuthController.changeAdminPassword);

// Admin Dashboard
router.get("/dashboard/stats", requireAdmin, adminAuthController.getAdminDashboardStats);

export default router;