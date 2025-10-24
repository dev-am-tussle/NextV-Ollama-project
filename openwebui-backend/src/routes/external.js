import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUserExternalApis,
  addExternalApi,
  updateExternalApi,
  deleteExternalApi,
  toggleApiStatus,
  validateApiKey,
  saveApiKey
} from "../controllers/externalApis.controller.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/external-apis - Get all external APIs for the user
router.get("/", getUserExternalApis);

// POST /api/v1/external-apis/validate-key - Validate API key with auto-detection
router.post("/validate-key", validateApiKey);

// POST /api/v1/external-apis/save-key - Save validated API key
router.post("/save-key", saveApiKey);

// Legacy verify endpoint (keeping for backward compatibility)
router.post("/verify", validateApiKey);

// POST /api/v1/external-apis - Add a new external API (legacy)
router.post("/", addExternalApi);

// PATCH /api/v1/external-apis/:apiId - Update an external API
router.patch("/:apiId", updateExternalApi);

// DELETE /api/v1/external-apis/:apiId - Delete an external API
router.delete("/:apiId", deleteExternalApi);

// POST /api/v1/external-apis/:apiId/toggle - Toggle API activation status
router.post("/:apiId/toggle", toggleApiStatus);

export default router;