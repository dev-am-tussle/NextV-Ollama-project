/**
 * BaseModelProvider - Abstract base class for all model providers
 * 
 * This provides a unified interface for downloading, managing, and using models
 * from different sources (Ollama, HuggingFace, OpenAI, etc.)
 */

export class BaseModelProvider {
    constructor(config = {}) {
        this.config = config;
        this.providerName = 'base';
    }

    /**
     * Get provider identification
     */
    getProviderInfo() {
        return {
            name: this.providerName,
            type: this.config.type || 'unknown',
            capabilities: this.getCapabilities()
        };
    }

    /**
     * Get provider capabilities
     */
    getCapabilities() {
        return {
            supportsDownload: false,
            supportsStreaming: false,
            supportsFineTuning: false,
            supportsLocalExecution: false,
            requiresApiKey: false
        };
    }

    /**
     * Validate model name format
     */
    validateModelName(modelName) {
        if (!modelName || typeof modelName !== 'string') {
            throw new Error('Invalid model name');
        }
        return true;
    }

    /**
     * Download a model with progress tracking
     * @param {string} modelName - Name/ID of the model
     * @param {Object} options - Download options
     * @param {Function} onProgress - Progress callback (percentage, status, etc.)
     * @returns {Promise<Object>} Download result
     */
    async downloadModel(modelName, options = {}, onProgress = null) {
        throw new Error(`downloadModel not implemented for ${this.providerName}`);
    }

    /**
     * Remove/uninstall a model
     * @param {string} modelName - Name/ID of the model
     * @returns {Promise<Object>} Removal result
     */
    async removeModel(modelName) {
        throw new Error(`removeModel not implemented for ${this.providerName}`);
    }

    /**
     * Check if a model is installed/available locally
     * @param {string} modelName - Name/ID of the model
     * @returns {Promise<boolean>}
     */
    async isModelInstalled(modelName) {
        throw new Error(`isModelInstalled not implemented for ${this.providerName}`);
    }

    /**
     * Get model metadata
     * @param {string} modelName - Name/ID of the model
     * @returns {Promise<Object>} Model metadata
     */
    async getModelMetadata(modelName) {
        throw new Error(`getModelMetadata not implemented for ${this.providerName}`);
    }

    /**
     * List all available models from this provider
     * @returns {Promise<Array>} List of models
     */
    async listAvailableModels() {
        throw new Error(`listAvailableModels not implemented for ${this.providerName}`);
    }

    /**
     * List locally installed models
     * @returns {Promise<Array>} List of installed models
     */
    async listInstalledModels() {
        throw new Error(`listInstalledModels not implemented for ${this.providerName}`);
    }

    /**
     * Execute inference with the model
     * @param {string} modelName - Name/ID of the model
     * @param {Object} input - Input data
     * @param {Object} options - Inference options
     * @returns {Promise<Object>} Inference result
     */
    async runInference(modelName, input, options = {}) {
        throw new Error(`runInference not implemented for ${this.providerName}`);
    }

    /**
     * Stream inference results
     * @param {string} modelName - Name/ID of the model
     * @param {Object} input - Input data
     * @param {Function} onChunk - Chunk callback
     * @param {Object} options - Inference options
     * @returns {Promise<void>}
     */
    async streamInference(modelName, input, onChunk, options = {}) {
        throw new Error(`streamInference not implemented for ${this.providerName}`);
    }

    /**
     * Get estimated size of model
     * @param {string} modelName - Name/ID of the model
     * @returns {Promise<Object>} Size information (bytes, formatted)
     */
    async getModelSize(modelName) {
        throw new Error(`getModelSize not implemented for ${this.providerName}`);
    }

    /**
     * Cancel an ongoing operation (download, inference, etc.)
     * @param {string} operationId - ID of the operation to cancel
     * @returns {Promise<boolean>} Success status
     */
    async cancelOperation(operationId) {
        return false;
    }
}

export default BaseModelProvider;
