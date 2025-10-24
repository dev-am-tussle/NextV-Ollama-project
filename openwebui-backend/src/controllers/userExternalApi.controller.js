import { User, UserSettings } from "../models/user.models.js";
import mongoose from "mongoose";
import { encryptApiKey, decryptApiKey } from "../utils/encryption.js";
import { autoDetectAndValidate, formatModelsResponse, getSupportedProviders } from "../utils/providerTools.js";

// GET /api/user/external-apis - Get all external APIs for user
export async function getUserExternalApis(req, res) {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      // Initialize user settings if they don't exist
      try {
        const newUserSettings = new UserSettings({
          user_id: userId,
          external_apis: [],
          pulled_models: []
        });
        await newUserSettings.save();
        
        return res.json({
          success: true,
          data: [],
          message: "User settings initialized"
        });
      } catch (initError) {
        console.error("Error initializing user settings:", initError);
        return res.status(500).json({
          success: false,
          error: "Failed to initialize user settings",
          code: "INIT_ERROR"
        });
      }
    }

    // Ensure external_apis array exists
    if (!userSettings.external_apis) {
      userSettings.external_apis = [];
      await userSettings.save();
    }

    // Map APIs to mask the key with enhanced error handling
    const maskedApis = userSettings.external_apis.map(api => {
      try {
        const maskedKey = api.api_key && api.api_key.length > 8 
          ? `${api.api_key.substring(0, 4)}...${api.api_key.slice(-4)}`
          : '****';
        
        return {
          ...api.toObject(),
          api_key: maskedKey
        };
      } catch (maskError) {
        console.error("Error masking API key:", maskError);
        return {
          ...api.toObject(),
          api_key: '****'
        };
      }
    });

    res.json({
      success: true,
      data: maskedApis,
      count: maskedApis.length
    });
  } catch (error) {
    console.error("Error fetching user external APIs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch external APIs",
      code: "FETCH_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// POST /api/user/external-apis/validate - Validate user API key
export async function validateUserApiKey(req, res) {
  try {
    const userId = req.user.id;
    const { apiKey, provider, name } = req.body;

    // Enhanced input validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Valid API key is required",
        code: "INVALID_API_KEY"
      });
    }

    if (apiKey.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "API key is too short",
        code: "API_KEY_TOO_SHORT"
      });
    }

    if (provider && typeof provider !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Provider must be a valid string",
        code: "INVALID_PROVIDER"
      });
    }

    let result;
    try {
      // Use auto-detection if no provider specified
      result = await autoDetectAndValidate(apiKey.trim(), provider);
    } catch (validationError) {
      console.error("Provider validation error:", validationError);
      return res.status(400).json({
        success: false,
        error: "Failed to validate API key with provider",
        code: "VALIDATION_FAILED",
        details: validationError.message,
        supportedProviders: getSupportedProviders()
      });
    }

    if (result.valid) {
      let formattedModels = [];
      try {
        // Format models for consistent response
        formattedModels = formatModelsResponse(result.models || [], result.provider);
      } catch (formatError) {
        console.error("Error formatting models:", formatError);
        // Continue with validation success even if model formatting fails
        formattedModels = result.models || [];
      }
      
      // If this is for an existing API key (name provided), update last_validated
      if (name && userId) {
        try {
          const userSettings = await UserSettings.findOne({ user_id: userId });
          if (userSettings && userSettings.external_apis) {
            const existingApi = userSettings.external_apis.find(api => api.name === name);
            if (existingApi) {
              existingApi.last_validated = new Date();
              existingApi.updated_at = new Date();
              existingApi.metadata = {
                ...existingApi.metadata,
                models: formattedModels,
                modelCount: formattedModels.length,
                lastRefreshed: new Date()
              };
              await userSettings.save();
              console.log(`Updated last_validated for user API key: ${name}`);
            }
          }
        } catch (updateError) {
          console.error("Error updating user last_validated time:", updateError);
          // Don't fail the validation, just log the error
        }
      }
      
      res.json({
        success: true,
        valid: true,
        provider: result.provider,
        models: formattedModels,
        modelCount: formattedModels.length,
        detectedAutomatically: result.detectedAutomatically || false,
        validatedAt: new Date().toISOString(),
        message: `User API key validated successfully with ${result.provider}`
      });
    } else {
      // Enhanced error response for validation failures
      const errorResponse = {
        success: false,
        valid: false,
        error: result.error || "API key validation failed",
        code: "VALIDATION_FAILED",
        supportedProviders: getSupportedProviders()
      };

      // Add specific error codes based on error message
      const errorMessage = result.error?.toLowerCase() || '';
      if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        errorResponse.code = "UNAUTHORIZED";
      } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        errorResponse.code = "FORBIDDEN";
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorResponse.code = "RATE_LIMITED";
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        errorResponse.code = "NETWORK_ERROR";
      }

      res.status(400).json(errorResponse);
    }

  } catch (error) {
    console.error("Error validating user API key:", error);
    
    // Determine error type for better user experience
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let errorMessage = "Failed to validate API key";

    if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorCode = "TIMEOUT";
      errorMessage = "Validation request timed out";
    } else if (error.message?.includes('network')) {
      statusCode = 503;
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network error during validation";
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// POST /api/user/external-apis/save - Save validated user API key
export async function saveUserApiKey(req, res) {
  try {
    const userId = req.user.id;
    const { provider, apiKey, models, name, selectedModels } = req.body;

    // Validate input
    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: "Provider and API key are required"
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "API key name is required"
      });
    }

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one model must be selected"
      });
    }

    // Find user settings
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Ensure external_apis array exists
    if (!userSettings.external_apis) {
      userSettings.external_apis = [];
    }

    // Check for duplicate names
    const isDuplicate = userSettings.external_apis.some(api => api.name === name);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: "An API with this name already exists"
      });
    }

    // Encrypt API key
    let encryptedKey;
    try {
      encryptedKey = encryptApiKey(apiKey);
    } catch (encErr) {
      console.error('Encryption error while saving user external API:', encErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to encrypt API key' 
      });
    }

    // Save the new API
    const newApi = {
      name,
      provider,
      api_key: encryptedKey,
      is_active: false, // Initially inactive, user will activate when ready
      created_at: new Date(),
      updated_at: new Date(),
      last_validated: new Date(),
      metadata: {
        models: selectedModels || [], // User's selected models
        modelCount: selectedModels ? selectedModels.length : 0,
        selectedModels: selectedModels || [], // For compatibility
        lastRefreshed: new Date()
      }
    };

    userSettings.external_apis.push(newApi);
    await userSettings.save();

    // Sync user external models to pulled_models when API is saved
    await syncUserExternalModels(userId);

    res.status(201).json({
      success: true,
      message: "User API key saved successfully. Click 'Activate' to start using the models.",
      data: {
        _id: newApi._id,
        name: newApi.name,
        provider: newApi.provider,
        api_key: `${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`, // Mask key for response
        is_active: newApi.is_active,
        selectedModels: selectedModels || [],
        modelCount: selectedModels ? selectedModels.length : 0
      }
    });

  } catch (error) {
    console.error("Error saving user API key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save API key"
    });
  }
}

// PATCH /api/user/external-apis/:apiId/toggle - Toggle user API activation status
export async function toggleUserApiStatus(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "is_active must be a boolean value"
      });
    }

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    console.log("Looking for user API with ID:", apiId);
    console.log("Available user APIs:", userSettings.external_apis.map(api => ({id: api._id.toString(), name: api.name})));
    
    const api = userSettings.external_apis.id(apiId);
    if (!api) {
      return res.status(404).json({
        success: false,
        error: `User API not found with ID: ${apiId}`
      });
    }

    // Update status
    api.is_active = is_active;
    api.updated_at = new Date();
    await userSettings.save();

    // Sync external models to pulled_models (only selected models if activating)
    if (is_active) {
      await syncUserExternalModels(userId);
    } else {
      // Remove models from pulled_models when deactivating
      await removeInactiveUserModels(userId);
    }

    const selectedCount = api.metadata?.selectedModels?.length || api.metadata?.models?.length || 0;
    const actionMessage = is_active 
      ? `activated successfully. ${selectedCount} selected models are now available.`
      : `deactivated successfully. Models removed from your library.`;

    res.json({
      success: true,
      message: `User API ${actionMessage}`,
      data: {
        is_active: api.is_active,
        selectedCount: selectedCount
      }
    });
  } catch (error) {
    console.error("Error toggling user API status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle API status"
    });
  }
}

// DELETE /api/user/external-apis/:apiId - Delete user external API
export async function deleteUserExternalApi(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    const apiIndex = userSettings.external_apis.findIndex(api => api._id.toString() === apiId);
    if (apiIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "User API not found"
      });
    }

    // Remove the API
    userSettings.external_apis.splice(apiIndex, 1);
    await userSettings.save();

    // Sync external models to pulled_models
    await syncUserExternalModels(userId);

    res.json({
      success: true,
      message: "User API deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user API"
    });
  }
}

// Helper function to sync user's active external APIs to pulled_models
export async function syncUserExternalModels(userId) {
  try {
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      console.error("User settings not found for sync:", userId);
      return;
    }

    // Ensure arrays exist
    if (!userSettings.external_apis) userSettings.external_apis = [];
    if (!userSettings.pulled_models) userSettings.pulled_models = [];

    // Get all active external APIs
    const activeApis = userSettings.external_apis.filter(api => api.is_active);
    
    // Remove existing external models from pulled_models
    userSettings.pulled_models = userSettings.pulled_models.filter(
      model => !model.source || model.source !== 'external_user'
    );

    // Add selected models from active external APIs
    for (const api of activeApis) {
      const selectedModels = api.metadata?.selectedModels || api.metadata?.models || [];
      
      for (const model of selectedModels) {
        userSettings.pulled_models.push({
          model_id: new mongoose.Types.ObjectId(), // Generate dummy ObjectId for external models
          pulled_at: new Date(),
          usage_count: 0,
          last_used: null,
          local_path: null,
          file_size: 0,
          download_status: 'completed',
          // External model specific fields
          external_model_id: model.id,
          external_model_name: model.name || model.id,
          provider: api.provider,
          api_name: api.name,
          source: 'external_user'
        });
      }
    }

    await userSettings.save();
    console.log(`Synced external models for user ${userId}`);
  } catch (error) {
    console.error("Error syncing user external models:", error);
  }
}

// Helper function to remove models from inactive user APIs
export async function removeInactiveUserModels(userId) {
  try {
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      console.error("User settings not found for cleanup:", userId);
      return;
    }

    // Get all active external APIs
    const activeApis = userSettings.external_apis.filter(api => api.is_active);
    const activeApiNames = activeApis.map(api => api.name);

    // Remove models from inactive APIs
    userSettings.pulled_models = userSettings.pulled_models.filter(
      model => {
        // Keep non-external models
        if (model.source !== 'external_user') return true;
        
        // Keep models from active APIs
        return activeApiNames.includes(model.api_name);
      }
    );

    await userSettings.save();
    console.log(`Cleaned up inactive user API models for user ${userId}`);
  } catch (error) {
    console.error("Error removing inactive user models:", error);
  }
}

// POST /api/user/external-apis/sync - Sync all user external models
export async function syncAllUserExternalModels(req, res) {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    await syncUserExternalModels(userId);

    res.json({
      success: true,
      message: "All user external models synced successfully"
    });
  } catch (error) {
    console.error("Error syncing all user external models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync external models"
    });
  }
}