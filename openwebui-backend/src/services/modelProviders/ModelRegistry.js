/**
 * ModelRegistry - Central hub for managing all model providers
 * 
 * This service provides a unified interface to work with models
 * from any provider (Ollama, HuggingFace, OpenAI, custom, etc.)
 */

import OllamaModelProvider from './OllamaModelProvider.js';
import HuggingFaceModelProvider from './HuggingFaceModelProvider.js';

class ModelRegistry {
    constructor() {
        this.providers = new Map();
        this.defaultProvider = 'ollama';
        this.initializeProviders();
    }

    /**
     * Initialize all available providers
     */
    initializeProviders() {
        // Initialize Ollama provider
        this.registerProvider('ollama', new OllamaModelProvider({
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        }));

        // Initialize HuggingFace provider
        if (process.env.HUGGINGFACE_API_KEY) {
            this.registerProvider('huggingface', new HuggingFaceModelProvider({
                apiKey: process.env.HUGGINGFACE_API_KEY
            }));
        }

        // Additional providers can be registered here
        // this.registerProvider('openai', new OpenAIModelProvider(...));
        // this.registerProvider('custom', new CustomModelProvider(...));
    }

    /**
     * Register a new provider
     */
    registerProvider(name, providerInstance) {
        this.providers.set(name, providerInstance);
        console.log(`[ModelRegistry] Registered provider: ${name}`);
    }

    /**
     * Get a specific provider
     */
    getProvider(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider '${providerName}' not found or not initialized`);
        }
        return provider;
    }

    /**
     * Detect provider from model name or metadata
     * Examples:
     * - "phi:2.7b" -> ollama (has colon format)
     * - "microsoft/phi-2" -> huggingface (has slash format)
     * - explicit: { provider: 'ollama', model: 'phi:2.7b' }
     */
    detectProvider(modelIdentifier) {
        if (typeof modelIdentifier === 'object' && modelIdentifier.provider) {
            return modelIdentifier.provider;
        }

        const modelName = typeof modelIdentifier === 'string' 
            ? modelIdentifier 
            : modelIdentifier.name;

        // HuggingFace format: user/repo
        if (modelName.includes('/') && !modelName.includes(':')) {
            return 'huggingface';
        }

        // Ollama format: model:tag
        if (modelName.includes(':')) {
            return 'ollama';
        }

        // Default fallback
        return this.defaultProvider;
    }

    /**
     * Parse model identifier into provider and name
     */
    parseModelIdentifier(identifier) {
        const provider = this.detectProvider(identifier);
        const modelName = typeof identifier === 'string' 
            ? identifier 
            : identifier.name || identifier.model;

        return { provider, modelName };
    }

    /**
     * Download a model using appropriate provider
     */
    async downloadModel(modelIdentifier, options = {}, onProgress = null) {
        try {
            const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
            const provider = this.getProvider(providerName);

            console.log(`[ModelRegistry] Downloading ${modelName} using ${providerName} provider`);

            const result = await provider.downloadModel(modelName, options, onProgress);
            
            return {
                ...result,
                provider: providerName,
                modelName
            };

        } catch (error) {
            console.error('[ModelRegistry] Download error:', error);
            throw {
                success: false,
                error: error.message || error.error,
                provider: error.provider || 'unknown',
                suggestions: error.suggestions || []
            };
        }
    }

    /**
     * Remove a model
     */
    async removeModel(modelIdentifier) {
        try {
            const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
            const provider = this.getProvider(providerName);

            console.log(`[ModelRegistry] Removing ${modelName} from ${providerName}`);

            return await provider.removeModel(modelName);

        } catch (error) {
            throw {
                success: false,
                error: error.message || error.error,
                provider: error.provider || 'unknown'
            };
        }
    }

    /**
     * Check if model is installed
     */
    async isModelInstalled(modelIdentifier) {
        try {
            const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
            const provider = this.getProvider(providerName);

            return await provider.isModelInstalled(modelName);

        } catch (error) {
            return false;
        }
    }

    /**
     * Get model metadata
     */
    async getModelMetadata(modelIdentifier) {
        const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
        const provider = this.getProvider(providerName);

        return await provider.getModelMetadata(modelName);
    }

    /**
     * List all installed models across all providers
     */
    async listAllInstalledModels() {
        const allModels = [];

        for (const [providerName, provider] of this.providers) {
            try {
                const models = await provider.listInstalledModels();
                allModels.push(...models.map(m => ({ ...m, provider: providerName })));
            } catch (error) {
                console.error(`[ModelRegistry] Error listing models from ${providerName}:`, error);
            }
        }

        return allModels;
    }

    /**
     * List available providers
     */
    listProviders() {
        const providersList = [];
        
        for (const [name, provider] of this.providers) {
            providersList.push({
                name,
                info: provider.getProviderInfo(),
                capabilities: provider.getCapabilities()
            });
        }

        return providersList;
    }

    /**
     * Run inference with a model
     */
    async runInference(modelIdentifier, input, options = {}) {
        const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
        const provider = this.getProvider(providerName);

        return await provider.runInference(modelName, input, options);
    }

    /**
     * Stream inference with a model
     */
    async streamInference(modelIdentifier, input, onChunk, options = {}) {
        const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
        const provider = this.getProvider(providerName);

        return await provider.streamInference(modelName, input, onChunk, options);
    }

    /**
     * Get model size
     */
    async getModelSize(modelIdentifier) {
        const { provider: providerName, modelName } = this.parseModelIdentifier(modelIdentifier);
        const provider = this.getProvider(providerName);

        return await provider.getModelSize(modelName);
    }

    /**
     * Get provider capabilities
     */
    getProviderCapabilities(providerName) {
        const provider = this.providers.get(providerName);
        return provider ? provider.getCapabilities() : null;
    }
}

// Singleton instance
const modelRegistry = new ModelRegistry();

export default modelRegistry;
export { ModelRegistry };
