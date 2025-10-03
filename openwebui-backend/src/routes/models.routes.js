import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as modelsController from "../controllers/models.controller.js";

const router = express.Router();

// Public endpoint - Users see active models
router.get("/", modelsController.getActiveModels);

export default router;