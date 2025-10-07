import { AvailableModel } from "../models/availableModel.model.js";

// Cache for allowed models to avoid DB calls on every request
let allowedModelsCache = [];
let cacheLastUpdated = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Use environment variable for Ollama API URL

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Structured error class for better frontend handling
class OllamaError extends Error {
  constructor(message, code, userMessage, suggestions = []) {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
  }
}

// helper to remove ANSI escape codes (cursor hide/show, colors, etc.)
function stripAnsiCodes(str) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

// Get allowed models from database with caching
async function getAllowedModels() {
  const now = Date.now();
  
  // Return cached models if cache is still valid
  if (allowedModelsCache.length > 0 && (now - cacheLastUpdated) < CACHE_DURATION) {
    return allowedModelsCache;
  }
  
  try {
    // Fetch active models from database
    const activeModels = await AvailableModel.find({ 
      is_active: true,
      provider: "ollama" // Only ollama models for this service
    }).select('name').lean();
    
    // Extract model names
    allowedModelsCache = activeModels.map(model => model.name);
    cacheLastUpdated = now;
    
    console.log(`[getAllowedModels] Loaded ${allowedModelsCache.length} active models:`, allowedModelsCache);
    
    return allowedModelsCache;
  } catch (error) {
    console.error('[getAllowedModels] Database error:', error);
    
    // Fallback to cache if available, otherwise use hardcoded fallback
    if (allowedModelsCache.length > 0) {
      console.warn('[getAllowedModels] Using cached models due to DB error');
      return allowedModelsCache;
    }
    
    // Last resort: hardcoded fallback
    const fallbackModels = ["gemma:2b", "phi:2.7b"];
    console.warn('[getAllowedModels] Using hardcoded fallback models:', fallbackModels);
    return fallbackModels;
  }
}

// Validate model against allowed models with detailed error messages
async function validateModel(modelId) {
  if (!modelId) {
    throw new OllamaError(
      'Model ID is required',
      'MISSING_MODEL_ID',
      'Please select a model to continue',
      ['Choose from available models', 'Refresh the model list']
    );
  }
  
  if (typeof modelId !== 'string') {
    throw new OllamaError(
      'Model ID must be a string',
      'INVALID_MODEL_TYPE',
      'Invalid model selection',
      ['Please select a valid model from the dropdown']
    );
  }
  
  const trimmedModelId = modelId.trim();
  if (!trimmedModelId) {
    throw new OllamaError(
      'Model ID cannot be empty',
      'EMPTY_MODEL_ID',
      'Please select a model to continue',
      ['Choose from available models']
    );
  }
  
  const allowedModels = await getAllowedModels();
  
  if (!allowedModels.includes(trimmedModelId)) {
    const suggestion = allowedModels.find(model => 
      model.toLowerCase().includes(trimmedModelId.toLowerCase()) || 
      trimmedModelId.toLowerCase().includes(model.toLowerCase())
    );
    
    const suggestions = suggestion 
      ? [`Try using '${suggestion}' instead`, 'Check available models list']
      : ['Choose from available models', 'Refresh the model list'];
    
    throw new OllamaError(
      `Model '${trimmedModelId}' is not available`,
      'MODEL_NOT_FOUND',
      `Model '${trimmedModelId}' is not available. Available models: ${allowedModels.join(', ')}`,
      suggestions
    );
  }
  
  return trimmedModelId;
}

export async function runModelStream(modelId, prompt, onChunk, onClose, onError) {
  try {
    // Validate modelId against database
    const validatedModelId = await validateModel(modelId);

    // Validate prompt
    if (typeof prompt !== "string" || prompt.trim() === "") {
      throw new OllamaError(
        "Prompt must be a non-empty string",
        'EMPTY_PROMPT',
        'Please enter a message to send',
        ['Type your question or message', 'Try asking something specific']
      );
    }
    if (prompt.length > 1000) {
      throw new OllamaError(
        "Prompt is too long. Maximum 1000 characters",
        'PROMPT_TOO_LONG',
        `Your message is too long (${prompt.length}/1000 characters)`,
        ['Shorten your message', 'Break it into smaller parts']
      );
    }

    console.log(`[runModelStream] Using Ollama API: ${OLLAMA_BASE_URL}`);
    console.log(`[runModelStream] Starting model: ${validatedModelId}`);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: validatedModelId,
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body from Ollama API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";

    // Set up timeouts using your env variables
    const IDLE_TIMEOUT_MS = parseInt(process.env.OLLAMA_IDLE_TIMEOUT_MS) || 300000; // 5 minutes
    const TOTAL_TIMEOUT_MS = parseInt(process.env.OLLAMA_TOTAL_TIMEOUT_MS) || 600000; // 10 minutes

    let idleTimer = null;
    let totalTimer = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const err = new Error("Model run idle timeout");
        reader.cancel();
        onError(err);
      }, IDLE_TIMEOUT_MS);
    }

    function startTotalTimer() {
      if (totalTimer) clearTimeout(totalTimer);
      totalTimer = setTimeout(() => {
        const err = new Error("Model run total timeout");
        reader.cancel();
        onError(err);
      }, TOTAL_TIMEOUT_MS);
    }

    // Start timers
    resetIdle();
    startTotalTimer();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetIdle(); // Reset idle timer on each chunk

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              const cleanResponse = stripAnsiCodes(data.response);
              accumulatedText += cleanResponse;
              onChunk && onChunk(cleanResponse);
            }
            
            if (data.done) {
              // Clear timers
              if (idleTimer) clearTimeout(idleTimer);
              if (totalTimer) clearTimeout(totalTimer);
              
              console.log(`[runModelStream] Stream completed. Total length: ${accumulatedText.length}`);
              onClose && onClose(accumulatedText);
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('[runModelStream] Invalid JSON line:', line);
          }
        }
      }

      // Stream ended without explicit done
      if (idleTimer) clearTimeout(idleTimer);
      if (totalTimer) clearTimeout(totalTimer);
      onClose && onClose(accumulatedText);

    } catch (readError) {
      if (idleTimer) clearTimeout(idleTimer);
      if (totalTimer) clearTimeout(totalTimer);
      throw readError;
    }

  } catch (err) {
    console.error(`[runModelStream] Error:`, err);
    
    if (err instanceof OllamaError) {
      // Pass through structured errors
      onError && onError(err);
    } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      onError && onError(new OllamaError(
        `Cannot connect to Ollama server at ${OLLAMA_BASE_URL}`,
        'CONNECTION_FAILED',
        'Cannot connect to AI server',
        ['Check if Ollama is running', 'Try refreshing the page', 'Contact support if problem persists']
      ));
    } else if (err.message.includes('ECONNREFUSED')) {
      onError && onError(new OllamaError(
        `Ollama server not running at ${OLLAMA_BASE_URL}`,
        'SERVER_OFFLINE',
        'AI server is offline',
        ['Please wait while we try to reconnect', 'Try refreshing the page', 'Contact support if problem persists']
      ));
    } else {
      onError && onError(new OllamaError(
        err.message || 'Unknown error occurred',
        'UNKNOWN_ERROR',
        'Something went wrong while processing your request',
        ['Try again in a moment', 'Refresh the page', 'Contact support if problem persists']
      ));
    }
  }
}

// Cache invalidation function for when models are updated
export function invalidateModelsCache() {
  console.log('[invalidateModelsCache] Clearing models cache...');
  allowedModelsCache = [];
  cacheLastUpdated = 0;
}

// Real model pulling with progress tracking
export async function pullModel(modelName, onProgress, onError, onComplete) {
  try {
    console.log(`[pullModel] Starting to pull model: ${modelName}`);
    
    // Validate model name first
    await validateModel(modelName);
    
    // Make request to Ollama pull API
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true
      })
    });

    if (!response.ok) {
      throw new OllamaError(
        `Failed to start model pull: ${response.statusText}`,
        'PULL_REQUEST_FAILED',
        `Unable to start downloading ${modelName}`,
        ['Check if Ollama server is running', 'Verify model name is correct', 'Try again in a moment']
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    console.log(`[pullModel] Started streaming pull for ${modelName}`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete JSON lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            
            // Handle progress updates
            if (data.status) {
              const progressInfo = {
                status: data.status,
                completed: data.completed || 0,
                total: data.total || 0,
                digest: data.digest || '',
                percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
              };

              console.log(`[pullModel] Progress for ${modelName}:`, progressInfo);
              onProgress && onProgress(progressInfo);
            }

            // Handle completion
            if (data.status === 'success' || data.status === 'pulling complete') {
              console.log(`[pullModel] Successfully pulled ${modelName}`);
              onComplete && onComplete({ modelName, success: true });
              return true;
            }

            // Handle errors
            if (data.error) {
              throw new OllamaError(
                data.error,
                'PULL_ERROR',
                `Failed to download ${modelName}: ${data.error}`,
                ['Check internet connection', 'Verify sufficient disk space', 'Try again later']
              );
            }
          } catch (parseError) {
            if (parseError instanceof OllamaError) {
              throw parseError;
            }
            console.warn(`[pullModel] Failed to parse progress line:`, line, parseError);
          }
        }
      }
    }

    // If we reach here without explicit success, assume success
    console.log(`[pullModel] Pull completed for ${modelName}`);
    onComplete && onComplete({ modelName, success: true });
    return true;

  } catch (error) {
    console.error(`[pullModel] Error pulling ${modelName}:`, error);
    
    if (error instanceof OllamaError) {
      onError && onError(error);
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      onError && onError(new OllamaError(
        `Cannot connect to Ollama server at ${OLLAMA_BASE_URL}`,
        'CONNECTION_FAILED',
        'Cannot connect to AI server',
        ['Check if Ollama is running', 'Verify server URL', 'Try refreshing the page']
      ));
    } else {
      onError && onError(new OllamaError(
        error.message || 'Unknown error during model pull',
        'PULL_UNKNOWN_ERROR',
        `Failed to download ${modelName}`,
        ['Try again in a moment', 'Check internet connection', 'Contact support if problem persists']
      ));
    }
    return false;
  }
}

// Verify if model is actually installed locally
export async function verifyModelInstalled(modelName) {
  try {
    console.log(`[verifyModelInstalled] Checking if ${modelName} is installed`);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model list: ${response.statusText}`);
    }
    
    const data = await response.json();
    const installedModels = data.models || [];
    
    // Check if our model is in the installed list
    const isInstalled = installedModels.some(model => 
      model.name === modelName || 
      model.name.startsWith(modelName + ':')
    );
    
    console.log(`[verifyModelInstalled] Model ${modelName} installed:`, isInstalled);
    return isInstalled;
    
  } catch (error) {
    console.error(`[verifyModelInstalled] Error checking ${modelName}:`, error);
    return false;
  }
}

// Remove/delete a pulled model
export async function removeModel(modelName) {
  try {
    console.log(`[removeModel] Removing model: ${modelName}`);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName
      })
    });

    if (!response.ok) {
      throw new OllamaError(
        `Failed to remove model: ${response.statusText}`,
        'REMOVE_FAILED',
        `Unable to remove ${modelName}`,
        ['Check if Ollama server is running', 'Verify model exists', 'Try again in a moment']
      );
    }

    console.log(`[removeModel] Successfully removed ${modelName}`);
    return true;

  } catch (error) {
    console.error(`[removeModel] Error removing ${modelName}:`, error);
    
    if (error instanceof OllamaError) {
      throw error;
    } else {
      throw new OllamaError(
        error.message || 'Unknown error during model removal',
        'REMOVE_UNKNOWN_ERROR',
        `Failed to remove ${modelName}`,
        ['Try again in a moment', 'Check if model exists', 'Contact support if problem persists']
      );
    }
  }
}
