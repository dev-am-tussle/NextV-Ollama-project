import axios from 'axios';

/**
 * Perplexity Chat Adapter
 * Handles chat completions using Perplexity's API
 */

const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

/**
 * Send chat completion request to Perplexity
 * @param {string} model - Model to use (e.g., 'pplx-7b-online', 'pplx-70b-online')
 * @param {string} apiKey - Perplexity API key
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
      return_citations = false,
      return_images = false
    } = options;

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      stream,
      return_citations,
      return_images
    };

    // Add optional parameters
    if (max_tokens) payload.max_tokens = max_tokens;

    const response = await axios.post(
      `${PERPLEXITY_BASE_URL}/chat/completions`,
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
      provider: 'perplexity',
      model,
      usage: response.data.usage,
      citations: response.data.citations || []
    };

  } catch (error) {
    console.error('Perplexity chat error:', error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      return {
        success: false,
        error: data.error?.message || 'Perplexity API request failed',
        statusCode: status,
        provider: 'perplexity',
        model
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to Perplexity',
      provider: 'perplexity',
      model
    };
  }
}

/**
 * Get available models from Perplexity
 * Since Perplexity doesn't have a models endpoint, we validate API key and return static models
 * @param {string} apiKey - Perplexity API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  // Use the validateApiKey function which tests with a lightweight query
  return await validateApiKey(apiKey);
}

/**
 * Validate Perplexity API key
 * Since Perplexity doesn't have a models endpoint, we send a lightweight test query
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  try {
    // Send a lightweight test query to validate the API key
    const testPayload = {
      model: "sonar",
      messages: [
        { role: "user", content: "Say hello" }
      ],
      max_tokens: 10,
      temperature: 0.1
    };

    const response = await axios.post(
      `${PERPLEXITY_BASE_URL}/chat/completions`,
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 15000
      }
    );

    if (response.status === 200 && response.data.choices) {
      // API key is valid, return static model list
      const models = [
        {
          id: 'sonar',
          name: 'Sonar',
          provider: 'perplexity',
          description: 'Perplexity\'s flagship model with real-time web search',
          created: null,
          owned_by: 'perplexity'
        },
        {
          id: 'sonar-small-chat',
          name: 'Sonar Small Chat',
          provider: 'perplexity',
          description: 'Smaller, faster model for chat completions',
          created: null,
          owned_by: 'perplexity'
        },
        {
          id: 'sonar-medium-chat',
          name: 'Sonar Medium Chat',
          provider: 'perplexity',
          description: 'Medium-sized model balancing speed and capability',
          created: null,
          owned_by: 'perplexity'
        },
        {
          id: 'sonar-small-online',
          name: 'Sonar Small Online',
          provider: 'perplexity',
          description: 'Small model with online search capabilities',
          created: null,
          owned_by: 'perplexity'
        },
        {
          id: 'sonar-medium-online',
          name: 'Sonar Medium Online',
          provider: 'perplexity',
          description: 'Medium model with online search capabilities',
          created: null,
          owned_by: 'perplexity'
        }
      ];

      return {
        success: true,
        data: models,
        modelCount: models.length,
        provider: 'perplexity',
        validatedViaTestQuery: true
      };
    }

    return {
      success: false,
      error: 'Invalid response from Perplexity API'
    };

  } catch (error) {
    console.error('Perplexity API key validation error:', error.message);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 401) {
        return {
          success: false,
          error: 'Invalid Perplexity API key'
        };
      } else if (statusCode === 403) {
        return {
          success: false,
          error: 'Perplexity API key does not have required permissions'
        };
      } else if (statusCode === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded for Perplexity API'
        };
      }
      
      return {
        success: false,
        error: `Perplexity API error (${statusCode}): ${errorData.error?.message || error.message}`
      };
    }

    return {
      success: false,
      error: `Failed to validate Perplexity API key: ${error.message}`
    };
  }
}

/**
 * Format messages for Perplexity format
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
  provider: 'perplexity',
  name: 'Perplexity'
};