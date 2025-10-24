import axios from 'axios';

/**
 * Groq Chat Adapter
 * Handles chat completions using Groq's API (OpenAI-compatible)
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Send chat completion request to Groq
 * @param {string} model - Model to use (e.g., 'mixtral-8x7b-32768', 'llama2-70b-4096')
 * @param {string} apiKey - Groq API key
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
      `${GROQ_BASE_URL}/chat/completions`,
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
      provider: 'groq',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Groq chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'Groq API request failed',
        statusCode: status,
        provider: 'groq',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to Groq',
      provider: 'groq',
      model
    };
  }
}

/**
 * Get available models from Groq
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${GROQ_BASE_URL}/models`,
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
      provider: 'groq'
    };

  } catch (error) {
    console.error('Groq models error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'groq'
    };
  }
}

/**
 * Validate Groq API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for Groq format (OpenAI-compatible)
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
  provider: 'groq',
  name: 'Groq'
};