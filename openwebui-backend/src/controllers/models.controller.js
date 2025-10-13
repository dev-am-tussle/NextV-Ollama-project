import { AvailableModel } from "../models/availableModel.model.js";
import { pullModel, verifyModelInstalled, removeModel } from "../services/ollama.service.js";
import { 
  getUserCategorizedModels, 
  getAdminCategorizedModels,
  markModelAsDownloaded,
  updateModelUsage 
} from "../services/modelManagement.service.js";

// GET /api/v1/models - Users see active models
export async function getActiveModels(req, res) {
  try {
    const models = await AvailableModel.find({ is_active: true })
      .select('-created_at -updated_at')
      .sort({ model_family: 1, parameters: 1 });

    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    console.error("Error fetching active models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch available models"
    });
  }
}

// POST /api/v1/models/pull - Pull a model with real-time progress
export async function pullModelWithProgress(req, res) {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: "Model name is required"
      });
    }

    // Verify model exists in our catalog
    const modelDoc = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });

    if (!modelDoc) {
      return res.status(404).json({
        success: false,
        error: "Model not found in catalog"
      });
    }

    // Set up SSE headers for real-time progress streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write('data: {"type":"heartbeat"}\n\n');
    }, 30000);

    // Progress callback
    const onProgress = (progressInfo) => {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        ...progressInfo
      })}\n\n`);
    };

    // Error callback
    const onError = (error) => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.userMessage || error.message,
        code: error.code || 'UNKNOWN_ERROR',
        suggestions: error.suggestions || []
      })}\n\n`);
      clearInterval(keepAlive);
      res.end();
    };

    // Completion callback
    const onComplete = async (result) => {
      try {
        // Verify the model was actually installed
        const isInstalled = await verifyModelInstalled(modelName);
        
        if (isInstalled) {
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            modelName: modelName,
            message: `Successfully downloaded ${modelName}`
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: `Model ${modelName} download completed but verification failed`,
            code: 'VERIFICATION_FAILED',
            suggestions: ['Try downloading again', 'Check disk space', 'Contact support']
          })}\n\n`);
        }
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Failed to verify model installation',
          code: 'VERIFICATION_ERROR',
          suggestions: ['Try downloading again', 'Contact support']
        })}\n\n`);
      }
      
      clearInterval(keepAlive);
      res.end();
    };

    // Start the actual model pull
    await pullModel(modelName, onProgress, onError, onComplete);

  } catch (error) {
    console.error("Error in pullModelWithProgress:", error);
    
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.userMessage || error.message || 'Unknown error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        suggestions: error.suggestions || ['Try again later', 'Contact support']
      })}\n\n`);
      res.end();
    } catch (writeError) {
      console.error("Failed to write error response:", writeError);
    }
  }
}

// DELETE /api/v1/models/remove - Remove a pulled model
export async function removeModelFromSystem(req, res) {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: "Model name is required"
      });
    }

    // Remove from Ollama
    await removeModel(modelName);

    res.json({
      success: true,
      message: `Successfully removed ${modelName}`,
      modelName
    });

  } catch (error) {
    console.error("Error removing model:", error);
    
    res.status(500).json({
      success: false,
      error: error.userMessage || error.message || "Failed to remove model",
      code: error.code || 'REMOVE_ERROR',
      suggestions: error.suggestions || ['Try again later', 'Contact support']
    });
  }
}

// GET /api/v1/models/categorized - Get categorized models for user dropdown
export async function getUserCategorizedModelsController(req, res) {
  try {
    const userId = req.user.id; // From auth middleware
    
    const categorizedModels = await getUserCategorizedModels(userId);
    
    res.json({
      success: true,
      data: categorizedModels
    });
  } catch (error) {
    console.error("Error fetching user categorized models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categorized models"
    });
  }
}

// GET /api/v1/models/admin-categorized - Get categorized models for admin dropdown
export async function getAdminCategorizedModelsController(req, res) {
  try {
    const adminId = req.admin?.id || req.user?.id; // Support both admin and user tokens
    
    const categorizedModels = await getAdminCategorizedModels(adminId);
    
    res.json({
      success: true,
      data: categorizedModels
    });
  } catch (error) {
    console.error("Error fetching admin categorized models:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch admin categorized models"
    });
  }
}

// POST /api/v1/models/mark-downloaded - Mark a model as downloaded by user
export async function markModelAsDownloadedController(req, res) {
  try {
    const userId = req.user.id;
    const { modelId, downloadInfo } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "Model ID is required"
      });
    }
    
    const result = await markModelAsDownloaded(userId, modelId, downloadInfo);
    
    res.json({
      success: true,
      message: "Model marked as downloaded successfully",
      data: result
    });
  } catch (error) {
    console.error("Error marking model as downloaded:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark model as downloaded"
    });
  }
}

// POST /api/v1/models/update-usage - Update model usage stats
export async function updateModelUsageController(req, res) {
  try {
    const userId = req.user.id;
    const { modelId } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "Model ID is required"
      });
    }
    
    await updateModelUsage(userId, modelId);
    
    res.json({
      success: true,
      message: "Model usage updated successfully"
    });
  } catch (error) {
    console.error("Error updating model usage:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update model usage"
    });
  }
}