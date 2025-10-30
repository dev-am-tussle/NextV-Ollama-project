/**
 * OllamaModelProvider - Ollama-specific implementation
 * 
 * Handles downloading, managing, and running Ollama models locally
 */

import BaseModelProvider from './BaseModelProvider.js';
import axios from 'axios';

export class OllamaModelProvider extends BaseModelProvider {
    constructor(config = {}) {
        super(config);
        this.providerName = 'ollama';
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    }

    getCapabilities() {
        return {
            supportsDownload: true,
            supportsStreaming: true,
            supportsFineTuning: false,
            supportsLocalExecution: true,
            requiresApiKey: false
        };
    }

    /**
     * Download/Pull an Ollama model
     */
    async downloadModel(modelName, options = {}, onProgress = null) {
        try {
            this.validateModelName(modelName);

            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/api/pull`,
                data: { name: modelName, stream: true },
                responseType: 'stream'
            });

            return new Promise((resolve, reject) => {
                let lastProgress = null;

                response.data.on('data', (chunk) => {
                    try {
                        const lines = chunk.toString().split('\n').filter(Boolean);
                        
                        for (const line of lines) {
                            const data = JSON.parse(line);
                            
                            if (data.status && onProgress) {
                                const progress = {
                                    type: 'progress',
                                    status: data.status,
                                    completed: data.completed || 0,
                                    total: data.total || 0,
                                    percentage: data.total ? 
                                        Math.round((data.completed / data.total) * 100) : 0
                                };
                                
                                lastProgress = progress;
                                onProgress(progress);
                            }

                            if (data.status === 'success') {
                                resolve({
                                    success: true,
                                    modelName,
                                    provider: 'ollama',
                                    message: 'Model downloaded successfully',
                                    finalProgress: lastProgress
                                });
                            }
                        }
                    } catch (parseError) {
                        console.error('[Ollama] Parse error:', parseError);
                    }
                });

                response.data.on('error', (error) => {
                    reject({
                        success: false,
                        error: error.message,
                        provider: 'ollama'
                    });
                });

                response.data.on('end', () => {
                    resolve({
                        success: true,
                        modelName,
                        provider: 'ollama',
                        message: 'Download stream ended',
                        finalProgress: lastProgress
                    });
                });
            });

        } catch (error) {
            console.error('[Ollama] Download error:', error);
            throw {
                success: false,
                error: error.response?.data?.error || error.message,
                provider: 'ollama',
                suggestions: [
                    'Ensure Ollama is running',
                    'Check model name spelling',
                    'Verify network connection'
                ]
            };
        }
    }

    /**
     * Remove an Ollama model
     */
    async removeModel(modelName) {
        try {
            this.validateModelName(modelName);

            const response = await axios.delete(`${this.baseUrl}/api/delete`, {
                data: { name: modelName }
            });

            return {
                success: true,
                modelName,
                provider: 'ollama',
                message: 'Model removed successfully'
            };

        } catch (error) {
            throw {
                success: false,
                error: error.response?.data?.error || error.message,
                provider: 'ollama'
            };
        }
    }

    /**
     * Check if model is installed
     */
    async isModelInstalled(modelName) {
        try {
            const models = await this.listInstalledModels();
            return models.some(m => m.name === modelName);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get model metadata
     */
    async getModelMetadata(modelName) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/show`, {
                name: modelName
            });

            return {
                name: modelName,
                provider: 'ollama',
                ...response.data
            };
        } catch (error) {
            throw {
                success: false,
                error: 'Model not found or metadata unavailable',
                provider: 'ollama'
            };
        }
    }

    /**
     * List available models from Ollama library
     */
    async listAvailableModels() {
        // Ollama doesn't have a direct API for browsing library
        // This would require scraping ollama.ai/library or using a custom registry
        return [];
    }

    /**
     * List locally installed Ollama models
     */
    async listInstalledModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            
            return (response.data.models || []).map(model => ({
                name: model.name,
                provider: 'ollama',
                size: model.size,
                modified_at: model.modified_at,
                digest: model.digest,
                details: model.details
            }));

        } catch (error) {
            console.error('[Ollama] List models error:', error);
            return [];
        }
    }

    /**
     * Run inference
     */
    async runInference(modelName, input, options = {}) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: modelName,
                prompt: input.prompt || input,
                stream: false,
                ...options
            });

            return {
                success: true,
                provider: 'ollama',
                result: response.data.response,
                metadata: {
                    model: response.data.model,
                    created_at: response.data.created_at,
                    done: response.data.done
                }
            };

        } catch (error) {
            throw {
                success: false,
                error: error.response?.data?.error || error.message,
                provider: 'ollama'
            };
        }
    }

    /**
     * Stream inference
     */
    async streamInference(modelName, input, onChunk, options = {}) {
        try {
            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/api/generate`,
                data: {
                    model: modelName,
                    prompt: input.prompt || input,
                    stream: true,
                    ...options
                },
                responseType: 'stream'
            });

            response.data.on('data', (chunk) => {
                try {
                    const data = JSON.parse(chunk.toString());
                    if (data.response) {
                        onChunk(data.response, data.done);
                    }
                } catch (error) {
                    console.error('[Ollama] Stream parse error:', error);
                }
            });

            return new Promise((resolve, reject) => {
                response.data.on('end', () => resolve({ success: true }));
                response.data.on('error', reject);
            });

        } catch (error) {
            throw {
                success: false,
                error: error.message,
                provider: 'ollama'
            };
        }
    }

    /**
     * Get model size
     */
    async getModelSize(modelName) {
        try {
            const metadata = await this.getModelMetadata(modelName);
            return {
                bytes: metadata.size || 0,
                formatted: this.formatBytes(metadata.size || 0)
            };
        } catch (error) {
            return { bytes: 0, formatted: 'Unknown' };
        }
    }

    /**
     * Helper: Format bytes to human-readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
}

export default OllamaModelProvider;
