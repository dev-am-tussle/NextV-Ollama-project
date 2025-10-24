import { UserSettings } from "../models/user.models.js";
import { decryptApiKey } from "../utils/encryption.js";
import { sendChatCompletion, formatMessagesForProvider } from "../adapters/index.js";

/**
 * Send chat completion using external API provider
 * @param {string} userId - User ID
 * @param {string} modelId - Full model ID (provider:model_name format)
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function sendExternalChatCompletion(userId, modelId, messages, options = {}) {
  try {
    // Parse provider and model from modelId (format: "provider:model_name")
    const [provider, modelName] = modelId.includes(':') 
      ? modelId.split(':', 2) 
      : [null, modelId];

    if (!provider || !modelName) {
      return {
        success: false,
        error: "Invalid model ID format. Expected 'provider:model_name'"
      };
    }

    // Get user settings to find the API key for this provider
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return {
        success: false,
        error: "User settings not found"
      };
    }

    // Find the active API for this provider
    const providerApi = userSettings.external_apis.find(
      api => api.provider === provider && api.is_active
    );

    if (!providerApi) {
      return {
        success: false,
        error: `No active API key found for provider: ${provider}`
      };
    }

    // Decrypt the API key
    const apiKey = decryptApiKey(providerApi.api_key);

    // Format messages for the specific provider
    const formattedMessages = formatMessagesForProvider(provider, messages);

    // Send the chat completion request
    const result = await sendChatCompletion(
      provider,
      modelName,
      apiKey,
      formattedMessages,
      options
    );

    // Update usage statistics if successful
    if (result.success) {
      try {
        // Update last used timestamp
        providerApi.metadata = {
          ...providerApi.metadata,
          lastUsed: new Date(),
          usageCount: (providerApi.metadata?.usageCount || 0) + 1
        };
        await userSettings.save();
      } catch (statsError) {
        console.warn('Failed to update usage statistics:', statsError.message);
        // Don't fail the request if stats update fails
      }
    }

    return result;

  } catch (error) {
    console.error('Error in sendExternalChatCompletion:', error);
    return {
      success: false,
      error: error.message || 'Failed to send chat completion'
    };
  }
}

/**
 * Get available models for chat selection
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Available models grouped by provider
 */
export async function getAvailableChatModels(userId) {
  try {
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return {
        success: false,
        error: "User settings not found"
      };
    }

    const activeApis = userSettings.external_apis.filter(api => api.is_active);
    
    if (activeApis.length === 0) {
      return {
        success: true,
        data: {},
        message: "No active API keys found"
      };
    }

    const modelsByProvider = {};

    for (const api of activeApis) {
      const models = api.metadata?.models || [];
      
      modelsByProvider[api.provider] = {
        name: api.name,
        provider: api.provider,
        models: models.map(model => ({
          id: `${api.provider}:${model.id}`,
          name: model.name,
          description: model.description,
          provider: api.provider
        }))
      };
    }

    return {
      success: true,
      data: modelsByProvider
    };

  } catch (error) {
    console.error('Error getting available chat models:', error);
    return {
      success: false,
      error: error.message || 'Failed to get available models'
    };
  }
}

/**
 * Validate that a model is available for the user
 * @param {string} userId - User ID
 * @param {string} modelId - Model ID to validate
 * @returns {Promise<boolean>} - Whether the model is available
 */
export async function validateModelAccess(userId, modelId) {
  try {
    const [provider] = modelId.split(':', 1);
    
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return false;
    }

    const providerApi = userSettings.external_apis.find(
      api => api.provider === provider && api.is_active
    );

    return !!providerApi;

  } catch (error) {
    console.error('Error validating model access:', error);
    return false;
  }
}

export default {
  sendExternalChatCompletion,
  getAvailableChatModels,
  validateModelAccess
};