import { AvailableModel } from "../models/availableModel.model.js";
import { invalidateModelsCache } from "../services/ollama.service.js";
import mongoose from "mongoose";

// GET /api/admin/models - Admin manages catalog
export async function getAllModels(req, res) {
  try {
    const { page = 1, limit = 10, category, is_active } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (category) filter.category = category;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const models = await AvailableModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AvailableModel.countDocuments(filter);

    res.json({
      success: true,
      data: models,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching models for admin:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch models"
    });
  }
}

// POST /api/admin/models - Admin adds new model
export async function createModel(req, res) {
  try {
    const {
      name,
      display_name,
      description,
      size,
      category,
      tags,
      provider,
      model_family,
      parameters,
      use_cases,
      performance_tier,
      min_ram_gb,
      is_active
    } = req.body;

    // Validation
    if (!name || !display_name || !description || !size) {
      return res.status(400).json({
        success: false,
        error: "Name, display_name, description, and size are required"
      });
    }

    // Check if model already exists
    const existingModel = await AvailableModel.findOne({ name });
    if (existingModel) {
      return res.status(409).json({
        success: false,
        error: "Model with this name already exists"
      });
    }

    const model = new AvailableModel({
      name,
      display_name,
      description,
      size,
      category: category || "general",
      tags: tags || [],
      provider: provider || "ollama",
      model_family,
      parameters,
      use_cases: use_cases || [],
      performance_tier: performance_tier || "balanced",
      min_ram_gb,
      is_active: is_active !== undefined ? is_active : true
    });

    await model.save();

    // Invalidate models cache since we added a new model
    invalidateModelsCache();

    res.status(201).json({
      success: true,
      data: model,
      message: "Model created successfully"
    });
  } catch (error) {
    console.error("Error creating model:", error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Model with this name already exists"
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create model"
    });
  }
}

// PUT /api/admin/models/:id - Admin updates model
export async function updateModel(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid model ID"
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.created_at;
    updateData.updated_at = new Date();

    // If updating name, check for duplicates
    if (updateData.name) {
      const existingModel = await AvailableModel.findOne({
        name: updateData.name,
        _id: { $ne: id }
      });
      
      if (existingModel) {
        return res.status(409).json({
          success: false,
          error: "Model with this name already exists"
        });
      }
    }

    const model = await AvailableModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found"
      });
    }

    // Invalidate models cache since we updated a model
    invalidateModelsCache();

    res.json({
      success: true,
      data: model,
      message: "Model updated successfully"
    });
  } catch (error) {
    console.error("Error updating model:", error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Model with this name already exists"
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update model"
    });
  }
}

// DELETE /api/admin/models/:id - Admin removes model
export async function deleteModel(req, res) {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid model ID"
      });
    }

    const model = await AvailableModel.findByIdAndDelete(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found"
      });
    }

    // Invalidate models cache since we deleted a model
    invalidateModelsCache();

    res.json({
      success: true,
      data: model,
      message: "Model deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete model"
    });
  }
}