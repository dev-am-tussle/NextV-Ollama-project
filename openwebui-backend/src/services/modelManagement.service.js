import { UserSettings } from "../models/user.models.js";
import { AvailableModel } from "../models/availableModel.model.js";

// Add a model to user's pulled models list
export async function addPulledModel(userId, modelName) {
  try {
    // Find the model in AvailableModel collection
    const model = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });
    
    if (!model) {
      throw new Error(`Model ${modelName} not found in available models`);
    }

    // Find user settings
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      throw new Error('User settings not found');
    }

    // Check if model is already pulled
    const alreadyPulled = userSettings.pulled_models.some(
      pulledModel => pulledModel.model_id.toString() === model._id.toString()
    );

    if (alreadyPulled) {
      return {
        success: true,
        message: `Model ${modelName} is already pulled`,
        model: model
      };
    }

    // Add model to pulled models
    const newPulledModel = {
      model_id: model._id,
      pulled_at: new Date(),
      usage_count: 0,
      last_used: null
    };

    await UserSettings.updateOne(
      { user_id: userId },
      { $push: { pulled_models: newPulledModel } }
    );

    console.log(`✅ Added model ${modelName} to user ${userId} pulled models`);

    return {
      success: true,
      message: `Model ${modelName} added to pulled models`,
      model: model
    };
  } catch (error) {
    console.error("Failed to add pulled model:", error);
    throw error;
  }
}

// Remove a model from user's pulled models list
export async function removePulledModel(userId, modelName) {
  try {
    const model = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });
    
    if (!model) {
      throw new Error(`Model ${modelName} not found in available models`);
    }

    await UserSettings.updateOne(
      { user_id: userId },
      { $pull: { pulled_models: { model_id: model._id } } }
    );

    console.log(`✅ Removed model ${modelName} from user ${userId} pulled models`);

    return {
      success: true,
      message: `Model ${modelName} removed from pulled models`
    };
  } catch (error) {
    console.error("Failed to remove pulled model:", error);
    throw error;
  }
}

// Get user's pulled models with full model details
export async function getUserPulledModels(userId) {
  try {
    const settings = await UserSettings.findOne({ user_id: userId })
      .populate({
        path: 'pulled_models.model_id',
        model: 'AvailableModel',
        select: 'name display_name description size category tags performance_tier provider model_family parameters use_cases min_ram_gb is_active'
      })
      .lean();

    if (!settings) {
      return {
        success: false,
        error: 'User settings not found'
      };
    }

    // Filter out inactive models and format response
    const activePulledModels = settings.pulled_models
      .filter(pulledModel => pulledModel.model_id && pulledModel.model_id.is_active)
      .map(pulledModel => ({
        ...pulledModel.model_id,
        pulled_at: pulledModel.pulled_at,
        usage_count: pulledModel.usage_count,
        last_used: pulledModel.last_used,
        is_pulled: true
      }));

    return {
      success: true,
      data: activePulledModels,
      count: activePulledModels.length
    };
  } catch (error) {
    console.error("Failed to get user pulled models:", error);
    throw error;
  }
}

// Update model usage statistics
export async function updateModelUsage(userId, modelName) {
  try {
    const model = await AvailableModel.findOne({ 
      name: modelName, 
      is_active: true 
    });
    
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    await UserSettings.updateOne(
      { 
        user_id: userId,
        'pulled_models.model_id': model._id
      },
      { 
        $inc: { 'pulled_models.$.usage_count': 1 },
        $set: { 'pulled_models.$.last_used': new Date() }
      }
    );

    console.log(`✅ Updated usage stats for model ${modelName} for user ${userId}`);

    return {
      success: true,
      message: `Updated usage stats for ${modelName}`
    };
  } catch (error) {
    console.error("Failed to update model usage:", error);
    throw error;
  }
}