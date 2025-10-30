import { Organization, User } from "../models/index.js";
import { AvailableModel } from "../models/availableModel.model.js";
import { pullModel, removeModel, verifyModelInstalled } from "../services/ollama.service.js";

/**
 * Get categorized models for the current user
 * Returns models in three categories: downloaded, available_to_download, available_for_purchase
 */
const getCategorizedModelsForUser = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // ✅ FIX: Import UserSettings
        const { UserSettings } = await import('../models/user.models.js');
        
        // Get user with organization
        const user = await User.findById(userId).populate('organization_id');

        if (!user || !user.organization_id) {
            return res.status(404).json({
                success: false,
                message: "User or organization not found"
            });
        }

        const organization = user.organization_id;

        // ✅ FIX: Get user's pulled models from UserSettings collection
        const userSettings = await UserSettings.findOne({ user_id: userId }).populate('pulled_models.model_id');
        const pulledModels = userSettings?.pulled_models || [];

        // Get organization's allowed models (array of objects with model_id)
        const allowedModelDocs = organization.settings?.allowed_models || [];
        const allowedModelIds = allowedModelDocs
            .filter(doc => doc.enabled)
            .map(doc => doc.model_id.toString());

        // Get all available models from database
        const allAvailableModels = await AvailableModel.find({});

        // Create maps for quick lookup
        const modelMapByName = new Map();
        const modelMapById = new Map();
        allAvailableModels.forEach(model => {
            modelMapByName.set(model.name, model);
            modelMapById.set(model._id.toString(), model);
        });

        // 1. Downloaded Models (UserSettings.pulled_models)
        const downloadedModels = pulledModels
            .map(pulledModel => {
                // ✅ FIX: pulledModel.model_id is already populated
                const baseModel = pulledModel.model_id;
                if (!baseModel || !baseModel._id) return null;

                return {
                    _id: baseModel._id,
                    name: baseModel.name,
                    display_name: baseModel.display_name,
                    description: baseModel.description,
                    category: baseModel.category,
                    performance_tier: baseModel.performance_tier,
                    size: baseModel.size,
                    min_ram_gb: baseModel.min_ram_gb,
                    tags: baseModel.tags,
                    use_cases: baseModel.use_cases,
                    // Downloaded-specific fields
                    pulled_at: pulledModel.pulled_at,
                    usage_count: pulledModel.usage_count || 0,
                    last_used: pulledModel.last_used,
                    download_status: pulledModel.download_status,
                    file_size: pulledModel.file_size
                };
            })
            .filter(Boolean);

        // 2. Available to Download (org.settings.allowed_models minus UserSettings.pulled_models)
        const availableToDownload = allowedModelIds
            .map(modelId => {
                const baseModel = modelMapById.get(modelId);
                if (!baseModel) return null;

                // ✅ FIX: Skip if already downloaded (check by model_id)
                if (pulledModels.some(p => p.model_id && p.model_id._id.toString() === modelId)) return null;

                // Find the org model entry for purchase details
                const orgModelEntry = allowedModelDocs.find(doc => doc.model_id.toString() === modelId);

                return {
                    _id: baseModel._id,
                    name: baseModel.name,
                    display_name: baseModel.display_name,
                    description: baseModel.description,
                    category: baseModel.category,
                    performance_tier: baseModel.performance_tier,
                    size: baseModel.size,
                    min_ram_gb: baseModel.min_ram_gb,
                    tags: baseModel.tags,
                    use_cases: baseModel.use_cases,
                    // Available to download specific fields
                    purchased_at: orgModelEntry?.purchase_details?.purchased_at || orgModelEntry?.added_at,
                    org_purchase_details: {
                        cost: orgModelEntry?.purchase_details?.cost || 0,
                        billing_cycle: orgModelEntry?.purchase_details?.billing_cycle || 'monthly'
                    }
                };
            })
            .filter(Boolean);

        // 3. Available for Purchase (all models minus org.settings.allowed_models)
        const availableForPurchase = allAvailableModels
            .filter(model => !allowedModelIds.includes(model._id.toString()))
            .map(model => ({
                _id: model._id,
                name: model.name,
                display_name: model.display_name,
                description: model.description,
                category: model.category,
                performance_tier: model.performance_tier,
                size: model.size,
                min_ram_gb: model.min_ram_gb,
                tags: model.tags,
                use_cases: model.use_cases,
                // Purchase-specific fields
                pricing: model.pricing || {
                    monthly: 29,
                    yearly: 290,
                    one_time: 999
                },
                popular: model.stats?.download_count > 1000,
                recommended: model.category === organization.settings?.preferred_categories?.[0]
            }))
            .sort((a, b) => {
                // Sort by recommended first, then popular, then alphabetically
                if (a.recommended && !b.recommended) return -1;
                if (!a.recommended && b.recommended) return 1;
                if (a.popular && !b.popular) return -1;
                if (!a.popular && b.popular) return 1;
                return a.display_name.localeCompare(b.display_name);
            });

        res.json({
            success: true,
            organization: {
                name: organization.name,
                _id: organization._id
            },
            data: {
                downloaded: downloadedModels,
                available_to_download: availableToDownload,
                available_for_purchase: availableForPurchase
            },
            counts: {
                downloaded: downloadedModels.length,
                available_to_download: availableToDownload.length,
                available_for_purchase: availableForPurchase.length,
                total_allowed: allowedModelNames.length,
                total_global: allAvailableModels.length
            }
        });

    } catch (error) {
        console.error("Error getting categorized models:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve models",
            error: error.message
        });
    }
};

/**
 * Download a model with progress tracking
 */
const downloadModelWithProgress = async (req, res) => {
    try {
        const { modelName } = req.params;
        const userId = req.user.id;

        // ✅ FIX: Import UserSettings model
        const { UserSettings } = await import('../models/user.models.js');

        // Get user with organization
        const user = await User.findById(userId).populate('organization_id');

        if (!user || !user.organization_id) {
            return res.status(404).json({
                success: false,
                message: "User or organization not found"
            });
        }

        // ✅ FIX: Get user settings from separate collection
        let userSettings = await UserSettings.findOne({ user_id: userId });
        
        // Create settings if not exists
        if (!userSettings) {
            console.log(`[downloadModelWithProgress] Creating settings for user ${userId}`);
            userSettings = await UserSettings.create({
                user_id: userId,
                pulled_models: []
            });
        }

        // Check if user's organization has access to this model
        // allowed_models is an array of objects with model_id references
        const allowedModels = user.organization_id.settings?.allowed_models || [];
        
        // Find the model in AvailableModel collection to get its _id
        const modelDoc = await AvailableModel.findOne({ name: modelName });
        if (!modelDoc) {
            return res.status(404).json({
                success: false,
                message: "Model not found in system"
            });
        }

        // Check if this model_id is in organization's allowed_models
        const hasAccess = allowedModels.some(
            allowedModel => allowedModel.model_id.toString() === modelDoc._id.toString() && allowedModel.enabled
        );

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "This model is not available for your organization"
            });
        }

        // ✅ FIX: Check if already downloaded using model_id, not name
        const pulledModels = userSettings.pulled_models || [];
        if (pulledModels.some(m => m.model_id.toString() === modelDoc._id.toString())) {
            return res.status(400).json({
                success: false,
                message: "Model already downloaded"
            });
        }

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        const sendProgress = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        try {
            // Start the download with progress tracking
            sendProgress({
                type: 'starting',
                status: 'Starting download...',
                percentage: 0
            });

            // ✅ FIX: Track if already saved to prevent duplicates
            let modelSavedToDb = false;

            const result = await pullModel(modelName, 
                // Progress callback - only send updates, no DB operations
                (progress) => {
                    sendProgress({
                        type: 'progress',
                        status: progress.status,
                        percentage: progress.percentage,
                        completed: progress.completed,
                        total: progress.total
                    });
                },
                // Error callback
                (error) => {
                    sendProgress({
                        type: 'error',
                        error: error.userMessage || error.message,
                        suggestions: error.suggestions || []
                    });
                },
                // Complete callback - ONLY CALLED ONCE at the end
                async (result) => {
                    if (result.success && !modelSavedToDb) {
                        modelSavedToDb = true; // Prevent duplicate saves
                        
                        console.log(`[downloadModelWithProgress] Saving ${modelName} (${modelDoc._id}) to user's pulled_models`);
                        
                        // ✅ FIX: Check in UserSettings collection
                        const freshSettings = await UserSettings.findOne({ user_id: userId });
                        const alreadyExists = freshSettings?.pulled_models?.some(
                            m => m.model_id.toString() === modelDoc._id.toString()
                        );

                        if (!alreadyExists) {
                            // ✅ FIX: Update UserSettings collection, not User
                            await UserSettings.findOneAndUpdate(
                                { user_id: userId },
                                {
                                    $push: {
                                        pulled_models: {
                                            model_id: modelDoc._id,  // Store model_id reference
                                            pulled_at: new Date(),
                                            usage_count: 0,
                                            last_used: null,
                                            local_path: null,
                                            file_size: 0,
                                            download_status: 'completed'
                                        }
                                    },
                                    $set: {
                                        updated_at: new Date()
                                    }
                                },
                                { upsert: true, new: true }
                            );
                            console.log(`[downloadModelWithProgress] Successfully saved ${modelName} to UserSettings`);
                        } else {
                            console.log(`[downloadModelWithProgress] ${modelName} already exists in UserSettings, skipping save`);
                        }

                        sendProgress({
                            type: 'complete',
                            status: 'Download completed successfully',
                            percentage: 100,
                            success: true,
                            modelName: modelName
                        });
                    }
                }
            );

        } catch (downloadError) {
            console.error('Download error:', downloadError);
            sendProgress({
                type: 'error',
                error: downloadError.message || 'Unexpected error during download',
                suggestions: [
                    'Check Ollama service status',
                    'Verify sufficient disk space',
                    'Contact administrator if issue persists'
                ]
            });
        }

        res.end();

    } catch (error) {
        console.error("Error downloading model:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Failed to start download",
                error: error.message
            });
        }
    }
};

/**
 * Remove a downloaded model
 */
const removeDownloadedModel = async (req, res) => {
    try {
        const { modelName } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if model is downloaded
        const pulledModels = user.settings?.pulled_models || [];
        const modelIndex = pulledModels.findIndex(m => m.name === modelName);

        if (modelIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Model not found in downloaded models"
            });
        }

        // Remove from Ollama
        try {
            await removeModel(modelName);
        } catch (ollamaError) {
            return res.status(400).json({
                success: false,
                message: "Failed to remove model from Ollama",
                error: ollamaError.userMessage || ollamaError.message
            });
        }

        // Remove from user's pulled models
        await User.findByIdAndUpdate(userId, {
            $pull: {
                'settings.pulled_models': { name: modelName }
            }
        });

        res.json({
            success: true,
            message: "Model removed successfully"
        });

    } catch (error) {
        console.error("Error removing model:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove model",
            error: error.message
        });
    }
};

/**
 * Request purchase of a model for the organization
 */
const requestModelPurchase = async (req, res) => {
    try {
        const { modelId } = req.params;
        const { justification } = req.body;
        const userId = req.user.id;

        // ✅ FIX: Populate organization_id instead of organization
        const user = await User.findById(userId).populate('organization_id');

        if (!user || !user.organization_id) {
            return res.status(404).json({
                success: false,
                message: "User or organization not found"
            });
        }

        const model = await AvailableModel.findById(modelId);
        if (!model) {
            return res.status(404).json({
                success: false,
                message: "Model not found"
            });
        }

        // Check if already requested or purchased
        const organization = user.organization_id;
        const existingRequest = organization.settings?.model_requests?.find(req =>
            req.model_id.toString() === modelId && req.status === 'pending'
        );

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: "Purchase request already pending for this model"
            });
        }

        // Check if model is already in allowed_models (array of objects with model_id)
        const allowedModels = organization.settings?.allowed_models || [];
        const alreadyHasAccess = allowedModels.some(
            item => item.model_id.toString() === modelId
        );
        
        if (alreadyHasAccess) {
            return res.status(400).json({
                success: false,
                message: "Model is already available for your organization"
            });
        }

        // Create purchase request
        const purchaseRequest = {
            model_id: modelId,
            model_name: model.name,
            requested_by: userId,
            requested_at: new Date(),
            justification: justification || "Requested through model selector",
            status: 'pending',
            estimated_cost: model.pricing?.monthly || 29
        };

        await Organization.findByIdAndUpdate(organization._id, {
            $push: {
                'settings.model_requests': purchaseRequest
            }
        });

        // TODO: Send notification to organization admins
        // This could be implemented with email service or in-app notifications

        res.json({
            success: true,
            message: "Purchase request submitted successfully",
            request_id: purchaseRequest.model_id
        });

    } catch (error) {
        console.error("Error requesting model purchase:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit purchase request",
            error: error.message
        });
    }
};

/**
 * Update model usage statistics
 */
const updateModelUsage = async (req, res) => {
    try {
        const { modelName } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update usage count and last used timestamp
        const updateResult = await User.findOneAndUpdate(
            {
                _id: userId,
                'settings.pulled_models.name': modelName
            },
            {
                $inc: { 'settings.pulled_models.$.usage_count': 1 },
                $set: { 'settings.pulled_models.$.last_used': new Date() }
            },
            { new: true }
        );

        if (!updateResult) {
            return res.status(404).json({
                success: false,
                message: "Model not found in user's downloaded models"
            });
        }

        res.json({
            success: true,
            message: "Usage statistics updated"
        });

    } catch (error) {
        console.error("Error updating model usage:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update usage statistics",
            error: error.message
        });
    }
};

export {
    getCategorizedModelsForUser,
    downloadModelWithProgress,
    removeDownloadedModel,
    requestModelPurchase,
    updateModelUsage
};