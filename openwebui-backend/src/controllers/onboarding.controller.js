import onboardingService from '../services/onboarding.service.js';
import { User } from '../models/user.models.js';

// Check Ollama installation status
const checkOllama = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: use .id instead of .user_id
        const ollamaStatus = await onboardingService.checkOllamaInstallation();

        // Update user config if Ollama is installed and running
        if (ollamaStatus.installed && ollamaStatus.running) {
            await onboardingService.updateConfigStep(userId, 'ollama_installed', true);
        }

        res.status(200).json({
            success: true,
            data: ollamaStatus
        });
    } catch (error) {
        console.error('Error checking Ollama:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check Ollama installation',
            error: error.message
        });
    }
};

// Start Ollama service
const startOllama = async (req, res) => {
    try {
        const result = await onboardingService.startOllamaService();

        if (result.success) {
            // Wait a moment for service to start, then check status
            setTimeout(async () => {
                const status = await onboardingService.checkOllamaInstallation();
                if (status.running) {
                    await onboardingService.updateConfigStep(req.user.id, 'ollama_installed', true); // Fixed: use .id
                }
            }, 3000);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error starting Ollama:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start Ollama service',
            error: error.message
        });
    }
};

// Get organization models
const getOrganizationModels = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: use .id instead of .user_id
        const models = await onboardingService.getOrganizationModels(userId);

        res.status(200).json({
            success: true,
            data: models
        });
    } catch (error) {
        console.error('Error getting organization models:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get organization models',
            error: error.message
        });
    }
};

// Pull/download a model
const pullModel = async (req, res) => {
    try {
        const { modelName } = req.body;
        const userId = req.user.id; // Fixed: use .id instead of .user_id

        if (!modelName) {
            return res.status(400).json({
                success: false,
                message: 'Model name is required'
            });
        }

        // Set up Server-Sent Events for real-time progress
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
            sendProgress({ status: 'starting', message: `Starting download of ${modelName}` });

            const result = await onboardingService.pullModel(modelName, sendProgress);

            // Update user config step
            await onboardingService.updateConfigStep(userId, 'models_selected', true);
            await onboardingService.updateConfigStep(userId, 'models_downloaded', true);

            sendProgress({ status: 'completed', message: `${modelName} downloaded successfully` });
            res.write(`data: ${JSON.stringify({ status: 'done', result })}\n\n`);
            res.end();

        } catch (error) {
            sendProgress({ status: 'error', message: error.message });
            res.end();
        }

    } catch (error) {
        console.error('Error pulling model:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pull model',
            error: error.message
        });
    }
};

// Get user configuration status
const getConfigStatus = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: use .id instead of .user_id
        
        // Debug logging
        console.log('🔍 getConfigStatus Debug:', {
            userId,
            userObject: req.user,
            userType: typeof userId
        });
        
        const configStatus = await onboardingService.getUserConfigStatus(userId);

        res.status(200).json({
            success: true,
            data: configStatus
        });
    } catch (error) {
        console.error('Error getting config status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get configuration status',
            error: error.message
        });
    }
};

// Update configuration step manually
const updateConfigStep = async (req, res) => {
    try {
        const { step, completed } = req.body;
        const userId = req.user.id; // Fixed: use .id instead of .user_id

        if (!step) {
            return res.status(400).json({
                success: false,
                message: 'Step name is required'
            });
        }

        const validSteps = ['ollama_installed', 'models_selected', 'models_downloaded'];
        if (!validSteps.includes(step)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid step name'
            });
        }

        const configStatus = await onboardingService.updateConfigStep(userId, step, completed);

        res.status(200).json({
            success: true,
            data: configStatus
        });
    } catch (error) {
        console.error('Error updating config step:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update configuration step',
            error: error.message
        });
    }
};

// Verify onboarding completion
const verifyCompletion = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: use .id instead of .user_id
        const verification = await onboardingService.verifyOnboardingCompletion(userId);

        res.status(200).json({
            success: true,
            data: verification
        });
    } catch (error) {
        console.error('Error verifying completion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify onboarding completion',
            error: error.message
        });
    }
};

export {
    checkOllama,
    startOllama,
    getOrganizationModels,
    pullModel,
    getConfigStatus,
    updateConfigStep,
    verifyCompletion
};