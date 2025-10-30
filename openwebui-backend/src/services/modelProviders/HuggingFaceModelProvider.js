/**
 * HuggingFaceModelProvider - HuggingFace-specific implementation
 * 
 * Handles downloading and managing models from HuggingFace Hub
 */

import BaseModelProvider from './BaseModelProvider.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export class HuggingFaceModelProvider extends BaseModelProvider {
    constructor(config = {}) {
        super(config);
        this.providerName = 'huggingface';
        this.apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY;
        this.baseUrl = 'https://huggingface.co';
        this.apiUrl = 'https://api-inference.huggingface.co';
        this.modelsDir = config.modelsDir || path.join(process.cwd(), 'models', 'huggingface');
    }

    getCapabilities() {
        return {
            supportsDownload: true,
            supportsStreaming: true,
            supportsFineTuning: false,
            supportsLocalExecution: true,
            requiresApiKey: true
        };
    }

    /**
     * Download a model from HuggingFace Hub
     */
    async downloadModel(modelName, options = {}, onProgress = null) {
        try {
            this.validateModelName(modelName);

            if (!this.apiKey) {
                throw new Error('HuggingFace API key required');
            }

            // Ensure models directory exists
            if (!fs.existsSync(this.modelsDir)) {
                fs.mkdirSync(this.modelsDir, { recursive: true });
            }

            const modelDir = path.join(this.modelsDir, modelName.replace('/', '_'));
            if (!fs.existsSync(modelDir)) {
                fs.mkdirSync(modelDir, { recursive: true });
            }

            onProgress?.({
                type: 'starting',
                status: 'Fetching model info from HuggingFace...',
                percentage: 0
            });

            // Get model files list
            const filesUrl = `${this.baseUrl}/api/models/${modelName}/tree/main`;
            const filesResponse = await axios.get(filesUrl, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            const files = filesResponse.data || [];
            const totalFiles = files.length;

            onProgress?.({
                type: 'progress',
                status: `Found ${totalFiles} files to download`,
                percentage: 5
            });

            // Download each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileUrl = `${this.baseUrl}/${modelName}/resolve/main/${file.path}`;
                const filePath = path.join(modelDir, file.path);

                // Create subdirectories if needed
                const fileDir = path.dirname(filePath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }

                onProgress?.({
                    type: 'progress',
                    status: `Downloading ${file.path}`,
                    percentage: Math.round(((i + 1) / totalFiles) * 95) + 5
                });

                const response = await axios({
                    method: 'GET',
                    url: fileUrl,
                    responseType: 'stream',
                    headers: { 'Authorization': `Bearer ${this.apiKey}` }
                });

                const writer = fs.createWriteStream(filePath);
                await pipeline(response.data, writer);
            }

            onProgress?.({
                type: 'complete',
                status: 'Model downloaded successfully',
                percentage: 100
            });

            return {
                success: true,
                modelName,
                provider: 'huggingface',
                message: 'Model downloaded successfully',
                location: modelDir
            };

        } catch (error) {
            console.error('[HuggingFace] Download error:', error);
            throw {
                success: false,
                error: error.message,
                provider: 'huggingface',
                suggestions: [
                    'Check your HuggingFace API key',
                    'Verify model name format (user/model)',
                    'Ensure sufficient disk space'
                ]
            };
        }
    }

    /**
     * Remove a model
     */
    async removeModel(modelName) {
        try {
            const modelDir = path.join(this.modelsDir, modelName.replace('/', '_'));
            
            if (fs.existsSync(modelDir)) {
                fs.rmSync(modelDir, { recursive: true, force: true });
                return {
                    success: true,
                    modelName,
                    provider: 'huggingface',
                    message: 'Model removed successfully'
                };
            }

            throw new Error('Model not found locally');

        } catch (error) {
            throw {
                success: false,
                error: error.message,
                provider: 'huggingface'
            };
        }
    }

    /**
     * Check if model is installed
     */
    async isModelInstalled(modelName) {
        const modelDir = path.join(this.modelsDir, modelName.replace('/', '_'));
        return fs.existsSync(modelDir);
    }

    /**
     * Get model metadata
     */
    async getModelMetadata(modelName) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/models/${modelName}`, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
            });

            return {
                name: modelName,
                provider: 'huggingface',
                ...response.data
            };
        } catch (error) {
            throw {
                success: false,
                error: 'Model not found or metadata unavailable',
                provider: 'huggingface'
            };
        }
    }

    /**
     * List available models (trending/popular)
     */
    async listAvailableModels(filter = {}) {
        try {
            const params = new URLSearchParams({
                limit: filter.limit || 20,
                sort: filter.sort || 'downloads',
                direction: -1,
                ...filter
            });

            const response = await axios.get(`${this.baseUrl}/api/models?${params}`);
            
            return (response.data || []).map(model => ({
                name: model.id,
                provider: 'huggingface',
                downloads: model.downloads,
                likes: model.likes,
                tags: model.tags,
                pipeline_tag: model.pipeline_tag
            }));

        } catch (error) {
            console.error('[HuggingFace] List models error:', error);
            return [];
        }
    }

    /**
     * List locally installed models
     */
    async listInstalledModels() {
        try {
            if (!fs.existsSync(this.modelsDir)) {
                return [];
            }

            const modelDirs = fs.readdirSync(this.modelsDir);
            
            return modelDirs.map(dir => {
                const modelPath = path.join(this.modelsDir, dir);
                const stats = fs.statSync(modelPath);
                
                return {
                    name: dir.replace('_', '/'),
                    provider: 'huggingface',
                    location: modelPath,
                    size: this.getDirectorySize(modelPath),
                    modified_at: stats.mtime
                };
            });

        } catch (error) {
            console.error('[HuggingFace] List installed models error:', error);
            return [];
        }
    }

    /**
     * Run inference via HuggingFace Inference API
     */
    async runInference(modelName, input, options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('HuggingFace API key required for inference');
            }

            const response = await axios.post(
                `${this.apiUrl}/models/${modelName}`,
                { inputs: input.text || input },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                provider: 'huggingface',
                result: response.data
            };

        } catch (error) {
            throw {
                success: false,
                error: error.response?.data?.error || error.message,
                provider: 'huggingface'
            };
        }
    }

    /**
     * Get directory size recursively
     */
    getDirectorySize(dirPath) {
        let totalSize = 0;
        
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                totalSize += this.getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
        
        return totalSize;
    }
}

export default HuggingFaceModelProvider;
