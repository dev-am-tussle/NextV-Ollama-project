import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    checkOllama,
    startOllama,
    getOrganizationModels,
    pullModel,
    getConfigStatus,
    updateConfigStep,
    verifyCompletion
} from '../controllers/onboarding.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/onboarding/check-ollama - Check Ollama installation status
router.get('/check-ollama', checkOllama);

// POST /api/onboarding/start-ollama - Start Ollama service
router.post('/start-ollama', startOllama);

// GET /api/onboarding/organization-models - Get available models for user's organization
router.get('/organization-models', getOrganizationModels);

// POST /api/onboarding/pull-model - Download/pull a model (Server-Sent Events)
router.post('/pull-model', pullModel);

// GET /api/onboarding/config-status - Get user's configuration status
router.get('/config-status', getConfigStatus);

// PUT /api/onboarding/config-step - Update configuration step
router.put('/config-step', updateConfigStep);

// GET /api/onboarding/verify - Verify onboarding completion
router.get('/verify', verifyCompletion);

export default router;