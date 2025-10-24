import { UserSettings } from "../models/user.models.js";
import { encryptApiKey, decryptApiKey } from "../utils/encryption.js";
import { autoDetectAndValidate, validateKey as validateProviderKey, formatModelsResponse, getSupportedProviders } from "../utils/providerTools.js";
import { validateProviderKey as adapterValidateKey, getProviderModels } from "../adapters/index.js";
import axios from "axios";

// Legacy provider endpoint map (keeping for backward compatibility)
const PROVIDER_ENDPOINTS = {
  openai: "https://api.openai.com/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
  perplexity: "https://api.perplexity.ai/chat/completions",
  anthropic: "https://api.anthropic.com/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
  together: "https://api.together.xyz/v1/models",
  mistral: "https://api.mistral.ai/v1/models",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models"
};

// Get all external APIs for a user
export async function getUserExternalApis(req, res) {
  try {
    const userId = req.user.id;
    
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Map APIs to mask the key
    const maskedApis = userSettings.external_apis.map(api => ({
      ...api.toObject(),
      api_key: `${api.api_key.substring(0, 4)}...${api.api_key.slice(-4)}` // Mask key for response
    }));

    res.json({
      success: true,
      data: maskedApis
    });
  } catch (error) {
    console.error("Error fetching external APIs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch external APIs"
    });
  }
}

// Add a new external API
export async function addExternalApi(req, res) {
  try {
    const userId = req.user.id;

    // Validate required fields
    const { name, provider, api_key } = req.body;

    // Validate required fields (provider is optional — default applied below)
    if (!name || !api_key) {
      return res.status(400).json({
        success: false,
        error: "Name and API key are required"
      });
    }

    // If frontend doesn't provide a provider, fall back to a sensible default
    const finalProvider = provider || "";

    // Find user settings
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Check for duplicate names
    const isDuplicate = userSettings.external_apis.some(api => api.name === name);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: "An API with this name already exists"
      });
    }

    // Add the new API
    let encryptedKey;
    try {
      encryptedKey = encryptApiKey(api_key);
    } catch (encErr) {
      console.error('Encryption error while adding external API:', encErr);
      return res.status(500).json({ success: false, error: 'Failed to encrypt API key' });
    }
    userSettings.external_apis.push({
      name,
      provider: finalProvider,
      api_key: encryptedKey,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    await userSettings.save();

    res.status(201).json({
      success: true,
      message: "API key added successfully",
      data: {
        name,
        provider: finalProvider,
        api_key: `${api_key.substring(0, 4)}...${api_key.slice(-4)}`, // Mask key for response
        is_active: false
      }
    });
  } catch (error) {
    console.error("Error adding external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add external API"
    });
  }
}

// Update an external API
export async function updateExternalApi(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;
    const updates = req.body;

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
        error: "API not found"
      });
    }

    // Update fields
    const api = userSettings.external_apis[apiIndex];
    if (updates.name) api.name = updates.name;
    if (updates.provider) api.provider = updates.provider;
    if (updates.api_key) {
      try {
        api.api_key = encryptApiKey(updates.api_key);
      } catch (encErr) {
        console.error('Encryption error while updating external API:', encErr);
        return res.status(500).json({ success: false, error: 'Failed to encrypt API key' });
      }
    }
    if (typeof updates.is_active !== 'undefined') {
      api.is_active = updates.is_active;
    }
    api.updated_at = new Date();

    await userSettings.save();

    res.json({
      success: true,
      message: "API updated successfully",
      data: {
        ...api.toObject(),
        api_key: `${api.api_key.substring(0, 4)}...${api.api_key.slice(-4)}` // Mask key for response
      }
    });
  } catch (error) {
    console.error("Error updating external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update external API"
    });
  }
}

// Delete an external API
export async function deleteExternalApi(req, res) {
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
        error: "API not found"
      });
    }

    // Remove the API
    userSettings.external_apis.splice(apiIndex, 1);
    await userSettings.save();

    res.json({
      success: true,
      message: "API deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete external API"
    });
  }
}

// Toggle API activation status
export async function toggleApiStatus(req, res) {
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

    console.log("Looking for API with ID:", apiId);
    console.log("Available APIs:", userSettings.external_apis.map(api => ({id: api._id.toString(), name: api.name})));
    
    const api = userSettings.external_apis.id(apiId);
    if (!api) {
      return res.status(404).json({
        success: false,
        error: `API not found with ID: ${apiId}`
      });
    }

    // Update status
    api.is_active = is_active;
    api.updated_at = new Date();
    await userSettings.save();

    res.json({
      success: true,
      message: `API ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        is_active: api.is_active
      }
    });
  } catch (error) {
    console.error("Error toggling API status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle API status"
    });
  }
}

// New API key validation with auto-detection
export async function validateApiKey(req, res) {
  try {
    const userId = req.user.id;
    const { apiKey, provider, name } = req.body;

    // Validate input
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "API key is required"
      });
    }

    // Use auto-detection if no provider specified
    const result = await autoDetectAndValidate(apiKey, provider);

    if (result.valid) {
      // Format models for consistent response
      const formattedModels = formatModelsResponse(result.models || [], result.provider);
      
      // If this is for an existing API key (name provided), update last_validated
      if (name && userId) {
        try {
          const userSettings = await UserSettings.findOne({ user_id: userId });
          if (userSettings) {
            const existingApi = userSettings.external_apis.find(api => api.name === name);
            if (existingApi) {
              existingApi.last_validated = new Date();
              existingApi.updated_at = new Date();
              existingApi.metadata = {
                ...existingApi.metadata,
                models: formattedModels,
                modelCount: formattedModels.length
              };
              await userSettings.save();
              console.log(`Updated last_validated for API key: ${name}`);
            }
          }
        } catch (updateError) {
          console.error("Error updating last_validated time:", updateError);
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
        message: `API key validated successfully with ${result.provider}`
      });
    } else {
      res.status(400).json({
        success: false,
        valid: false,
        error: result.error,
        supportedProviders: getSupportedProviders()
      });
    }

  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate API key"
    });
  }
}

// Save validated API key
export async function saveApiKey(req, res) {
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
      console.error('Encryption error while saving external API:', encErr);
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
      is_active: false, // Initially inactive, user will activate after review
      created_at: new Date(),
      updated_at: new Date(),
      last_validated: new Date(),
      metadata: {
        allModels: models || [], // All available models from the API
        selectedModels: selectedModels || [], // Models selected by user
        modelCount: models ? models.length : 0,
        selectedCount: selectedModels ? selectedModels.length : 0,
        lastRefreshed: new Date()
      }
    };

    userSettings.external_apis.push(newApi);
    await userSettings.save();

    res.status(201).json({
      success: true,
      message: "API key saved successfully. Click 'Activate' to make models available.",
      data: {
        _id: newApi._id,
        name: newApi.name,
        provider: newApi.provider,
        api_key: `${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`, // Mask key for response
        is_active: newApi.is_active,
        allModels: models || [],
        selectedModels: selectedModels || [],
        modelCount: models ? models.length : 0,
        selectedCount: selectedModels ? selectedModels.length : 0
      }
    });

  } catch (error) {
    console.error("Error saving API key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save API key"
    });
  }
}

// Legacy verify function (keeping for backward compatibility)
export async function verifyAndActivateKey(req, res) {
  try {
    const { provider, api_key, name } = req.body;

    // Validate input
    if (!provider || !api_key) {
      return res.status(400).json({
        success: false,
        error: "Provider and API key are required"
      });
    }

    // Check if provider is supported
    const endpoint = PROVIDER_ENDPOINTS[provider.toLowerCase()];
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: `Provider '${provider}' is not supported. Supported providers: ${Object.keys(PROVIDER_ENDPOINTS).join(', ')}`
      });
    }

    // Validate API key with provider
    let validationResult;
    try {
      const headers = {};
      
      // Set provider-specific headers
      if (provider.toLowerCase() === 'openai' || provider.toLowerCase() === 'groq' || provider.toLowerCase() === 'together') {
        headers['Authorization'] = `Bearer ${api_key}`;
      } else if (provider.toLowerCase() === 'anthropic') {
        headers['x-api-key'] = api_key;
        headers['anthropic-version'] = '2023-06-01';
      }

      // Call provider endpoint to validate key
      const response = await axios.get(endpoint, {
        headers,
        timeout: 10000
      });

      validationResult = {
        valid: true,
        statusCode: response.status,
        modelCount: Array.isArray(response.data?.data) ? response.data.data.length : 0
      };
    } catch (error) {
      // API key is invalid or provider endpoint failed
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error?.message || error.message || 'Validation failed';
      
      return res.status(400).json({
        success: false,
        error: `API key validation failed: ${errorMessage}`,
        details: {
          provider,
          statusCode,
          valid: false
        }
      });
    }

    // If validation successful, return success (don't save yet - frontend will call addExternalApi)
    res.json({
      success: true,
      message: "API key validated successfully",
      data: {
        provider,
        valid: true,
        modelCount: validationResult.modelCount,
        statusCode: validationResult.statusCode
      }
    });
  } catch (error) {
    console.error("Error verifying API key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify API key"
    });
  }
}