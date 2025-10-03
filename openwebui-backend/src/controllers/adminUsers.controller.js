import mongoose from "mongoose";
import { User, UserSettings } from "../models/user.models.js";
import { Conversation } from "../models/conversation.model.js";
import { SavedPrompt } from "../models/savedPrompt.model.js";
import { FileMeta } from "../models/file.model.js";

// GET /api/admin/users - Get all users with their details
export async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch users with their settings
    const users = await User.find({})
      .select('-password_hash') // Exclude password hash for security
      .populate('settings_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [conversationsCount, savedPromptsCount, savedFilesCount] = await Promise.all([
          Conversation.countDocuments({ user_id: user._id }),
          SavedPrompt.countDocuments({ user_id: user._id }),
          FileMeta.countDocuments({ user_id: user._id })
        ]);

        // Count pulled models (from settings.avail_models)
        const pulledModelsCount = user.settings_id?.avail_models?.length || 0;

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          email_verified: user.email_verified,
          auth_providers: user.auth_providers?.map(provider => ({
            provider: provider.provider,
            linked_at: provider.linked_at
          })) || [],
          created_at: user.created_at,
          updated_at: user.updated_at,
          settings: user.settings_id ? {
            theme: user.settings_id.theme,
            default_model: user.settings_id.default_model,
            avail_models: user.settings_id.avail_models,
            pulled_models_count: pulledModelsCount
          } : null,
          stats: {
            conversations_count: conversationsCount,
            saved_prompts_count: savedPromptsCount,
            saved_files_count: savedFilesCount,
            pulled_models_count: pulledModelsCount
          }
        };
      })
    );

    // Get total count for pagination
    const total = await User.countDocuments({});
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users"
    });
  }
}

// GET /api/admin/users/:id - Get specific user details
export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password_hash')
      .populate('settings_id')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Get detailed stats
    const [conversations, savedPrompts, savedFiles] = await Promise.all([
      Conversation.find({ user_id: user._id }).select('title created_at updated_at').sort({ updated_at: -1 }).limit(10),
      SavedPrompt.find({ user_id: user._id }).select('title created_at').sort({ created_at: -1 }).limit(10),
      FileMeta.find({ user_id: user._id }).select('original_name file_size created_at').sort({ created_at: -1 }).limit(10)
    ]);

    const [conversationsCount, savedPromptsCount, savedFilesCount] = await Promise.all([
      Conversation.countDocuments({ user_id: user._id }),
      SavedPrompt.countDocuments({ user_id: user._id }),
      FileMeta.countDocuments({ user_id: user._id })
    ]);

    const userDetails = {
      id: user._id,
      name: user.name,
      email: user.email,
      email_verified: user.email_verified,
      auth_providers: user.auth_providers || [],
      created_at: user.created_at,
      updated_at: user.updated_at,
      settings: user.settings_id,
      stats: {
        conversations_count: conversationsCount,
        saved_prompts_count: savedPromptsCount,
        saved_files_count: savedFilesCount,
        pulled_models_count: user.settings_id?.avail_models?.length || 0
      },
      recent_activity: {
        conversations: conversations,
        saved_prompts: savedPrompts,
        saved_files: savedFiles
      }
    };

    res.json({
      success: true,
      data: userDetails
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user details"
    });
  }
}

// PUT /api/admin/users/:id - Update user (admin can update user settings)
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password_hash;
    delete updates._id;
    delete updates.auth_providers;

    const user = await User.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      data: user,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user"
    });
  }
}

// DELETE /api/admin/users/:id - Delete user (with cascade delete of related data)
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Start transaction for cascade delete
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete related data
      await Promise.all([
        Conversation.deleteMany({ user_id: id }, { session }),
        SavedPrompt.deleteMany({ user_id: id }, { session }),
        FileMeta.deleteMany({ user_id: id }, { session }),
        UserSettings.deleteOne({ user_id: id }, { session })
      ]);

      // Delete the user
      await User.deleteOne({ _id: id }, { session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: "User and all related data deleted successfully"
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user"
    });
  }
}

// GET /api/admin/users/stats - Get overall user statistics
export async function getUsersStats(req, res) {
  try {
    const [
      totalUsers,
      verifiedUsers,
      usersWithOAuth,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ email_verified: true }),
      User.countDocuments({ "auth_providers.0": { $exists: true } }),
      User.countDocuments({ 
        created_at: { 
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        } 
      })
    ]);

    // Get total conversations, prompts, files across all users
    const [totalConversations, totalPrompts, totalFiles] = await Promise.all([
      Conversation.countDocuments({}),
      SavedPrompt.countDocuments({}),
      FileMeta.countDocuments({})
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          with_oauth: usersWithOAuth,
          recent_30_days: recentUsers
        },
        content: {
          total_conversations: totalConversations,
          total_prompts: totalPrompts,
          total_files: totalFiles
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user statistics"
    });
  }
}