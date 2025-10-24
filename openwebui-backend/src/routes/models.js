import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getUserAvailableModels, refreshUserModels } from "../controllers/models.controller.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/models/available - Get all available models for the user
router.get("/available", getUserAvailableModels);

// POST /api/v1/models/refresh - Refresh models from all connected providers
router.post("/refresh", refreshUserModels);

export default router;