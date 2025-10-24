import axios from 'axios';

/**
 * Anthropic (Claude) Chat Adapter
 * Handles chat completions using Anthropic's API
 */

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Send chat completion request to Anthropic
 * @param {string} model - Model to use (e.g., 'claude-3-opus-20240229', 'claude-3-sonnet-20240229')
 * @param {string} apiKey - Anthropic API key
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function chat(model, apiKey, messages, options = {}) {
  try {
    const {
      max_tokens = 1024,
      temperature = 0.7,
      top_p = 1,
      top_k = null,
      stream = false,
      system = null
    } = options;

    // Convert messages to Anthropic format
    const anthropicMessages = formatMessages(messages);
    
    const payload = {
      model,
      messages: anthropicMessages,
      max_tokens,
      temperature,
      top_p,
      stream
    };

    // Add optional parameters
    if (top_k) payload.top_k = top_k;
    if (system) payload.system = system;

    const response = await axios.post(
      `${ANTHROPIC_BASE_URL}/messages`,
      payload,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': ANTHROPIC_VERSION,
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 60000 // 60 seconds for chat completion
      }
    );

    return {
      success: true,
      data: response.data,
      provider: 'anthropic',
      model,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Anthropic chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'Anthropic API request failed',
        statusCode: status,
        provider: 'anthropic',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to Anthropic',
      provider: 'anthropic',
      model
    };
  }
}

/**
 * Get available models from Anthropic
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${ANTHROPIC_BASE_URL}/models`,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': ANTHROPIC_VERSION
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      models: response.data.data || response.data.models || [],
      provider: 'anthropic'
    };

  } catch (error) {
    console.error('Anthropic models error:', error.message);
    
    // If models endpoint doesn't exist, return common Claude models
    if (error.response?.status === 404) {
      return {
        success: true,
        models: [
          {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            description: 'Most capable model for complex tasks'
          },
          {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            description: 'Balanced performance and speed'
          },
          {
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku',
            description: 'Fastest model for simple tasks'
          },
          {
            id: 'claude-2.1',
            name: 'Claude 2.1',
            description: 'Previous generation model'
          }
        ],
        provider: 'anthropic',
        fallback: true
      };
    }

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'anthropic'
    };
  }
}

/**
 * Validate Anthropic API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for Anthropic format
 * Anthropic doesn't support system messages in the messages array
 * @param {Array} messages - Messages to format
 * @returns {Array} - Formatted messages
 */
export function formatMessages(messages) {
  return messages
    .filter(msg => msg.role !== 'system') // Remove system messages
    .map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
}

/**
 * Extract system message from messages array
 * @param {Array} messages - Messages array
 * @returns {string|null} - System message content or null
 */
export function extractSystemMessage(messages) {
  const systemMessage = messages.find(msg => msg.role === 'system');
  return systemMessage ? systemMessage.content : null;
}

export default {
  chat,
  getModels,
  validateApiKey,
  formatMessages,
  extractSystemMessage,
  provider: 'anthropic',
  name: 'Anthropic'
};