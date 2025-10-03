import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { 
  addPulledModel, 
  removePulledModel, 
  getUserPulledModels,
  updateModelUsage
} from "../services/modelManagement.service.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/user/pulled-models - Get user's pulled models
router.get("/pulled-models", async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await getUserPulledModels(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error fetching user pulled models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pulled models"
    });
  }
});

// POST /api/v1/user/pulled-models - Add a model to user's pulled models
router.post("/pulled-models", async (req, res) => {
  try {
    const userId = req.user.id;
    const { model_name } = req.body;
    
    if (!model_name) {
      return res.status(400).json({
        success: false,
        error: "model_name is required"
      });
    }
    
    const result = await addPulledModel(userId, model_name);
    res.json(result);
  } catch (error) {
    console.error("Error adding pulled model:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to add pulled model"
    });
  }
});

// DELETE /api/v1/user/pulled-models/:modelName - Remove a model from user's pulled models
router.delete("/pulled-models/:modelName", async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelName } = req.params;
    
    const result = await removePulledModel(userId, modelName);
    res.json(result);
  } catch (error) {
    console.error("Error removing pulled model:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to remove pulled model"
    });
  }
});

// POST /api/v1/user/pulled-models/:modelName/usage - Update model usage statistics
router.post("/pulled-models/:modelName/usage", async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelName } = req.params;
    
    const result = await updateModelUsage(userId, modelName);
    res.json(result);
  } catch (error) {
    console.error("Error updating model usage:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update model usage"
    });
  }
});

export default router;