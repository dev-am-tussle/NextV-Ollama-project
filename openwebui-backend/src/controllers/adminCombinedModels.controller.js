import { Admin } from "../models/admin.model.js";
import { AdminSettings } from "../models/adminSettings.model.js";
import { AvailableModel } from "../models/availableModel.model.js";
import { Organization } from "../models/organization.model.js";
import mongoose from "mongoose";

// GET /api/admin/models/combined - Get combined models for admin dashboard
export async function getAdminCombinedModels(req, res) {
  try {
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required",
        message: "Please log in as an admin to access this resource",
        code: "AUTH_REQUIRED"
      });
    }

    // Validate admin ID format
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid admin ID format",
        message: "The provided admin ID is not in the correct format",
        code: "INVALID_ADMIN_ID"
      });
    }

    // Get combined data using helper function
    const result = await getAdminCombinedModelsData(adminId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        error: result.error,
        message: result.message,
        code: result.code || "PROCESSING_ERROR",
        timestamp: new Date().toISOString()
      });
    }

    // Build successful response
    const response = {
      success: true,
      message: "Models retrieved successfully",
      data: result.data,
      timestamp: new Date().toISOString()
    };

    return res.json(response);

  } catch (error) {
    console.error("Error fetching admin combined models:", error);
    
    // Enhanced error handling with user-friendly messages
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let userMessage = "An unexpected error occurred while fetching models";
    let technicalMessage = error.message;

    if (error.name === 'CastError') {
      statusCode = 400;
      errorCode = "INVALID_ID";
      userMessage = "Invalid ID format provided";
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorCode = "VALIDATION_ERROR";
      userMessage = "Data validation failed";
    } else if (error.code === 11000) {
      statusCode = 409;
      errorCode = "DUPLICATE_ERROR";
      userMessage = "Duplicate data found";
    }

    return res.status(statusCode).json({
      success: false,
      error: userMessage,
      message: "Failed to retrieve models. Please try again or contact support if the issue persists.",
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        technical_error: technicalMessage,
        stack: error.stack
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/admin/models/statistics - Get detailed statistics for admin dashboard
export async function getAdminModelsStatistics(req, res) {
  try {
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin authentication required",
        message: "Please log in as an admin to access this resource"
      });
    }

    // Get combined models data
    const combinedData = await getAdminCombinedModelsData(adminId);
    
    if (!combinedData.success) {
      return res.status(combinedData.statusCode || 500).json(combinedData);
    }

    const { models, statistics, external_apis } = combinedData.data;

    // Calculate additional statistics
    const providerStats = {};
    models.combined.forEach(model => {
      const provider = model.provider || 'unknown';
      providerStats[provider] = (providerStats[provider] || 0) + 1;
    });

    // Model sizes distribution
    const sizeStats = {};
    models.combined.forEach(model => {
      if (model.size && model.size !== 'Unknown') {
        const sizeCategory = categorizeModelSize(model.size);
        sizeStats[sizeCategory] = (sizeStats[sizeCategory] || 0) + 1;
      }
    });

    const enhancedStatistics = {
      ...statistics,
      providers: providerStats,
      size_distribution: sizeStats,
      external_api_status: {
        active_apis: external_apis.active_count,
        total_apis: external_apis.total_count,
        avg_models_per_api: external_apis.active_count > 0 
          ? Math.round(statistics.external_models / external_apis.active_count) 
          : 0
      }
    };

    return res.json({
      success: true,
      message: "Statistics retrieved successfully",
      data: enhancedStatistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching admin models statistics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve statistics",
      message: "An error occurred while calculating model statistics",
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to get combined models data (reusable)
async function getAdminCombinedModelsData(adminId) {
  try {
    // Find admin and their organization
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return {
        success: false,
        statusCode: 404,
        error: "Admin not found",
        message: "The admin account could not be found in our system"
      };
    }

    if (!admin.organization_id) {
      return {
        success: false,
        statusCode: 400,
        error: "Admin organization not configured",
        message: "This admin account is not associated with any organization"
      };
    }

    // Get organization details
    const organization = await Organization.findById(admin.organization_id);
    if (!organization) {
      return {
        success: false,
        statusCode: 404,
        error: "Organization not found",
        message: "The admin's organization could not be found"
      };
    }

    // Get admin settings for external APIs
    let adminSettings = await AdminSettings.findOne({ admin_id: adminId });
    if (!adminSettings) {
      // Initialize admin settings if they don't exist
      adminSettings = new AdminSettings({
        admin_id: adminId,
        settings: {
          external_apis: [],
          pulled_models: []
        }
      });
      await adminSettings.save();
    }

    // 1. Get Organization Allowed Models
    const orgAllowedModelIds = organization.settings?.allowed_models
      ?.filter(am => am.enabled)
      ?.map(am => am.model_id) || [];

    let organizationModels = [];
    if (orgAllowedModelIds.length > 0) {
      organizationModels = await AvailableModel.find({ 
        _id: { $in: orgAllowedModelIds },
        is_active: true 
      }).select('_id name display_name description size category tags performance_tier min_ram_gb provider model_family parameters use_cases');
    }

    // 2. Get External API Models from ALL organization admins
    const externalApiModels = [];
    
    // Find all admins in the same organization
    const allOrgAdmins = await Admin.find({ organization_id: admin.organization_id });
    const orgAdminIds = allOrgAdmins.map(a => a._id);
    
    
    // Get external API settings from all organization admins
    const allAdminSettings = await AdminSettings.find({ 
      admin_id: { $in: orgAdminIds }
    });
    
    
    // Filter only those with external APIs
    const adminSettingsWithAPIs = allAdminSettings.filter(setting => 
      setting.settings?.external_apis && 
      Array.isArray(setting.settings.external_apis) && 
      setting.settings.external_apis.length > 0
    );
    
    
    // Collect all unique external API models from all org admins
    const seenModels = new Set(); // To track duplicates
    const activeExternalApis = [];
    
    for (const adminSetting of adminSettingsWithAPIs) {
      const adminApis = adminSetting.settings?.external_apis?.filter(api => api.is_active) || [];
      
      for (const api of adminApis) {
        
        // Add to active APIs list (for summary)
        activeExternalApis.push({
          id: api._id,
          name: api.name,
          provider: api.provider,
          admin_id: adminSetting.admin_id,
          models_count: api.metadata?.selectedModels?.length || api.metadata?.models?.length || 0,
          last_validated: api.last_validated,
          is_active: api.is_active
        });
        
        // Check both selectedModels and models for backward compatibility
        const selectedModels = api.metadata?.selectedModels || api.metadata?.models || [];
        
        for (const model of selectedModels) {
          // Create unique identifier to avoid duplicates across admins
          const modelKey = `${api.provider}_${model.id || model.name}`;
          
          if (!seenModels.has(modelKey)) {
            seenModels.add(modelKey);
            
            externalApiModels.push({
              _id: `external_${api.provider}_${model.id || model.name}`, // Unique ID for external models
              name: model.name || model.id,
              display_name: model.name || model.id,
              description: model.description || `External model from ${api.provider}`,
              size: model.size || 'API',
              category: 'external',
              tags: ['external', api.provider],
              performance_tier: model.performance_tier || 'balanced',
              min_ram_gb: model.min_ram_gb || 4,
              provider: api.provider,
              model_family: model.model_family || 'external',
              parameters: model.parameters || model.context_length?.toString() || '-',
              use_cases: model.use_cases || ['general'],
              // External model specific fields
              external_source: {
                api_name: api.name,
                api_id: api._id,
                provider: api.provider,
                model_id: model.id,
                context_length: model.context_length,
                admin_id: adminSetting.admin_id // Track which admin added this API
              }
            });
          }
        }
      }
    }
    

    // 3. Calculate Statistics
    const totalOrganizationModels = organizationModels.length;
    const totalExternalModels = externalApiModels.length;
    const totalModels = totalOrganizationModels + totalExternalModels;

    // 4. Categorize by Performance Tier
    const allModels = [...organizationModels, ...externalApiModels];
    const modelsByTier = {
      fast: allModels.filter(m => m.performance_tier === 'fast').length,
      balanced: allModels.filter(m => m.performance_tier === 'balanced').length,
      powerful: allModels.filter(m => m.performance_tier === 'powerful').length
    };

    // 5. Categorize by Category
    const modelsByCategory = {};
    allModels.forEach(model => {
      const category = model.category || 'other';
      modelsByCategory[category] = (modelsByCategory[category] || 0) + 1;
    });

    // 6. Active External APIs Summary (already collected above)
    const uniqueApisSummary = [];
    const seenApis = new Set();
    
    for (const api of activeExternalApis) {
      const apiKey = `${api.provider}_${api.name}`;
      if (!seenApis.has(apiKey)) {
        seenApis.add(apiKey);
        uniqueApisSummary.push({
          id: api.id,
          name: api.name,
          provider: api.provider,
          models_count: api.models_count,
          last_validated: api.last_validated,
          is_active: api.is_active,
          admin_id: api.admin_id
        });
      }
    }

    // Count total external APIs across all org admins
    const totalExternalApisCount = adminSettingsWithAPIs.reduce((total, setting) => {
      return total + (setting.settings?.external_apis?.length || 0);
    }, 0);

    return {
      success: true,
      data: {
        models: {
          organization: organizationModels,
          external_apis: externalApiModels,
          combined: allModels
        },
        statistics: {
          total_models: totalModels,
          organization_models: totalOrganizationModels,
          external_models: totalExternalModels,
          models_by_tier: modelsByTier,
          models_by_category: modelsByCategory
        },
        external_apis: {
          active_count: uniqueApisSummary.length,
          total_count: totalExternalApisCount,
          apis: uniqueApisSummary
        },
        admin_info: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          organization: {
            id: organization._id,
            name: organization.name,
            allowed_models_count: orgAllowedModelIds.length
          }
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      error: error.message,
      message: "An unexpected error occurred while processing models data"
    };
  }
}

// Helper function to categorize model size
function categorizeModelSize(sizeString) {
  const size = sizeString.toLowerCase();
  if (size.includes('gb')) {
    const num = parseFloat(size);
    if (num <= 2) return 'small';
    if (num <= 8) return 'medium';
    return 'large';
  }
  if (size.includes('mb')) {
    return 'small';
  }
  return 'unknown';
}