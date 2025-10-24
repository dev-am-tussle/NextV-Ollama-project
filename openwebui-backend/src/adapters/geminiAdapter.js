/**
 * Google Gemini Chat Adapter
 * Handles chat completions using Google's Gemini API
 */

import axios from 'axios';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Send chat completion request to Gemini
 * @param {string} model - Model to use (e.g., 'gemini-pro', 'gemini-pro-vision')
 * @param {string} apiKey - Gemini API key
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function chat(model, apiKey, messages, options = {}) {
  try {
    const {
      temperature = 0.7,
      maxOutputTokens = null,
      topP = 1,
      topK = null,
      stopSequences = null
    } = options;

    // Convert messages to Gemini format
    const contents = formatMessages(messages);

    const payload = {
      contents,
      generationConfig: {
        temperature,
        topP,
        ...(maxOutputTokens && { maxOutputTokens }),
        ...(topK && { topK }),
        ...(stopSequences && { stopSequences })
      }
    };

    const response = await axios.post(
      `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 60000
      }
    );

    if (response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      const content = candidate.content.parts[0].text;

      return {
        success: true,
        data: {
          id: `gemini-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content
            },
            finish_reason: candidate.finishReason || 'stop'
          }],
          usage: response.data.usageMetadata || {}
        },
        provider: 'gemini',
        model,
        usage: response.data.usageMetadata || {}
      };
    } else {
      throw new Error('No response from Gemini API');
    }

  } catch (error) {
    console.error('Gemini chat error:', error);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      return {
        success: false,
        error: `Gemini API error (${statusCode}): ${errorData.error?.message || error.message}`,
        statusCode
      };
    }

    return {
      success: false,
      error: `Gemini request failed: ${error.message}`
    };
  }
}

/**
 * Get available models from Gemini
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Models response
 */
export async function getModels(apiKey) {
  try {
    const response = await axios.get(
      `${GEMINI_BASE_URL}/models?key=${apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TussleAI/1.0'
        },
        timeout: 30000
      }
    );

    if (response.data.models) {
      const models = response.data.models
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || model.name.replace('models/', ''),
          provider: 'gemini',
          description: model.description || '',
          created: null,
          owned_by: 'google'
        }));

      return {
        success: true,
        data: models,
        modelCount: models.length,
        provider: 'gemini'
      };
    }

    return {
      success: false,
      error: 'No models found'
    };

  } catch (error) {
    console.error('Gemini models error:', error);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 401) {
        return {
          success: false,
          error: 'Invalid Gemini API key'
        };
      }
      
      return {
        success: false,
        error: `Gemini API error (${statusCode}): ${errorData.error?.message || error.message}`
      };
    }

    return {
      success: false,
      error: `Failed to fetch Gemini models: ${error.message}`
    };
  }
}

/**
 * Validate Gemini API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateApiKey(apiKey) {
  return await getModels(apiKey);
}

/**
 * Format messages for Gemini format
 * @param {Array} messages - Messages to format
 * @returns {Array} - Formatted messages for Gemini
 */
export function formatMessages(messages) {
  return messages.map(msg => {
    let role = 'user';
    if (msg.role === 'assistant') {
      role = 'model';
    } else if (msg.role === 'system') {
      // Gemini doesn't have system role, treat as user
      role = 'user';
    }

    return {
      role,
      parts: [{ text: msg.content }]
    };
  });
}

export default {
  chat,
  getModels,
  validateApiKey,
  formatMessages,
  provider: 'gemini',
  name: 'Google Gemini'
};