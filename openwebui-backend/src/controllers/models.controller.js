import { AvailableModel } from "../models/availableModel.model.js";

// GET /api/v1/models - Users see active models
export async function getActiveModels(req, res) {
  try {
    const models = await AvailableModel.find({ is_active: true })
      .select('-created_at -updated_at')
      .sort({ model_family: 1, parameters: 1 });

    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    console.error("Error fetching active models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch available models"
    });
  }
}