import mongoose from "mongoose";
import { User, UserSettings } from "../models/user.models.js";
import { Conversation } from "../models/conversation.model.js";
import { SavedPrompt } from "../models/savedPrompt.model.js";
import { FileMeta } from "../models/file.model.js";

// GET /api/admin/users - Get all users for the admin's organization
export async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Build query filter - ONLY for admin's organization
    const query = {
      organization_id: req.user.organization_id
    };
    
    console.log(`🔒 Admin fetching users for organization: ${req.user.organization_id}`);

    // Fetch users with their settings
    const users = await User.find(query)
      .select('-password_hash') // Exclude password hash for security
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

    // Get total count for pagination (with same filter)
    const total = await User.countDocuments(query);
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

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Find user only if they belong to admin's organization
    const user = await User.findOne({
      _id: id,
      organization_id: req.user.organization_id
    })
      .select('-password_hash')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found in your organization"
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

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password_hash;
    delete updates._id;
    delete updates.auth_providers;
    delete updates.organization_id; // Admin cannot change user's organization

    // Update only if user belongs to admin's organization
    const user = await User.findOneAndUpdate(
      { 
        _id: id,
        organization_id: req.user.organization_id 
      },
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found in your organization"
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

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Check if user exists AND belongs to admin's organization
    const user = await User.findOne({ 
      _id: id,
      organization_id: req.user.organization_id 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found in your organization"
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

// GET /api/admin/users/stats - Get user statistics for admin's organization
export async function getUsersStats(req, res) {
  try {
    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Build query filter - ONLY for admin's organization
    const baseQuery = {
      organization_id: req.user.organization_id
    };
    
    console.log(`🔒 Admin fetching stats for organization: ${req.user.organization_id}`);

    const [
      totalUsers,
      verifiedUsers,
      usersWithOAuth,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(baseQuery),
      User.countDocuments({ ...baseQuery, email_verified: true }),
      User.countDocuments({ ...baseQuery, "auth_providers.0": { $exists: true } }),
      User.countDocuments({ 
        ...baseQuery,
        created_at: { 
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        } 
      })
    ]);

    // Get total conversations, prompts, files for organization's users only
    const orgUserIds = await User.find(baseQuery).distinct('_id');
    
    const [totalConversations, totalPrompts, totalFiles] = await Promise.all([
      Conversation.countDocuments({ user_id: { $in: orgUserIds } }),
      SavedPrompt.countDocuments({ user_id: { $in: orgUserIds } }),
      FileMeta.countDocuments({ user_id: { $in: orgUserIds } })
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

// POST /api/admin/users - Create a new user in admin's organization
export async function createUser(req, res) {
  try {
    const { name, email, role, employee_details } = req.body;

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists"
      });
    }

    // Create user data - Force admin's organization_id
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'employee',
      status: 'active',
      email_verified: false,
      organization_id: req.user.organization_id, // Always use admin's org
      employee_details: employee_details || {}
    };
    
    console.log(`🔒 Admin creating user for organization: ${req.user.organization_id}`);

    // Create user with default settings
    const { createUserWithDefaults } = await import('../models/user.models.js');
    const { user, settings } = await createUserWithDefaults(userData);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        organization_id: user.organization_id,
        employee_details: user.employee_details,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create user"
    });
  }
}

// POST /api/admin/users/bulk - Create multiple users in admin's organization
export async function createBulkUsers(req, res) {
  try {
    const { users } = req.body;

    // Organization Admin: Must have organization_id in token
    if (!req.user || !req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Organization admin token required."
      });
    }

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Users array is required and must not be empty"
      });
    }
    
    console.log(`🔒 Admin bulk creating users for organization: ${req.user.organization_id}`);

    const results = {
      success: [],
      errors: []
    };

    // Import createUserWithDefaults
    const { createUserWithDefaults } = await import('../models/user.models.js');

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      
      try {
        // Validate required fields
        if (!userData.name || !userData.email) {
          results.errors.push({
            index: i,
            data: userData,
            error: "Name and email are required"
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
          email: userData.email.toLowerCase() 
        });
        
        if (existingUser) {
          results.errors.push({
            index: i,
            data: userData,
            error: "User with this email already exists"
          });
          continue;
        }

        // Create user data - Force admin's organization_id
        const newUserData = {
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          role: userData.role || 'employee',
          status: 'active',
          email_verified: false,
          organization_id: req.user.organization_id, // Always use admin's org
          employee_details: {
            department: userData.department || '',
            job_title: userData.job_title || '',
            employee_id: userData.employee_id || ''
          }
        };

        // Create user with default settings
        const { user } = await createUserWithDefaults(newUserData);
        
        results.success.push({
          index: i,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organization_id: user.organization_id,
            employee_details: user.employee_details
          }
        });
      } catch (error) {
        console.error(`Error creating user at index ${i}:`, error);
        results.errors.push({
          index: i,
          data: userData,
          error: error.message || "Failed to create user"
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.success.length} users successfully`,
      data: {
        created: results.success.length,
        failed: results.errors.length,
        results: results
      }
    });
  } catch (error) {
    console.error("Error in bulk user creation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create users"
    });
  }
}