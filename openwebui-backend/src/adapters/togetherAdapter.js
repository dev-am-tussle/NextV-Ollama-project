import axios from 'axios';

/**
 * Together AI Chat Adapter
 * Handles chat completions using Together AI's API
 */

const TOGETHER_BASE_URL = 'https://api.together.xyz/v1';

/**
 * Send chat completion request to Together AI
 * @param {string} model - Model to use (e.g., 'mistralai/Mixtral-8x7B-Instruct-v0.1')
 * @param {string} apiKey - Together AI API key
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
      stop = null,
      repetition_penalty = 1
    } = options;

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      repetition_penalty,
      stream
    };

    // Add optional parameters
    if (max_tokens) payload.max_tokens = max_tokens;
    if (stop) payload.stop = stop;

    const response = await axios.post(
      `${TOGETHER_BASE_URL}/chat/completions`,
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
      provider: 'together',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Together AI chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'Together AI API request failed',
        statusCode: status,
        provider: 'together',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to Together AI',
      provider: 'together',
      model
    };
  }
}

/**
 * Get available models from Together AI
 * @param {string} apiKey - Together AI API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${TOGETHER_BASE_URL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    // Filter for chat completion models
    const chatModels = (response.data.data || response.data.models || [])
      .filter(model => 
        model.type === 'chat' || 
        model.capabilities?.includes('chat') ||
        model.id.toLowerCase().includes('chat') ||
        model.id.toLowerCase().includes('instruct')
      );

    return {
      success: true,
      models: chatModels,
      provider: 'together'
    };

  } catch (error) {
    console.error('Together AI models error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'together'
    };
  }
}

/**
 * Validate Together AI API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for Together AI format
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
  provider: 'together',
  name: 'Together AI'
};