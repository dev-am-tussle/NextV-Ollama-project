import { User, UserSettings } from "../models/user.models.js";
import { Organization } from "../models/organization.model.js";
import { AvailableModel } from "../models/availableModel.model.js";
import { Admin } from "../models/admin.model.js";

/**
 * Model Management Service
 * Handles categorized model data for user and admin dropdowns
 */

/**
 * Get user's downloaded models (from pulled_models)
 * @param {string} userId - User ID
 * @returns {Array} Downloaded models with usage stats
 */
export async function getUserDownloadedModels(userId) {
  try {
    const userSettings = await UserSettings.findOne({ user_id: userId })
      .populate({
        path: 'pulled_models.model_id',
        model: 'AvailableModel',
        select: 'name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb'
      })
      .lean();

    if (!userSettings || !userSettings.pulled_models) {
      return [];
    }

    return userSettings.pulled_models.map(pulled => ({
      ...pulled.model_id,
      download_info: {
        pulled_at: pulled.pulled_at,
        usage_count: pulled.usage_count,
        last_used: pulled.last_used,
        local_path: pulled.local_path,
        file_size: pulled.file_size,
        download_status: pulled.download_status
      },
      category: 'downloaded'
    }));
  } catch (error) {
    console.error('Error fetching user downloaded models:', error);
    return [];
  }
}

/**
 * Get organization's available models that user hasn't downloaded yet
 * @param {string} userId - User ID
 * @returns {Array} Available to download models
 */
export async function getUserAvailableToDownload(userId) {
  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.organization_id) {
      return [];
    }

    const [organization, userSettings] = await Promise.all([
      Organization.findById(user.organization_id)
        .populate({
          path: 'settings.allowed_models.model_id',
          model: 'AvailableModel',
          select: 'name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb'
        })
        .lean(),
      UserSettings.findOne({ user_id: userId }).lean()
    ]);

    if (!organization || !organization.settings.allowed_models) {
      return [];
    }

    // Get IDs of models user has already downloaded
    const downloadedModelIds = userSettings?.pulled_models?.map(
      pulled => pulled.model_id.toString()
    ) || [];

    // Filter organization models that user hasn't downloaded
    const availableToDownload = organization.settings.allowed_models
      .filter(allowedModel => 
        allowedModel.enabled && 
        !downloadedModelIds.includes(allowedModel.model_id._id.toString())
      )
      .map(allowedModel => ({
        ...allowedModel.model_id,
        organization_info: {
          added_at: allowedModel.added_at,
          purchase_details: allowedModel.purchase_details,
          usage_stats: allowedModel.usage_stats
        },
        category: 'available_to_download'
      }));

    return availableToDownload;
  } catch (error) {
    console.error('Error fetching available to download models:', error);
    return [];
  }
}

/**
 * Get all available models from superadmin that organization hasn't purchased
 * @param {string} userId - User ID (to determine organization)
 * @returns {Array} All available models for purchase
 */
export async function getAvailableModelsToPurchase(userId) {
  try {
    const user = await User.findById(userId).lean();
    
    let organizationModelIds = [];
    if (user && user.organization_id) {
      const organization = await Organization.findById(user.organization_id).lean();
      organizationModelIds = organization?.settings?.allowed_models?.map(
        allowed => allowed.model_id.toString()
      ) || [];
    }

    // Get all active models from superadmin that org hasn't purchased
    const availableModels = await AvailableModel.find({
      is_active: true,
      _id: { $nin: organizationModelIds }
    })
    .select('name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb pricing_info')
    .lean();

    return availableModels.map(model => ({
      ...model,
      category: 'available_to_purchase'
    }));
  } catch (error) {
    console.error('Error fetching available models to purchase:', error);
    return [];
  }
}

/**
 * Get categorized models for user dropdown
 * @param {string} userId - User ID
 * @returns {Object} Categorized models
 */
export async function getUserCategorizedModels(userId) {
  try {
    const [downloadedModels, availableToDownload, availableToPurchase] = await Promise.all([
      getUserDownloadedModels(userId),
      getUserAvailableToDownload(userId),
      getAvailableModelsToPurchase(userId)
    ]);

    return {
      downloaded_models: downloadedModels,
      available_to_download: availableToDownload,
      available_to_purchase: availableToPurchase,
      summary: {
        total_downloaded: downloadedModels.length,
        total_available_to_download: availableToDownload.length,
        total_available_to_purchase: availableToPurchase.length
      }
    };
  } catch (error) {
    console.error('Error fetching user categorized models:', error);
    throw new Error('Failed to fetch user models');
  }
}

/**
 * Get categorized models for admin dropdown
 * @param {string} adminId - Admin ID
 * @returns {Object} Categorized models for admin view
 */
export async function getAdminCategorizedModels(adminId) {
  try {
    const admin = await Admin.findById(adminId).lean();
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Super admin sees all models, org admin sees organization models
    if (admin.admin_type === 'super_admin') {
      const allModels = await AvailableModel.find({ is_active: true })
        .select('name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb pricing_info')
        .lean();

      return {
        all_models: allModels.map(model => ({ ...model, category: 'superadmin_model' })),
        summary: {
          total_models: allModels.length
        }
      };
    }

    // Org admin sees organization's purchased models + available to purchase
    if (!admin.organization_id) {
      throw new Error('Organization admin must be assigned to an organization');
    }

    const [organization, availableToPurchase] = await Promise.all([
      Organization.findById(admin.organization_id)
        .populate({
          path: 'settings.allowed_models.model_id',
          model: 'AvailableModel',
          select: 'name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb'
        })
        .lean(),
      getAvailableModelsToPurchase(null) // Pass null to get all available models
    ]);

    const organizationModels = organization?.settings?.allowed_models?.map(allowed => ({
      ...allowed.model_id,
      organization_info: {
        added_at: allowed.added_at,
        purchase_details: allowed.purchase_details,
        usage_stats: allowed.usage_stats,
        enabled: allowed.enabled
      },
      category: 'organization_model'
    })) || [];

    return {
      organization_models: organizationModels,
      available_to_purchase: availableToPurchase,
      summary: {
        total_organization_models: organizationModels.length,
        total_available_to_purchase: availableToPurchase.length
      }
    };
  } catch (error) {
    console.error('Error fetching admin categorized models:', error);
    throw new Error('Failed to fetch admin models');
  }
}

/**
 * Mark model as downloaded by user (add to pulled_models)
 * @param {string} userId - User ID
 * @param {string} modelId - Model ID
 * @param {Object} downloadInfo - Download information
 * @returns {Object} Updated user settings
 */
export async function markModelAsDownloaded(userId, modelId, downloadInfo = {}) {
  try {
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      throw new Error('User settings not found');
    }

    // Check if model is already downloaded
    const existingPull = userSettings.pulled_models.find(
      pulled => pulled.model_id.toString() === modelId
    );

    if (existingPull) {
      throw new Error('Model already downloaded');
    }

    // Add to pulled models
    userSettings.pulled_models.push({
      model_id: modelId,
      pulled_at: new Date(),
      usage_count: 0,
      last_used: null,
      local_path: downloadInfo.local_path || null,
      file_size: downloadInfo.file_size || 0,
      download_status: downloadInfo.download_status || 'completed'
    });

    await userSettings.save();

    // Update organization usage stats
    const user = await User.findById(userId).lean();
    if (user.organization_id) {
      await Organization.updateOne(
        {
          _id: user.organization_id,
          'settings.allowed_models.model_id': modelId
        },
        {
          $inc: { 'settings.allowed_models.$.usage_stats.total_downloads': 1 },
          $set: { 'settings.allowed_models.$.usage_stats.last_used': new Date() }
        }
      );
    }

    return userSettings;
  } catch (error) {
    console.error('Error marking model as downloaded:', error);
    throw error;
  }
}

/**
 * Update model usage stats
 * @param {string} userId - User ID
 * @param {string} modelId - Model ID
 * @returns {Object} Updated stats
 */
export async function updateModelUsage(userId, modelId) {
  try {
    await UserSettings.updateOne(
      {
        user_id: userId,
        'pulled_models.model_id': modelId
      },
      {
        $inc: { 'pulled_models.$.usage_count': 1 },
        $set: { 'pulled_models.$.last_used': new Date() }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating model usage:', error);
    throw error;
  }
}

// Legacy functions for backward compatibility
export async function addPulledModel(userId, modelName) {
  try {
    const model = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });
    
    if (!model) {
      throw new Error(`Model ${modelName} not found in available models`);
    }

    await markModelAsDownloaded(userId, model._id);

    return {
      success: true,
      message: `Model ${modelName} added to pulled models`,
      model: model
    };
  } catch (error) {
    console.error("Failed to add pulled model:", error);
    throw error;
  }
}

export async function removePulledModel(userId, modelName) {
  try {
    const model = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });
    
    if (!model) {
      throw new Error(`Model ${modelName} not found in available models`);
    }

    await UserSettings.updateOne(
      { user_id: userId },
      { $pull: { pulled_models: { model_id: model._id } } }
    );

    return {
      success: true,
      message: `Model ${modelName} removed from pulled models`
    };
  } catch (error) {
    console.error("Failed to remove pulled model:", error);
    throw error;
  }
}

export async function getUserPulledModels(userId) {
  try {
    const downloadedModels = await getUserDownloadedModels(userId);
    return {
      success: true,
      data: downloadedModels,
      count: downloadedModels.length
    };
  } catch (error) {
    console.error("Failed to get user pulled models:", error);
    throw error;
  }
}