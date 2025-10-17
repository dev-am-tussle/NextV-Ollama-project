import { UserSettings } from "../models/user.models.js";
import { encryptApiKey, decryptApiKey } from "../utils/encryption.js"; // You'll need to implement this

// Get all external APIs for a user
export async function getUserExternalApis(req, res) {
  try {
    const userId = req.user.id;
    
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Map APIs to mask the key
    const maskedApis = userSettings.external_apis.map(api => ({
      ...api.toObject(),
      api_key: `${api.api_key.substring(0, 4)}...${api.api_key.slice(-4)}` // Mask key for response
    }));

    res.json({
      success: true,
      data: maskedApis
    });
  } catch (error) {
    console.error("Error fetching external APIs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch external APIs"
    });
  }
}

// Add a new external API
export async function addExternalApi(req, res) {
  try {
    const userId = req.user.id;

    // Validate required fields
    const { name, provider, api_key } = req.body;

    // Validate required fields (provider is optional — default applied below)
    if (!name || !api_key) {
      return res.status(400).json({
        success: false,
        error: "Name and API key are required"
      });
    }

    // If frontend doesn't provide a provider, fall back to a sensible default
    const finalProvider = provider || "";

    // Find user settings
    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    // Check for duplicate names
    const isDuplicate = userSettings.external_apis.some(api => api.name === name);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: "An API with this name already exists"
      });
    }

    // Add the new API
    let encryptedKey;
    try {
      encryptedKey = encryptApiKey(api_key);
    } catch (encErr) {
      console.error('Encryption error while adding external API:', encErr);
      return res.status(500).json({ success: false, error: 'Failed to encrypt API key' });
    }
    userSettings.external_apis.push({
      name,
      provider: finalProvider,
      api_key: encryptedKey,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    await userSettings.save();

    res.status(201).json({
      success: true,
      message: "API key added successfully",
      data: {
        name,
        provider: finalProvider,
        api_key: `${api_key.substring(0, 4)}...${api_key.slice(-4)}`, // Mask key for response
        is_active: false
      }
    });
  } catch (error) {
    console.error("Error adding external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add external API"
    });
  }
}

// Update an external API
export async function updateExternalApi(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;
    const updates = req.body;

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    const apiIndex = userSettings.external_apis.findIndex(api => api._id.toString() === apiId);
    if (apiIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "API not found"
      });
    }

    // Update fields
    const api = userSettings.external_apis[apiIndex];
    if (updates.name) api.name = updates.name;
    if (updates.provider) api.provider = updates.provider;
    if (updates.api_key) {
      try {
        api.api_key = encryptApiKey(updates.api_key);
      } catch (encErr) {
        console.error('Encryption error while updating external API:', encErr);
        return res.status(500).json({ success: false, error: 'Failed to encrypt API key' });
      }
    }
    if (typeof updates.is_active !== 'undefined') {
      api.is_active = updates.is_active;
    }
    api.updated_at = new Date();

    await userSettings.save();

    res.json({
      success: true,
      message: "API updated successfully",
      data: {
        ...api.toObject(),
        api_key: `${api.api_key.substring(0, 4)}...${api.api_key.slice(-4)}` // Mask key for response
      }
    });
  } catch (error) {
    console.error("Error updating external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update external API"
    });
  }
}

// Delete an external API
export async function deleteExternalApi(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    const apiIndex = userSettings.external_apis.findIndex(api => api._id.toString() === apiId);
    if (apiIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "API not found"
      });
    }

    // Remove the API
    userSettings.external_apis.splice(apiIndex, 1);
    await userSettings.save();

    res.json({
      success: true,
      message: "API deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting external API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete external API"
    });
  }
}

// Toggle API activation status
export async function toggleApiStatus(req, res) {
  try {
    const userId = req.user.id;
    const { apiId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "is_active must be a boolean value"
      });
    }

    const userSettings = await UserSettings.findOne({ user_id: userId });
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: "User settings not found"
      });
    }

    const api = userSettings.external_apis.id(apiId);
    if (!api) {
      return res.status(404).json({
        success: false,
        error: "API not found"
      });
    }

    // Update status
    api.is_active = is_active;
    api.updated_at = new Date();
    await userSettings.save();

    res.json({
      success: true,
      message: `API ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        is_active: api.is_active
      }
    });
  } catch (error) {
    console.error("Error toggling API status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle API status"
    });
  }
}