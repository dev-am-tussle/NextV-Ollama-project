import openaiAdapter from './openaiAdapter.js';
import anthropicAdapter from './anthropicAdapter.js';
import groqAdapter from './groqAdapter.js';
import deepseekAdapter from './deepseekAdapter.js';
import perplexityAdapter from './perplexityAdapter.js';
import togetherAdapter from './togetherAdapter.js';
import mistralAdapter from './mistralAdapter.js';
import geminiAdapter from './geminiAdapter.js';

/**
 * Registry of all available provider adapters
 */
export const ADAPTERS = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  deepseek: deepseekAdapter,
  perplexity: perplexityAdapter,
  together: togetherAdapter,
  mistral: mistralAdapter,
  gemini: geminiAdapter
};

/**
 * Get adapter for a specific provider
 * @param {string} provider - Provider name
 * @returns {Object|null} - Adapter object or null if not found
 */
export function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}

/**
 * Send chat completion using the appropriate adapter
 * @param {string} provider - Provider name
 * @param {string} model - Model to use
 * @param {string} apiKey - API key
 * @param {Array} messages - Messages array
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function sendChatCompletion(provider, model, apiKey, messages, options = {}) {
  const adapter = getAdapter(provider);
  
  if (!adapter) {
    return {
      success: false,
      error: `Unsupported provider: ${provider}`,
      provider,
      model
    };
  }

  return await adapter.chat(model, apiKey, messages, options);
}

/**
 * Get models for a specific provider
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key
 * @returns {Promise<Object>} - Models response
 */
export async function getProviderModels(provider, apiKey) {
  const adapter = getAdapter(provider);
  
  if (!adapter) {
    return {
      success: false,
      error: `Unsupported provider: ${provider}`,
      provider
    };
  }

  return await adapter.getModels(apiKey);
}

/**
 * Validate API key for a specific provider
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateProviderKey(provider, apiKey) {
  const adapter = getAdapter(provider);
  
  if (!adapter) {
    return {
      success: false,
      error: `Unsupported provider: ${provider}`,
      provider
    };
  }

  return await adapter.validateApiKey(apiKey);
}

/**
 * Get list of all supported providers
 * @returns {Array<{provider: string, name: string}>}
 */
export function getSupportedProviders() {
  return Object.values(ADAPTERS).map(adapter => ({
    provider: adapter.provider,
    name: adapter.name
  }));
}

/**
 * Format messages for a specific provider
 * @param {string} provider - Provider name
 * @param {Array} messages - Messages to format
 * @returns {Array} - Formatted messages
 */
export function formatMessagesForProvider(provider, messages) {
  const adapter = getAdapter(provider);
  
  if (!adapter || !adapter.formatMessages) {
    return messages; // Return as-is if no formatter
  }

  return adapter.formatMessages(messages);
}

export default {
  ADAPTERS,
  getAdapter,
  sendChatCompletion,
  getProviderModels,
  validateProviderKey,
  getSupportedProviders,
  formatMessagesForProvider
};