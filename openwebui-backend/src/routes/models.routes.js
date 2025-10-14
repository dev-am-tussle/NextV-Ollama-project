import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as modelsController from "../controllers/models.controller.js";

const router = express.Router();

// Public endpoint - Users see active models
router.get("/", modelsController.getActiveModels);

// Protected endpoints for categorized model data
router.get("/categorized", requireAuth, modelsController.getUserCategorizedModelsController);
router.get("/admin-categorized", requireAuth, modelsController.getAdminCategorizedModelsController);
router.get("/user/:id/list", requireAuth, modelsController.getUserModelsList);

// Protected endpoints for model management
router.post("/pull", requireAuth, modelsController.pullModelWithProgress);
router.post("/mark-downloaded", requireAuth, modelsController.markModelAsDownloadedController);
router.post("/update-usage", requireAuth, modelsController.updateModelUsageController);
router.delete("/remove", requireAuth, modelsController.removeModelFromSystem);

export default router;