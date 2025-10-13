import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
    getCategorizedModelsForUser,
    downloadModelWithProgress,
    removeDownloadedModel,
    requestModelPurchase,
    updateModelUsage
} from "../controllers/categorizedModels.controller.js";

const router = express.Router();

/**
 * @route   GET /api/user/categorized-models
 * @desc    Get categorized models for the current user (downloaded, available to download, available for purchase)
 * @access  Private
 */
router.get("/categorized-models", authenticateToken, getCategorizedModelsForUser);

/**
 * @route   POST /api/user/download-model/:modelName
 * @desc    Download a model with progress tracking (Server-Sent Events)
 * @access  Private
 */
router.post("/download-model/:modelName", authenticateToken, downloadModelWithProgress);

/**
 * @route   DELETE /api/user/downloaded-model/:modelName
 * @desc    Remove a downloaded model from user and Ollama
 * @access  Private
 */
router.delete("/downloaded-model/:modelName", authenticateToken, removeDownloadedModel);

/**
 * @route   POST /api/user/request-model-purchase/:modelId
 * @desc    Request purchase of a model for the organization
 * @access  Private
 */
router.post("/request-model-purchase/:modelId", authenticateToken, requestModelPurchase);

/**
 * @route   POST /api/user/update-model-usage/:modelName
 * @desc    Update model usage statistics
 * @access  Private
 */
router.post("/update-model-usage/:modelName", authenticateToken, updateModelUsage);

export default router;