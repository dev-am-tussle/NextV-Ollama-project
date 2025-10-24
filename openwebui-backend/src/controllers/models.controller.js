import { AvailableModel } from "../models/availableModel.model.js";
import { User, UserSettings } from "../models/user.models.js";
import { Organization } from "../models/organization.model.js";
import { pullModel, verifyModelInstalled, removeModel } from "../services/ollama.service.js";
import { 
  getUserCategorizedModels, 
  getAdminCategorizedModels,
  markModelAsDownloaded,
  updateModelUsage 
} from "../services/modelManagement.service.js";
import { decryptApiKey } from "../utils/encryption.js";
import { getProviderModels } from "../adapters/index.js";
import { formatModelsResponse } from "../utils/providerTools.js";

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

// POST /api/v1/models/pull - Pull a model with real-time progress
export async function pullModelWithProgress(req, res) {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: "Model name is required"
      });
    }

    // Verify model exists in our catalog
    const modelDoc = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });

    if (!modelDoc) {
      return res.status(404).json({
        success: false,
        error: "Model not found in catalog"
      });
    }

    // Set up SSE headers for real-time progress streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write('data: {"type":"heartbeat"}\n\n');
    }, 30000);

    // Progress callback
    const onProgress = (progressInfo) => {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        ...progressInfo
      })}\n\n`);
    };

    // Error callback
    const onError = (error) => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.userMessage || error.message,
        code: error.code || 'UNKNOWN_ERROR',
        suggestions: error.suggestions || []
      })}\n\n`);
      clearInterval(keepAlive);
      res.end();
    };

    // Completion callback
    const onComplete = async (result) => {
      try {
        // Verify the model was actually installed
        const isInstalled = await verifyModelInstalled(modelName);
        
        if (isInstalled) {
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            modelName: modelName,
            message: `Successfully downloaded ${modelName}`
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: `Model ${modelName} download completed but verification failed`,
            code: 'VERIFICATION_FAILED',
            suggestions: ['Try downloading again', 'Check disk space', 'Contact support']
          })}\n\n`);
        }
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Failed to verify model installation',
          code: 'VERIFICATION_ERROR',
          suggestions: ['Try downloading again', 'Contact support']
        })}\n\n`);
      }
      
      clearInterval(keepAlive);
      res.end();
    };

    // Start the actual model pull
    await pullModel(modelName, onProgress, onError, onComplete);

  } catch (error) {
    console.error("Error in pullModelWithProgress:", error);
    
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.userMessage || error.message || 'Unknown error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        suggestions: error.suggestions || ['Try again later', 'Contact support']
      })}\n\n`);
      res.end();
    } catch (writeError) {
      console.error("Failed to write error response:", writeError);
    }
  }
}

// DELETE /api/v1/models/remove - Remove a pulled model
export async function removeModelFromSystem(req, res) {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: "Model name is required"
      });
    }

    // Remove from Ollama
    await removeModel(modelName);

    res.json({
      success: true,
      message: `Successfully removed ${modelName}`,
      modelName
    });

  } catch (error) {
    console.error("Error removing model:", error);
    
    res.status(500).json({
      success: false,
      error: error.userMessage || error.message || "Failed to remove model",
      code: error.code || 'REMOVE_ERROR',
      suggestions: error.suggestions || ['Try again later', 'Contact support']
    });
  }
}

// GET /api/v1/models/categorized - Get categorized models for user dropdown
export async function getUserCategorizedModelsController(req, res) {
  try {
    const userId = req.user.id; // From auth middleware
    
    const categorizedModels = await getUserCategorizedModels(userId);
    
    res.json({
      success: true,
      data: categorizedModels
    });
  } catch (error) {
    console.error("Error fetching user categorized models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categorized models"
    });
  }
}

// GET /api/v1/models/admin-categorized - Get categorized models for admin dropdown
export async function getAdminCategorizedModelsController(req, res) {
  try {
    const adminId = req.admin?.id || req.user?.id; // Support both admin and user tokens
    
    const categorizedModels = await getAdminCategorizedModels(adminId);
    
    res.json({
      success: true,
      data: categorizedModels
    });
  } catch (error) {
    console.error("Error fetching admin categorized models:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch admin categorized models"
    });
  }
}

// POST /api/v1/models/mark-downloaded - Mark a model as downloaded by user
export async function markModelAsDownloadedController(req, res) {
  try {
    const userId = req.user.id;
    const { modelId, downloadInfo } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "Model ID is required"
      });
    }
    
    const result = await markModelAsDownloaded(userId, modelId, downloadInfo);
    
    res.json({
      success: true,
      message: "Model marked as downloaded successfully",
      data: result
    });
  } catch (error) {
    console.error("Error marking model as downloaded:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark model as downloaded"
    });
  }
}

// POST /api/v1/models/update-usage - Update model usage stats
export async function updateModelUsageController(req, res) {
  try {
    const userId = req.user.id;
    const { modelId } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "Model ID is required"
      });
    }
    
    await updateModelUsage(userId, modelId);
    
    res.json({
      success: true,
      message: "Model usage updated successfully"
    });
  } catch (error) {
    console.error("Error updating model usage:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update model usage"
    });
  }
}

// GET /api/v1/models/user/:id/list - Get categorized models for specific user
export async function getUserModelsList(req, res) {
  try {
    const { id: userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Get user settings to find pulled models
    const userSettings = await UserSettings.findOne({ user_id: userId });
    const pulledModelIds = userSettings?.pulled_models?.map(pm => pm.model_id.toString()) || [];

    // Get organization and its allowed models
    let orgAllowedModelIds = [];
    let organization = null;
    if (user.organization_id) {
      organization = await Organization.findById(user.organization_id);
      orgAllowedModelIds = organization?.settings?.allowed_models
        ?.filter(am => am.enabled)
        ?.map(am => am.model_id.toString()) || [];
    }

    // Get all available models
    const allModels = await AvailableModel.find({ is_active: true })
      .select('-created_at -updated_at')
      .sort({ model_family: 1, parameters: 1 });

    // Categorize models
    const downloaded = [];
    const availableToDownload = [];
    const availableGlobal = [];

    allModels.forEach(model => {
      const modelIdStr = model._id.toString();
      
      if (pulledModelIds.includes(modelIdStr)) {
        // User has downloaded this model
        downloaded.push(model);
      } else if (orgAllowedModelIds.includes(modelIdStr)) {
        // Model is in org's allowed list but not downloaded
        availableToDownload.push(model);
      } else {
        // Model is globally available but not in org's allowed list
        availableGlobal.push(model);
      }
    });

    res.json({
      success: true,
      data: {
        downloaded,
        availableToDownload,
        availableGlobal
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: organization ? {
          id: organization._id,
          name: organization.name
        } : null
      }
    });

  } catch (error) {
    console.error("Error fetching user models list:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch user models list"
    });
  }
}

/**
 * Get all available models for the user from all connected providers
 */
export async function getUserAvailableModels(req, res) {
  try {
    const userId = req.user.id;
    
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Get all active external APIs
    const activeApis = userSettings.external_apis.filter(api => api.is_active);
    
    if (activeApis.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No active API keys found. Connect an external provider to see available models."
      });
    }

    const allModels = [];
    const providerResults = [];

    // Fetch models from each active provider
    for (const api of activeApis) {
      try {
        // Decrypt API key
        const decryptedKey = decryptApiKey(api.api_key);
        
        // Get models from provider using adapter
        const result = await getProviderModels(api.provider, decryptedKey);
        
        if (result.success) {
          const formattedModels = formatModelsResponse(result.models || [], api.provider);
          allModels.push(...formattedModels);
          
          providerResults.push({
            provider: api.provider,
            name: api.name,
            success: true,
            modelCount: formattedModels.length,
            models: formattedModels
          });
        } else {
          providerResults.push({
            provider: api.provider,
            name: api.name,
            success: false,
            error: result.error,
            modelCount: 0
          });
        }
      } catch (error) {
        console.error(`Error fetching models for ${api.provider}:`, error.message);
        providerResults.push({
          provider: api.provider,
          name: api.name,
          success: false,
          error: error.message,
          modelCount: 0
        });
      }
    }

    res.json({
      success: true,
      data: allModels,
      totalModels: allModels.length,
      providerResults,
      activeProviders: activeApis.length
    });

  } catch (error) {
    console.error("Error fetching available models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch available models"
    });
  }
}

/**
 * Refresh models from all connected providers and update cache
 */
export async function refreshUserModels(req, res) {
  try {
    const userId = req.user.id;
    
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Get all active external APIs
    const activeApis = userSettings.external_apis.filter(api => api.is_active);
    
    if (activeApis.length === 0) {
      return res.json({
        success: true,
        message: "No active API keys to refresh",
        refreshed: 0
      });
    }

    let refreshedCount = 0;
    const refreshResults = [];

    // Refresh models for each active provider
    for (const api of activeApis) {
      try {
        // Decrypt API key
        const decryptedKey = decryptApiKey(api.api_key);
        
        // Get fresh models from provider
        const result = await getProviderModels(api.provider, decryptedKey);
        
        if (result.success) {
          const formattedModels = formatModelsResponse(result.models || [], api.provider);
          
          // Update metadata in database
          api.metadata = {
            ...api.metadata,
            models: formattedModels,
            modelCount: formattedModels.length,
            lastRefreshed: new Date()
          };
          api.last_validated = new Date();
          
          refreshedCount++;
          refreshResults.push({
            provider: api.provider,
            name: api.name,
            success: true,
            modelCount: formattedModels.length
          });
        } else {
          refreshResults.push({
            provider: api.provider,
            name: api.name,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Error refreshing models for ${api.provider}:`, error.message);
        refreshResults.push({
          provider: api.provider,
          name: api.name,
          success: false,
          error: error.message
        });
      }
    }

    // Save updated settings
    await userSettings.save();

    res.json({
      success: true,
      message: `Refreshed models for ${refreshedCount} providers`,
      refreshed: refreshedCount,
      total: activeApis.length,
      results: refreshResults
    });

  } catch (error) {
    console.error("Error refreshing models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh models"
    });
  }
}

/**
 * GET /api/v1/models/unified - Get unified models from all sources (admin, org, user)
 * Combines admin external APIs, organization models, and user models with source tagging
 */
export async function getUnifiedModels(req, res) {
  try {
    const userId = req.user.id;
    
    // Find the user and their organization
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const unifiedModels = {
      admin: [],
      organization: [],
      user: [],
      local: []
    };
    const sourceSummary = {
      admin: { count: 0, providers: [] },
      organization: { count: 0, providers: [] },
      user: { count: 0, providers: [] },
      local: { count: 0, models: [] }
    };

    // 1. Get Admin External APIs (from AdminSettings)
    try {
      const { AdminSettings } = await import("../models/adminSettings.model.js");
      const adminSettings = await AdminSettings.findOne({ 
        admin_id: user.organization_id || user._id // Admin could be org admin or super admin
      });
      
      if (adminSettings && adminSettings.settings.external_apis) {
        const activeAdminApis = adminSettings.settings.external_apis.filter(api => api.is_active);
        
        for (const api of activeAdminApis) {
          if (api.metadata && api.metadata.models) {
            const adminModels = api.metadata.models.map(model => ({
              ...model,
              source: 'admin',
              provider: api.provider,
              apiName: api.name,
              _id: `admin-${api.provider}-${model.id}`,
              external_model_id: model.id,
              external_model_name: model.name
            }));
            
            unifiedModels.admin.push(...adminModels);
            sourceSummary.admin.count += adminModels.length;
            if (!sourceSummary.admin.providers.includes(api.provider)) {
              sourceSummary.admin.providers.push(api.provider);
            }
          }
        }
      }
    } catch (adminError) {
      console.error("Error fetching admin external APIs:", adminError);
      // Continue processing other sources even if admin fetch fails
    }

    // 2. Get Organization Models (from organization's allowed_models)
    if (user.organization_id) {
      try {
        const organization = await Organization.findById(user.organization_id);
        if (organization && organization.settings && organization.settings.allowed_models) {
          const orgModelIds = organization.settings.allowed_models
            .filter(am => am.enabled)
            .map(am => am.model_id);
          
          if (orgModelIds.length > 0) {
            const orgModels = await AvailableModel.find({
              _id: { $in: orgModelIds },
              is_active: true
            });
            
            const orgModelsWithSource = orgModels.map(model => ({
              ...model.toObject(),
              source: 'organization',
              organizationName: organization.name,
              _id: `org-${model._id}`
            }));
            
            unifiedModels.organization = orgModelsWithSource;
            sourceSummary.organization.count = orgModelsWithSource.length;
            sourceSummary.organization.providers = ['local']; // Organization models are local models
          }
        }
      } catch (orgError) {
        console.error("Error fetching organization models:", orgError);
      }
    }

    // 3. Get User External APIs (from UserSettings)
    try {
      const userSettings = await UserSettings.findOne({ user_id: userId });
      if (userSettings && userSettings.external_apis) {
        const activeUserApis = userSettings.external_apis.filter(api => api.is_active);
        
        for (const api of activeUserApis) {
          if (api.metadata && api.metadata.models) {
            const userModels = api.metadata.models.map(model => ({
              ...model,
              source: 'user',
              provider: api.provider,
              apiName: api.name,
              _id: `user-${api.provider}-${model.id}`,
              external_model_id: model.id,
              external_model_name: model.name
            }));
            
            unifiedModels.user.push(...userModels);
            sourceSummary.user.count += userModels.length;
            if (!sourceSummary.user.providers.includes(api.provider)) {
              sourceSummary.user.providers.push(api.provider);
            }
          }
        }
      }
    } catch (userError) {
      console.error("Error fetching user external APIs:", userError);
    }

    // 4. Get Local Models (downloaded/pulled models)
    try {
      const userSettings = await UserSettings.findOne({ user_id: userId });
      if (userSettings && userSettings.pulled_models) {
        const pulledModelIds = userSettings.pulled_models.map(pm => pm.model_id);
        
        if (pulledModelIds.length > 0) {
          const localModels = await AvailableModel.find({
            _id: { $in: pulledModelIds },
            is_active: true
          });
          
          const localModelsWithSource = localModels.map(model => {
            const pulledInfo = userSettings.pulled_models.find(pm => 
              pm.model_id.toString() === model._id.toString()
            );
            
            return {
              ...model.toObject(),
              source: 'local',
              _id: `local-${model._id}`,
              pulledAt: pulledInfo?.pulled_at,
              usageCount: pulledInfo?.usage_count || 0,
              lastUsed: pulledInfo?.last_used
            };
          });
          
          unifiedModels.local = localModelsWithSource;
          sourceSummary.local.count = localModelsWithSource.length;
          sourceSummary.local.models = localModelsWithSource.map(m => m.name);
        }
      }
    } catch (localError) {
      console.error("Error fetching local models:", localError);
    }

    // Calculate totals
    const totalModels = Object.values(unifiedModels).reduce((sum, models) => sum + models.length, 0);

    res.json({
      success: true,
      data: unifiedModels,
      summary: {
        total: totalModels,
        sources: sourceSummary,
        user: {
          id: user._id,
          name: user.name,
          organizationId: user.organization_id
        }
      }
    });

  } catch (error) {
    console.error("Error fetching unified models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch unified models"
    });
  }
}