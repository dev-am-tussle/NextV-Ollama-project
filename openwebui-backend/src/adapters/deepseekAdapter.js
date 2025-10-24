import axios from 'axios';

/**
 * DeepSeek Chat Adapter
 * Handles chat completions using DeepSeek's API
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/**
 * Send chat completion request to DeepSeek
 * @param {string} model - Model to use (e.g., 'deepseek-chat', 'deepseek-coder')
 * @param {string} apiKey - DeepSeek API key
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
      frequency_penalty = 0,
      presence_penalty = 0,
      stop = null
    } = options;

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      stream
    };

    // Add optional parameters
    if (max_tokens) payload.max_tokens = max_tokens;
    if (stop) payload.stop = stop;

    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 60000 // 60 seconds for chat completion
      }
    );

    return {
      success: true,
      data: response.data,
      provider: 'deepseek',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('DeepSeek chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'DeepSeek API request failed',
        statusCode: status,
        provider: 'deepseek',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to DeepSeek',
      provider: 'deepseek',
      model
    };
  }
}

/**
 * Get available models from DeepSeek
 * @param {string} apiKey - DeepSeek API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${DEEPSEEK_BASE_URL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      models: response.data.data || response.data.models || [],
      provider: 'deepseek'
    };

  } catch (error) {
    console.error('DeepSeek models error:', error.message);
    
    // If models endpoint doesn't exist, return common DeepSeek models
    if (error.response?.status === 404) {
      return {
        success: true,
        models: [
          {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            description: 'General-purpose chat model'
          },
          {
            id: 'deepseek-coder',
            name: 'DeepSeek Coder',
            description: 'Specialized coding assistant'
          }
        ],
        provider: 'deepseek',
        fallback: true
      };
    }

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'deepseek'
    };
  }
}

/**
 * Validate DeepSeek API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for DeepSeek format
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
  provider: 'deepseek',
  name: 'DeepSeek'
};