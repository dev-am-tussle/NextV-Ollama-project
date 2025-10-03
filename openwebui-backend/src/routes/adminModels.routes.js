import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as adminModelsController from "../controllers/adminModels.controller.js";

const router = express.Router();

// All admin routes require authentication (you can add admin role check later)
router.use(requireAuth);

// GET /api/admin/models - Admin manages catalog
router.get("/", adminModelsController.getAllModels);

// POST /api/admin/models - Admin adds new model
router.post("/", adminModelsController.createModel);

// POST /api/admin/models/seed - Seed initial models data
router.post("/seed", adminModelsController.seedModels);

// PUT /api/admin/models/:id - Admin updates model
router.put("/:id", adminModelsController.updateModel);

// DELETE /api/admin/models/:id - Admin removes model
router.delete("/:id", adminModelsController.deleteModel);

export default router;