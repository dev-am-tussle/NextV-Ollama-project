/**
 * Mistral Chat Adapter
 * Handles chat completions using Mistral's API
 */

import axios from 'axios';

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

/**
 * Send chat completion request to Mistral
 * @param {string} model - Model to use (e.g., 'mistral-tiny', 'mistral-small', 'mistral-medium')
 * @param {string} apiKey - Mistral API key
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function chat(model, apiKey, messages, options = {}) {
  try {
    const {
      temperature = 0.7,
      max_tokens = null,
      stream = false,
      top_p = 1,
      random_seed = null,
      safe_prompt = false
    } = options;

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      stream,
      safe_prompt
    };

    // Add optional parameters
    if (max_tokens) payload.max_tokens = max_tokens;
    if (random_seed) payload.random_seed = random_seed;

    const response = await axios.post(
      `${MISTRAL_BASE_URL}/chat/completions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 60000
      }
    );

    return {
      success: true,
      data: response.data,
      provider: 'mistral',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Mistral chat error:', error);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      return {
        success: false,
        error: `Mistral API error (${statusCode}): ${errorData.message || error.message}`,
        statusCode,
        provider: 'mistral',
        model
      };
    }

    return {
      success: false,
      error: `Mistral request failed: ${error.message}`,
      provider: 'mistral',
      model
    };
  }
}

/**
 * Get available models from Mistral
 * @param {string} apiKey - Mistral API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${MISTRAL_BASE_URL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 30000
      }
    );

    if (response.data.data) {
      const models = response.data.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: 'mistral',
        description: model.description || '',
        created: model.created || null,
        owned_by: model.owned_by || 'mistral'
      }));

      return {
        success: true,
        data: models,
        modelCount: models.length,
        provider: 'mistral'
      };
    }

    return {
      success: false,
      error: 'No models found'
    };

  } catch (error) {
    console.error('Mistral models error:', error);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 401) {
        return {
          success: false,
          error: 'Invalid Mistral API key'
        };
      }
      
      return {
        success: false,
        error: `Mistral API error (${statusCode}): ${errorData.message || error.message}`
      };
    }

    return {
      success: false,
      error: `Failed to fetch Mistral models: ${error.message}`
    };
  }
}

/**
 * Validate Mistral API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for Mistral format
 * @param {Array} messages - Messages to format
 * @returns {Array} - Formatted messages
 */
export function formatMessages(messages) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

export default {
  chat,
  getModels,
  validateApiKey,
  formatMessages,
  provider: 'mistral',
  name: 'Mistral'
};