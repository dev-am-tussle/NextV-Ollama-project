import mongoose from "mongoose";
import { Organization } from "../models/organization.model.js";
import { Admin, createAdminWithDefaults } from "../models/admin.model.js";
import { User } from "../models/user.models.js";
import { AvailableModel } from "../models/availableModel.model.js";
import bcrypt from "bcryptjs";

// GET /api/super-admin/organizations - Get all organizations
export async function getAllOrganizations(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const organizations = await Organization.find({ deleted_at: null })
      .populate('created_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get stats for each organization
    const orgsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const [adminCount, employeeCount, activeEmployees] = await Promise.all([
          Admin.countDocuments({ 
            organization_id: org._id, 
            admin_type: 'org_admin',
            deleted_at: null 
          }),
          User.countDocuments({ 
            organization_id: org._id,
            role: 'employee'
          }),
          User.countDocuments({ 
            organization_id: org._id,
            role: 'employee',
            status: 'active'
          })
        ]);

        return {
          ...org,
          stats: {
            admin_count: adminCount,
            employee_count: employeeCount,
            active_employees: activeEmployees,
            allowed_models_count: org.settings?.allowed_models?.length || 0
          }
        };
      })
    );

    const total = await Organization.countDocuments({ deleted_at: null });
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: orgsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Get all organizations error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organizations"
    });
  }
}

// GET /api/super-admin/organizations/:id - Get organization details
export async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id)
      .populate('created_by', 'name email')
      .lean();

    if (!organization || organization.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Get organization admins
    const admins = await Admin.find({ 
      organization_id: id,
      admin_type: 'org_admin',
      deleted_at: null
    })
    .select('-password_hash')
    .populate('settings_id')
    .sort({ created_at: -1 });

    // Get recent employees
    const employees = await User.find({ 
      organization_id: id,
      role: 'employee'
    })
    .select('-password_hash')
    .populate('settings_id')
    .sort({ created_at: -1 })
    .limit(10);

    // Get organization stats
    const [totalEmployees, activeEmployees, pendingEmployees] = await Promise.all([
      User.countDocuments({ organization_id: id, role: 'employee' }),
      User.countDocuments({ organization_id: id, role: 'employee', status: 'active' }),
      User.countDocuments({ organization_id: id, role: 'employee', status: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        organization,
        admins,
        employees,
        stats: {
          total_employees: totalEmployees,
          active_employees: activeEmployees,
          pending_employees: pendingEmployees,
          admin_count: admins.length,
          allowed_models_count: organization.settings?.allowed_models?.length || 0
        }
      }
    });

  } catch (error) {
    console.error("Get organization by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization details"
    });
  }
}

// POST /api/super-admin/organizations - Create new organization
export async function createOrganization(req, res) {
  try {
    const { name, slug, description, admin_email, admin_name, admin_password, settings, model_ids } = req.body;

    if (!name || !admin_email || !admin_name || !admin_password) {
      return res.status(400).json({
        success: false,
        error: "Organization name, admin email, name, and password are required"
      });
    }

    // Check if admin email already exists
    const existingAdmin = await Admin.findOne({ 
      email: admin_email.toLowerCase(),
      deleted_at: null 
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Admin email already exists"
      });
    }

    // Check if slug already exists (if provided)
    if (slug) {
      const existingOrg = await Organization.findOne({ 
        slug: slug.toLowerCase(),
        deleted_at: null 
      });

      if (existingOrg) {
        return res.status(400).json({
          success: false,
          error: `Organization slug "${slug}" already exists. Please choose a different slug.`
        });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Prepare allowed models if provided
      let allowedModels = [];
      if (Array.isArray(model_ids) && model_ids.length) {
        // Validate models exist
        const models = await AvailableModel.find({ _id: { $in: model_ids } }, null, { session });
        if (models.length !== model_ids.length) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ success: false, error: 'One or more provided model_ids are invalid' });
        }
        allowedModels = model_ids.map(id => ({ model_id: id, enabled: true, added_at: new Date() }));
      }

      // Create organization
      const orgData = {
        name: name.trim(),
        slug: slug?.trim().toLowerCase() || null,
        description: description?.trim() || null,
        settings: { ...(settings || {}), ...(allowedModels.length ? { allowed_models: allowedModels } : {}) },
        created_by: req.user.id
      };

      const [organization] = await Organization.create([orgData], { session });

      // Create organization admin
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const password_hash = await bcrypt.hash(admin_password, saltRounds);

      const adminData = {
        name: admin_name.trim(),
        email: admin_email.toLowerCase().trim(),
        role: 'admin',
        admin_type: 'org_admin',
        password_hash,
        organization_id: organization._id,
        email_verified: true,
        status: 'active',
        created_by: req.user.id
      };

      const { admin } = await createAdminWithDefaults(adminData);

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        data: {
          organization,
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            admin_type: admin.admin_type
          }
        },
        message: "Organization and admin created successfully"
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error("Create organization error:", error);
    
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      
      if (field === 'slug') {
        return res.status(400).json({
          success: false,
          error: `Organization slug "${value}" already exists. Please choose a different slug.`
        });
      } else if (field === 'name') {
        return res.status(400).json({
          success: false,
          error: `Organization name "${value}" already exists. Please choose a different name.`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `${field} "${value}" already exists. Please choose a different value.`
        });
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to create organization"
    });
  }
}

// PUT /api/super-admin/organizations/:id - Update organization
export async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates._id;
    delete updates.created_by;
    delete updates.created_at;

    const organization = await Organization.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!organization || organization.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    res.json({
      success: true,
      data: organization,
      message: "Organization updated successfully"
    });

  } catch (error) {
    console.error("Update organization error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update organization"
    });
  }
}

// DELETE /api/super-admin/organizations/:id - Delete organization
export async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Soft delete organization
      const organization = await Organization.findByIdAndUpdate(
        id,
        { deleted_at: new Date() },
        { session }
      );

      if (!organization) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          error: "Organization not found"
        });
      }

      // Soft delete all admins in this organization
      await Admin.updateMany(
        { organization_id: id },
        { deleted_at: new Date() },
        { session }
      );

      // Update all employees to remove organization association
      await User.updateMany(
        { organization_id: id, role: 'employee' },
        { 
          organization_id: null,
          status: 'inactive',
          updated_at: new Date()
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: "Organization deleted successfully"
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error("Delete organization error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete organization"
    });
  }
}

// POST /api/super-admin/organizations/:id/models - Assign models to organization
export async function assignModelsToOrganization(req, res) {
  try {
    const { id } = req.params;
    const { model_ids } = req.body;

    if (!Array.isArray(model_ids) || model_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Model IDs array is required"
      });
    }

    const organization = await Organization.findById(id);
    if (!organization || organization.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Verify all models exist
    const models = await AvailableModel.find({ _id: { $in: model_ids } });
    if (models.length !== model_ids.length) {
      return res.status(400).json({
        success: false,
        error: "Some models not found"
      });
    }

    // Update organization with new model assignments
    const newModels = model_ids.map(modelId => ({
      model_id: modelId,
      enabled: true,
      added_at: new Date()
    }));

    // Replace all existing models with new selection
    organization.settings = organization.settings || {};
    organization.settings.allowed_models = newModels;
    await organization.save();

    // Populate model details for response
    const populatedOrg = await Organization.findById(id)
      .populate('settings.allowed_models.model_id');

    res.json({
      success: true,
      data: populatedOrg.settings.allowed_models,
      message: "Models assigned successfully"
    });

  } catch (error) {
    console.error("Assign models to organization error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to assign models"
    });
  }
}

// GET /api/super-admin/organizations/:id/models - Get organization assigned models
export async function getOrganizationModels(req, res) {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id)
      .populate('settings.allowed_models.model_id');

    if (!organization || organization.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    res.json({
      success: true,
      data: organization.settings?.allowed_models || []
    });

  } catch (error) {
    console.error("Get organization models error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization models"
    });
  }
}

// GET /api/super-admin/available-models - Get all available models for assignment
export async function getAvailableModels(req, res) {
  try {
    console.log('🔍 Getting available models...');
    
    const models = await AvailableModel.find({ 
      is_active: true
    })
    .select('_id name display_name description size category tags parameters performance_tier min_ram_gb')
    .sort({ display_name: 1 });

    console.log(`✅ Found ${models.length} active models`);
    
    res.json({
      success: true,
      data: models
    });

  } catch (error) {
    console.error("Get available models error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch available models"
    });
  }
}

// GET /api/super-admin/organizations/:id/employees - Get organization employees
export async function getOrganizationEmployees(req, res) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const employees = await User.find({ 
      organization_id: id,
      role: 'employee'
    })
    .select('-password_hash')
    .populate('settings_id')
    .populate('employee_details.invited_by', 'name email')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

    const total = await User.countDocuments({ 
      organization_id: id,
      role: 'employee'
    });

    res.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get organization employees error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch employees"
    });
  }
}

// GET /api/super-admin/organizations/:id/admins - Get organization admins
export async function getOrganizationAdmins(req, res) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const admins = await Admin.find({ 
      organization_id: id,
      admin_type: 'org_admin',
      deleted_at: null
    })
    .select('-password_hash')
    .populate('settings_id')
    .populate('created_by', 'name email')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Admin.countDocuments({ 
      organization_id: id,
      admin_type: 'org_admin',
      deleted_at: null
    });

    res.json({
      success: true,
      data: admins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get organization admins error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch admins"
    });
  }
}

// POST /api/super-admin/organizations/:id/admins - Create new admin for organization
export async function createOrganizationAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required"
      });
    }

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization || organization.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Organization not found"
      });
    }

    // Check if admin email already exists
    const existingAdmin = await Admin.findOne({ 
      email: email.toLowerCase(),
      deleted_at: null 
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Admin email already exists"
      });
    }

    // Create organization admin
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const adminData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'admin',
      admin_type: 'org_admin',
      password_hash,
      organization_id: id,
      permissions: permissions || {},
      email_verified: true,
      status: 'active',
      created_by: req.user.id
    };

    const { admin } = await createAdminWithDefaults(adminData);

    res.status(201).json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        admin_type: admin.admin_type,
        permissions: admin.permissions,
        status: admin.status,
        created_at: admin.created_at
      },
      message: "Admin created successfully"
    });

  } catch (error) {
    console.error("Create organization admin error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create admin"
    });
  }
}

// PUT /api/super-admin/admins/:adminId - Update admin details
export async function updateAdmin(req, res) {
  try {
    const { adminId } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.password_hash;
    delete updates._id;
    delete updates.created_by;
    delete updates.created_at;
    delete updates.organization_id;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!admin || admin.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      data: admin,
      message: "Admin updated successfully"
    });

  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update admin"
    });
  }
}

// PUT /api/super-admin/admins/:adminId/password - Reset admin password
export async function resetAdminPassword(req, res) {
  try {
    const { adminId } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters long"
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin || admin.deleted_at) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(new_password, saltRounds);

    await Admin.findByIdAndUpdate(adminId, {
      password_hash,
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset admin password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset password"
    });
  }
}

// DELETE /api/super-admin/admins/:adminId - Delete admin
export async function deleteAdmin(req, res) {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });

  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete admin"
    });
  }
}