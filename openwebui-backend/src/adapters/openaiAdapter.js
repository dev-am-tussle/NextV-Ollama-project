import axios from 'axios';

/**
 * OpenAI Chat Adapter
 * Handles chat completions using OpenAI's API
 */

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Send chat completion request to OpenAI
 * @param {string} model - Model to use (e.g., 'gpt-4', 'gpt-3.5-turbo')
 * @param {string} apiKey - OpenAI API key
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
      user = null
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
    if (user) payload.user = user;

    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
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
      provider: 'openai',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('OpenAI chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'OpenAI API request failed',
        statusCode: status,
        provider: 'openai',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to OpenAI',
      provider: 'openai',
      model
    };
  }
}

/**
 * Get available models from OpenAI
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${OPENAI_BASE_URL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    // Filter for chat completion models
    const chatModels = response.data.data.filter(model => 
      model.id.includes('gpt') || 
      model.id.includes('chat') ||
      model.capabilities?.includes('chat_completions')
    );

    return {
      success: true,
      models: chatModels,
      provider: 'openai'
    };

  } catch (error) {
    console.error('OpenAI models error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'openai'
    };
  }
}

/**
 * Validate OpenAI API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for OpenAI format
 * @param {Array} messages - Messages to format
 * @returns {Array} - Formatted messages
 */
export function formatMessages(messages) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.name && { name: msg.name })
  }));
}

export default {
  chat,
  getModels,
  validateApiKey,
  formatMessages,
  provider: 'openai',
  name: 'OpenAI'
};