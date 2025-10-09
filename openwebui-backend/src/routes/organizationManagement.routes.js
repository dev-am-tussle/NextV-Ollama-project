import express from "express";
import * as orgController from "../controllers/organizationManagement.controller.js";
import { requireSuperAdminForOrganizations } from "../middleware/superAdminAuth.js";

const router = express.Router();

// Super Admin Organization Management Routes
router.use(requireSuperAdminForOrganizations); // All routes require super admin access with organization permissions

// Organization CRUD
router.get("/", orgController.getAllOrganizations);
router.get("/available-models", orgController.getAvailableModels);
router.get("/:id", orgController.getOrganizationById);
router.post("/", orgController.createOrganization);
router.put("/:id", orgController.updateOrganization);
router.delete("/:id", orgController.deleteOrganization);

// Organization Model Management
router.get("/:id/models", orgController.getOrganizationModels);
router.post("/:id/models", orgController.assignModelsToOrganization);

// Organization Employee Management  
router.get("/:id/employees", orgController.getOrganizationEmployees);

// Organization Admin Management
router.get("/:id/admins", orgController.getOrganizationAdmins);
router.post("/:id/admins", orgController.createOrganizationAdmin);

// Admin Management (Super Admin only)
router.put("/admins/:adminId", orgController.updateAdmin);
router.put("/admins/:adminId/password", orgController.resetAdminPassword);
router.delete("/admins/:adminId", orgController.deleteAdmin);

export default router;