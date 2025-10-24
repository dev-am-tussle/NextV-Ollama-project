import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getUserExternalApis,
  validateUserApiKey,
  saveUserApiKey,
  toggleUserApiStatus,
  deleteUserExternalApi,
  syncAllUserExternalModels
} from "../controllers/userExternalApi.controller.js";

const router = express.Router();

// All routes require user authentication
router.use(auth);

// GET /api/user/external-apis - Get all external APIs for user
router.get("/", getUserExternalApis);

// POST /api/user/external-apis/validate - Validate user API key
router.post("/validate", validateUserApiKey);

// POST /api/user/external-apis/save - Save validated user API key  
router.post("/save", saveUserApiKey);

// PATCH /api/user/external-apis/:apiId/toggle - Toggle user API activation status
router.patch("/:apiId/toggle", toggleUserApiStatus);

// DELETE /api/user/external-apis/:apiId - Delete user external API
router.delete("/:apiId", deleteUserExternalApi);

// POST /api/user/external-apis/sync - Sync all user external models
router.post("/sync", syncAllUserExternalModels);

export default router;