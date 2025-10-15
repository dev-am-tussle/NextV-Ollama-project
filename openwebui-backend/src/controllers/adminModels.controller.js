import { Admin } from "../models/admin.model.js";
import { AdminSettings } from "../models/adminSettings.model.js";
import { AvailableModel } from "../models/availableModel.model.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.models.js";
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

// GET /api/admin/models/admin/:id/models-list - Get categorized models for a specific admin
export async function getAdminModelsList(req, res) {
  try {
    const { id: adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: "Admin ID is required"
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    // Fetch admin settings for pulled models
    const adminSettings = await AdminSettings.findOne({ admin_id: adminId });
    const pulledModelIds = adminSettings?.settings?.pulled_models?.map(pm => pm.model_id.toString()) || [];

    // Fetch Organization + allowed models
    let orgAllowedModelIds = [];
    let organization = null;
    if (admin.organization_id) {
      organization = await Organization.findById(admin.organization_id);
      orgAllowedModelIds = organization?.settings?.allowed_models
        ?.filter(am => am.enabled)
        ?.map(am => am.model_id.toString()) || [];
    }

    // Fetch all available models
    const allModels = await AvailableModel.find({ is_active: true })
      .select('-created_at -updated_at')
      .sort({ model_family: 1, parameters: 1 });

    // Categorize models
    const downloaded = [];
    const availableToDownload = [];
    const availableGlobal = [];

    for (const model of allModels) {
      const modelIdStr = model._id.toString();

      if (pulledModelIds.includes(modelIdStr)) {
        downloaded.push(model);
      } else if (orgAllowedModelIds.includes(modelIdStr)) {
        availableToDownload.push(model);
      } else {
        availableGlobal.push(model);
      }
    }

    res.json({
      success: true,
      data: {
        downloaded,
        availableToDownload,
        availableGlobal
      },
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        organization: organization ? {
          id: organization._id,
          name: organization.name
        } : null
      }
    });

  } catch (error) {
    console.error("Error fetching admin models list:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch admin models list"
    });
  }
}

// GET /api/admin/models/organization - Get models for current admin's organization
export async function getOrganizationModels(req, res) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required"
      });
    }

    // Find admin and their organization
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.organization_id) {
      return res.status(404).json({
        success: false,
        error: "Admin or organization not found"
      });
    }

    const organization = await Organization.findById(admin.organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Get query parameters for filtering
    const { 
      page = 1, 
      limit = 10, 
      category, 
      performance_tier, 
      search,
      sort_by = 'display_name',
      sort_order = 'asc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Get allowed model IDs from organization
    const allowedModelIds = organization.settings?.allowed_models
      ?.filter(am => am.enabled)
      ?.map(am => am.model_id) || [];

    if (allowedModelIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        },
        analytics: {
          total_models: 0,
          models_by_category: {},
          models_by_tier: {}
        }
      });
    }

    // Build filter query
    const filter = { _id: { $in: allowedModelIds } };
    if (category) filter.category = category;
    if (performance_tier) filter.performance_tier = performance_tier;
    if (search) {
      filter.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort query
    const sortQuery = {};
    sortQuery[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Fetch models with user statistics and organization-specific enabled status
    const models = await AvailableModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'organizations',
          let: { modelId: '$_id' },
          pipeline: [
            { $match: { _id: admin.organization_id } },
            { $unwind: { path: '$settings.allowed_models', preserveNullAndEmptyArrays: true } },
            { $match: { $expr: { $eq: ['$settings.allowed_models.model_id', '$$modelId'] } } },
            { $project: { enabled: '$settings.allowed_models.enabled' } }
          ],
          as: 'orgSettings'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { modelId: '$_id' },
          pipeline: [
            { $match: { organization_id: admin.organization_id } },
            {
              $match: {
                $or: [
                  { 'settings.pulled_models': { $elemMatch: { model_id: '$$modelId' } } },
                  { 'settings.default_model_id': '$$modelId' }
                ]
              }
            }
          ],
          as: 'users'
        }
      },
      {
        $addFields: {
          org_enabled: { 
            $ifNull: [
              { $arrayElemAt: ['$orgSettings.enabled', 0] }, 
              true // Default to enabled if not found in organization settings
            ]
          },
          pulled_by_users: {
            $size: {
              $filter: {
                input: '$users',
                as: 'user',
                cond: {
                  $in: ['$_id', '$$user.settings.pulled_models.model_id']
                }
              }
            }
          },
          set_as_default_by_users: {
            $size: {
              $filter: {
                input: '$users',
                as: 'user',
                cond: { $eq: ['$$user.settings.default_model_id', '$_id'] }
              }
            }
          }
        }
      },
      { $sort: sortQuery },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalModels = await AvailableModel.countDocuments(filter);

    // Get analytics
    const analyticsData = await AvailableModel.aggregate([
      { $match: { _id: { $in: allowedModelIds } } },
      {
        $group: {
          _id: null,
          total_models: { $sum: 1 },
          categories: { $addToSet: '$category' },
          tiers: { $addToSet: '$performance_tier' }
        }
      }
    ]);

    const categoryStats = await AvailableModel.aggregate([
      { $match: { _id: { $in: allowedModelIds } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const tierStats = await AvailableModel.aggregate([
      { $match: { _id: { $in: allowedModelIds } } },
      { $group: { _id: '$performance_tier', count: { $sum: 1 } } }
    ]);

    const analytics = {
      total_models: analyticsData[0]?.total_models || 0,
      models_by_category: categoryStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      models_by_tier: tierStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: models,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalModels,
        pages: Math.ceil(totalModels / limit)
      },
      analytics
    });

  } catch (error) {
    console.error("Error fetching organization models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization models"
    });
  }
}

// PUT /api/admin/models/organization/:modelId/toggle - Toggle model availability for organization
export async function toggleOrganizationModel(req, res) {
  try {
    const { modelId } = req.params;
    const { enabled } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required"
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid model ID"
      });
    }

    // Find admin and their organization
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.organization_id) {
      return res.status(404).json({
        success: false,
        error: "Admin or organization not found"
      });
    }

    // Verify model exists
    const model = await AvailableModel.findById(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found"
      });
    }

    // Update organization's allowed models
    const organization = await Organization.findById(admin.organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Initialize settings if needed
    if (!organization.settings) {
      organization.settings = { allowed_models: [] };
    }
    if (!organization.settings.allowed_models) {
      organization.settings.allowed_models = [];
    }

    // Find existing entry
    const existingIndex = organization.settings.allowed_models.findIndex(
      am => am.model_id.toString() === modelId
    );

    if (existingIndex !== -1) {
      // Update existing entry
      organization.settings.allowed_models[existingIndex].enabled = enabled;
    } else {
      // Add new entry
      organization.settings.allowed_models.push({
        model_id: modelId,
        enabled,
        added_at: new Date()
      });
    }

    await organization.save();

    // Invalidate cache
    invalidateModelsCache();

    res.json({
      success: true,
      message: `Model ${enabled ? 'enabled' : 'disabled'} for organization`,
      data: {
        modelId,
        enabled,
        organization_id: organization._id
      }
    });

  } catch (error) {
    console.error("Error toggling organization model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle model availability"
    });
  }
}

// DELETE /api/admin/models/organization/:modelId - Delete model from organization permanently
export async function deleteOrganizationModel(req, res) {
  try {
    const { modelId } = req.params;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required"
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid model ID"
      });
    }

    // Find admin and their organization
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.organization_id) {
      return res.status(404).json({
        success: false,
        error: "Admin or organization not found"
      });
    }

    // Verify model exists
    const model = await AvailableModel.findById(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found"
      });
    }

    // Update organization's allowed models - completely remove the model
    const organization = await Organization.findById(admin.organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Initialize settings if needed
    if (!organization.settings) {
      organization.settings = { allowed_models: [] };
    }
    if (!organization.settings.allowed_models) {
      organization.settings.allowed_models = [];
    }

    // Remove the model from allowed_models array
    const originalLength = organization.settings.allowed_models.length;
    organization.settings.allowed_models = organization.settings.allowed_models.filter(
      am => am.model_id.toString() !== modelId
    );

    const wasRemoved = organization.settings.allowed_models.length < originalLength;

    await organization.save();

    // Invalidate cache
    invalidateModelsCache();

    res.json({
      success: true,
      message: wasRemoved ? 'Model permanently removed from organization' : 'Model was not in organization',
      data: {
        modelId,
        organization_id: admin.organization_id,
        removed: wasRemoved
      }
    });

  } catch (error) {
    console.error("Error deleting organization model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete model from organization"
    });
  }
}

// GET /api/admin/models/organization/analytics - Get detailed analytics for organization models
export async function getOrganizationModelAnalytics(req, res) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required"
      });
    }

    // Find admin and their organization
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.organization_id) {
      return res.status(404).json({
        success: false,
        error: "Admin or organization not found"
      });
    }

    const organization = await Organization.findById(admin.organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Get allowed model IDs
    const allowedModelIds = organization.settings?.allowed_models
      ?.filter(am => am.enabled)
      ?.map(am => am.model_id) || [];

    // Get users in organization and their model usage
    const userStats = await User.aggregate([
      { $match: { organization_id: admin.organization_id } },
      {
        $project: {
          pulled_models: '$settings.pulled_models',
          default_model_id: '$settings.default_model_id',
          total_usage: { $size: { $ifNull: ['$settings.pulled_models', []] } }
        }
      }
    ]);

    // Calculate model usage statistics
    const modelUsage = {};
    let totalPulledModels = 0;
    let usersWithDefaultModel = 0;

    for (const user of userStats) {
      // Count pulled models
      if (user.pulled_models) {
        for (const pm of user.pulled_models) {
          const modelIdStr = pm.model_id.toString();
          if (allowedModelIds.some(id => id.toString() === modelIdStr)) {
            if (!modelUsage[modelIdStr]) {
              modelUsage[modelIdStr] = { pulled_count: 0, default_count: 0 };
            }
            modelUsage[modelIdStr].pulled_count++;
            totalPulledModels++;
          }
        }
      }

      // Count default models
      if (user.default_model_id) {
        const defaultModelIdStr = user.default_model_id.toString();
        if (allowedModelIds.some(id => id.toString() === defaultModelIdStr)) {
          if (!modelUsage[defaultModelIdStr]) {
            modelUsage[defaultModelIdStr] = { pulled_count: 0, default_count: 0 };
          }
          modelUsage[defaultModelIdStr].default_count++;
          usersWithDefaultModel++;
        }
      }
    }

    // Get model details for usage stats
    const modelsWithUsage = await AvailableModel.find({
      _id: { $in: Object.keys(modelUsage).map(id => new mongoose.Types.ObjectId(id)) }
    }).select('display_name category performance_tier');

    const modelUsageWithDetails = modelsWithUsage.map(model => ({
      ...model.toObject(),
      pulled_by_users: modelUsage[model._id.toString()]?.pulled_count || 0,
      set_as_default_by_users: modelUsage[model._id.toString()]?.default_count || 0
    }));

    res.json({
      success: true,
      data: {
        total_users: userStats.length,
        total_allowed_models: allowedModelIds.length,
        total_pulled_models: totalPulledModels,
        users_with_default_model: usersWithDefaultModel,
        model_usage: modelUsageWithDetails,
        top_models: modelUsageWithDetails
          .sort((a, b) => (b.pulled_by_users + b.set_as_default_by_users) - (a.pulled_by_users + a.set_as_default_by_users))
          .slice(0, 5)
      }
    });

  } catch (error) {
    console.error("Error fetching organization model analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics"
    });
  }
}