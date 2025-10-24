import axios from "axios";
import { validateProviderKey } from "../adapters/index.js";

/**
 * Provider configuration mapping
 * Each provider has its base URL, models endpoint, and authentication method
 */
export const PROVIDER_CONFIG = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelsEndpoint: "/models",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^sk-/,
    timeout: 10000
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    modelsEndpoint: "/models",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^sk-/,
    timeout: 10000
  },
  perplexity: {
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    modelsEndpoint: "/chat/completions", // Uses test query instead of models endpoint
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^pplx-/,
    timeout: 15000,
    useTestQuery: true // Special flag for providers without models endpoint
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    modelsEndpoint: "/models",
    authHeader: "x-api-key",
    authPrefix: "",
    keyPattern: /^sk-ant-/,
    timeout: 10000,
    additionalHeaders: {
      "anthropic-version": "2023-06-01"
    }
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsEndpoint: "/models",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^gsk_/,
    timeout: 10000
  },
  together: {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    modelsEndpoint: "/models",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^[a-f0-9]{64}$/,
    timeout: 10000
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    modelsEndpoint: "/models",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    keyPattern: /^[a-zA-Z0-9]{32}$/,
    timeout: 10000
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelsEndpoint: "/models",
    authHeader: "key",
    authPrefix: "",
    keyPattern: /^AIza[0-9A-Za-z-_]{35}$/,
    timeout: 10000,
    useQueryParam: true // Gemini uses query parameter for API key
  }
};

/**
 * Detect provider based on API key pattern
 * @param {string} apiKey - The API key to analyze
 * @returns {string|null} - Provider name or null if not detected
 */
export function detectProvider(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return null;
  }

  // Remove whitespace
  const cleanKey = apiKey.trim();

  // Check each provider's key pattern
  for (const [providerName, config] of Object.entries(PROVIDER_CONFIG)) {
    if (config.keyPattern.test(cleanKey)) {
      return providerName;
    }
  }

  return null;
}

/**
 * Validate API key with provider's endpoint
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key to validate
 * @returns {Promise<{valid: boolean, models?: Array, error?: string, modelCount?: number}>}
 */
export async function validateKey(provider, apiKey) {
  const config = PROVIDER_CONFIG[provider];
  
  if (!config) {
    return {
      valid: false,
      error: `Unsupported provider: ${provider}. Supported providers: ${Object.keys(PROVIDER_CONFIG).join(', ')}`
    };
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      error: "API key is required"
    };
  }

  // For providers that don't have standard models endpoints, use adapter validation
  if (provider === 'perplexity' || provider === 'gemini') {
    try {
      const result = await validateProviderKey(provider, apiKey);
      
      if (result.success) {
        return {
          valid: true,
          models: result.data || [],
          modelCount: result.modelCount || (result.data ? result.data.length : 0),
          provider: config.name
        };
      } else {
        return {
          valid: false,
          error: result.error || `Failed to validate ${config.name} API key`
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate ${config.name} API key: ${error.message}`
      };
    }
  }

  try {
    // Prepare headers for standard providers
    const headers = {
      [config.authHeader]: `${config.authPrefix}${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TussleAI-Integration/1.0'
    };

    // Add additional headers if specified
    if (config.additionalHeaders) {
      Object.assign(headers, config.additionalHeaders);
    }

    // Make request to provider's models endpoint
    const response = await axios.get(
      `${config.baseUrl}${config.modelsEndpoint}`,
      {
        headers,
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses to parse error
      }
    );

    // Check if request was successful
    if (response.status >= 200 && response.status < 300) {
      const models = response.data?.data || response.data?.models || [];
      
      return {
        valid: true,
        models: Array.isArray(models) ? models : [],
        modelCount: Array.isArray(models) ? models.length : 0,
        provider: config.name
      };
    } else {
      // Handle authentication errors
      const errorMessage = response.data?.error?.message || 
                          response.data?.message || 
                          `API key validation failed (${response.status})`;
      
      return {
        valid: false,
        error: errorMessage
      };
    }

  } catch (error) {
    console.error(`Provider validation error for ${provider}:`, error.message);
    
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      return {
        valid: false,
        error: `Request timeout - ${config.name} API is not responding`
      };
    }
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 401) {
        return {
          valid: false,
          error: `Invalid API key for ${config.name}`
        };
      } else if (statusCode === 403) {
        return {
          valid: false,
          error: `API key does not have permission to access ${config.name} models`
        };
      } else if (statusCode === 429) {
        return {
          valid: false,
          error: `Rate limit exceeded for ${config.name} API`
        };
      } else {
        const errorMessage = errorData?.error?.message || 
                           errorData?.message || 
                           `Validation failed (${statusCode})`;
        return {
          valid: false,
          error: `${config.name}: ${errorMessage}`
        };
      }
    }

    return {
      valid: false,
      error: `Failed to validate with ${config.name}: ${error.message}`
    };
  }
}

/**
 * Auto-detect and validate API key
 * Tries to detect provider first, then validates
 * @param {string} apiKey - API key to detect and validate
 * @param {string} [expectedProvider] - Optional provider hint
 * @returns {Promise<{valid: boolean, provider?: string, models?: Array, error?: string}>}
 */
export async function autoDetectAndValidate(apiKey, expectedProvider = null) {
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      error: "API key is required"
    };
  }

  let provider = expectedProvider;
  
  // If no expected provider, try to detect
  if (!provider) {
    provider = detectProvider(apiKey);
    
    if (!provider) {
      // If detection fails, try validating with all providers
      const providerNames = Object.keys(PROVIDER_CONFIG);
      
      for (const providerName of providerNames) {
        const result = await validateKey(providerName, apiKey);
        if (result.valid) {
          return {
            ...result,
            provider: providerName,
            detectedAutomatically: true
          };
        }
      }
      
      return {
        valid: false,
        error: "Could not detect provider from API key pattern. Please specify the provider manually."
      };
    }
  }

  // Validate with detected/specified provider
  const result = await validateKey(provider, apiKey);
  return {
    ...result,
    provider,
    detectedAutomatically: !expectedProvider
  };
}

/**
 * Get all supported providers
 * @returns {Array<{value: string, label: string, keyPattern: string}>}
 */
export function getSupportedProviders() {
  return Object.entries(PROVIDER_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.name,
    keyPattern: config.keyPattern.toString(),
    baseUrl: config.baseUrl
  }));
}

/**
 * Format models response for consistent frontend consumption
 * @param {Array} models - Raw models from provider
 * @param {string} provider - Provider name
 * @returns {Array<{id: string, name: string, provider: string, description?: string}>}
 */
export function formatModelsResponse(models, provider) {
  if (!Array.isArray(models)) {
    return [];
  }

  return models.map(model => {
    // Handle different response formats from providers
    const id = model.id || model.name || model.model;
    const name = model.name || model.id || model.model;
    const description = model.description || model.details || '';
    
    return {
      id,
      name,
      provider,
      description,
      created: model.created || null,
      owned_by: model.owned_by || provider
    };
  });
}