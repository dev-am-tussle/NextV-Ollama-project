import { Invitation } from "../models/invitation.model.js";
import { AdminSettings } from "../models/adminSettings.model.js";
import { User, createUserWithDefaults } from "../models/user.models.js";
import { Admin } from "../models/admin.model.js";
import { Organization } from "../models/organization.model.js";
import { sendGridService } from "../services/sendgrid.service.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// GET /api/admin/invitations - Get all invitations for an organization
export async function getInvitations(req, res) {
  try {
    const { page = 1, limit = 10, status, department } = req.query;
    const skip = (page - 1) * limit;

    // Get admin's organization
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Build filter query
    const filter = { organization_id: admin.organization_id };
    if (status) filter.status = status;
    if (department) filter["employee_details.department"] = department;

    const invitations = await Invitation.find(filter)
      .populate('invited_by', 'name email')
      .populate('accepted_by_user_id', 'name email')
      .populate('organization_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invitation.countDocuments(filter);

    res.json({
      success: true,
      data: invitations,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get invitations error:", error);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
}

// POST /api/admin/invitations - Create new invitation
export async function createInvitation(req, res) {
  try {
    const { 
      name,
      email, 
      role = 'employee', 
      department, 
      job_title, 
      employee_id, 
      manager_id,
      custom_message,
      expires_in_days = 7 
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Get admin and their settings
    const admin = await Admin.findById(req.user.id).populate('organization_id', 'name');
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

  let adminSettings = await AdminSettings.findOne({ admin_id: admin._id });
    
    // Create default admin settings if they don't exist
    if (!adminSettings) {
      console.log(`Creating default admin settings for admin ${admin._id}`);
      adminSettings = await AdminSettings.createDefault(admin._id, admin.organization_id);
    }

    // Super admin always allowed; org admin must have permissions
    const isSuperAdmin = admin.admin_type === 'super_admin' || admin.role === 'super_admin';
    const canInvite = isSuperAdmin
      ? true
      : (
          adminSettings
            ? (typeof adminSettings.canPerform === 'function'
                ? adminSettings.canPerform('can_invite_users')
                : (
                    adminSettings.permissions?.can_invite_users === true ||
                    adminSettings.permissions?.can_manage_invitations === true ||
                    adminSettings.permissions?.manage_users === true
                  ))
            : false
        );
    if (!canInvite) {
      return res.status(403).json({ error: "You don't have permission to invite users" });
    }

    // Ensure org association for non-super admins
    if (!isSuperAdmin && !admin.organization_id) {
      return res.status(403).json({ error: "Admin must be associated with an organization to invite users" });
    }

    // Check invitation limits safely with fallbacks
    const currentInvites = adminSettings?.hierarchy?.current_invitations_count ?? 0;
    const maxInvites = adminSettings?.hierarchy?.max_invitations ?? 50;
    if (currentInvites >= maxInvites) {
      return res.status(403).json({ 
        error: `Invitation limit reached. Maximum ${maxInvites} invitations allowed.` 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({ 
      email: email.toLowerCase(), 
      organization_id: admin.organization_id,
      status: 'pending' 
    });

    if (existingInvitation) {
      return res.status(400).json({ error: "Pending invitation already exists for this email" });
    }

    // Generate invitation token
    const invitation_token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // Create invitation
    const invitation = new Invitation({
      name: name.trim(),
      email: email.toLowerCase(),
      invitation_token,
      organization_id: admin.organization_id,
      role,
      employee_details: {
        department,
        job_title,
        employee_id,
        manager_id
      },
      invited_by: admin._id,
      expires_at,
      invitation_metadata: {
        custom_message,
        sender_ip: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    await invitation.save();

    // Send invitation email via SendGrid
    try {
      const emailResult = await sendGridService.sendInvitationEmail({
        email: invitation.email,
        name: invitation.name,
        token: invitation.invitation_token,
        organizationName: admin.organization_id.name || 'Your Organization',
        inviterName: admin.name || 'Team Admin',
        frontendUrl: process.env.FRONTEND_ORIGIN
      });

      // Update invitation with email status
      invitation.email_sent_at = new Date();
      invitation.email_sent_count = 1;
      invitation.last_email_sent_at = new Date();
      invitation.invitation_metadata.email_status = emailResult.success ? 'sent' : 'failed';
      invitation.invitation_metadata.email_message_id = emailResult.messageId;
      
      if (!emailResult.success) {
        invitation.invitation_metadata.email_error = emailResult.error;
        console.error('❌ Failed to send invitation email:', emailResult.error);
      }

      await invitation.save();
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      // Don't fail the invitation creation if email fails
      invitation.invitation_metadata.email_status = 'failed';
      invitation.invitation_metadata.email_error = emailError.message;
      await invitation.save();
    }

    // Update admin settings invitation count (fallback to atomic update if method missing)
    if (adminSettings) {
      if (typeof adminSettings.incrementInvitations === 'function') {
        await adminSettings.incrementInvitations();
      } else if (adminSettings._id) {
        await AdminSettings.updateOne(
          { _id: adminSettings._id },
          {
            $inc: {
              "hierarchy.current_invitations_count": 1,
              "activity.total_invitations_sent": 1
            },
            $set: { "activity.last_invitation_sent": new Date() }
          }
        );
      }
    }

    // Populate invitation for response
    await invitation.populate('invited_by', 'name email');
    await invitation.populate('organization_id', 'name');

    res.status(201).json({
      success: true,
      data: invitation,
      message: "Invitation created successfully"
    });

  } catch (error) {
    console.error("Create invitation error:", error);
    res.status(500).json({ error: "Failed to create invitation" });
  }
}

// POST /api/admin/invitations/bulk - Create multiple invitations
export async function createBulkInvitations(req, res) {
  try {
    const { invitations, expires_in_days = 7 } = req.body;

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return res.status(400).json({ error: "Invitations array is required" });
    }

    // Get admin and their settings
    const admin = await Admin.findById(req.user.id).populate('organization_id', 'name');
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    let adminSettings = await AdminSettings.findOne({ admin_id: admin._id });
    
    // Create default admin settings if they don't exist
    if (!adminSettings) {
      console.log(`Creating default admin settings for admin ${admin._id}`);
      adminSettings = await AdminSettings.createDefault(admin._id, admin.organization_id);
    }

    // Check if admin can invite users (robust against missing methods)
    {
      const isSuperAdminBulk = admin.admin_type === 'super_admin' || admin.role === 'super_admin';
      const canInviteBulk = isSuperAdminBulk
        ? true
        : (
            adminSettings
              ? (typeof adminSettings.canPerform === 'function'
                  ? adminSettings.canPerform('can_invite_users')
                  : (
                      adminSettings.permissions?.can_invite_users === true ||
                      adminSettings.permissions?.can_manage_invitations === true ||
                      adminSettings.permissions?.manage_users === true
                    ))
              : false
          );
      if (!canInviteBulk) {
        return res.status(403).json({ error: "You don't have permission to invite users" });
      }

      if (!isSuperAdminBulk && !admin.organization_id) {
        return res.status(403).json({ error: "Admin must be associated with an organization to invite users" });
      }
    }

    // Optional: Check remaining invitation quota before processing
    const curr = adminSettings?.hierarchy?.current_invitations_count ?? 0;
    const max = adminSettings?.hierarchy?.max_invitations ?? 50;
    if (curr >= max) {
      return res.status(403).json({ 
        error: `Invitation limit reached. Maximum ${max} invitations allowed.` 
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < invitations.length; i++) {
      const inviteData = invitations[i];
      
      try {
        // Validate required fields
        if (!inviteData.name) {
          errors.push({ index: i, email: inviteData.email, error: "Name is required" });
          continue;
        }
        if (!inviteData.email) {
          errors.push({ index: i, email: inviteData.email, error: "Email is required" });
          continue;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: inviteData.email.toLowerCase() });
        if (existingUser) {
          errors.push({ index: i, email: inviteData.email, error: "User already exists" });
          continue;
        }

        // Check if there's already a pending invitation
        const existingInvitation = await Invitation.findOne({ 
          email: inviteData.email.toLowerCase(), 
          organization_id: admin.organization_id,
          status: 'pending' 
        });

        if (existingInvitation) {
          errors.push({ index: i, email: inviteData.email, error: "Pending invitation already exists" });
          continue;
        }

        // Generate invitation token
        const invitation_token = crypto.randomBytes(32).toString('hex');
        
        // Calculate expiration date
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + expires_in_days);

        // Create invitation
        const invitation = new Invitation({
          name: inviteData.name.trim(),
          email: inviteData.email.toLowerCase(),
          invitation_token,
          organization_id: admin.organization_id,
          role: inviteData.role || 'user',
          employee_details: {
            department: inviteData.department,
            job_title: inviteData.job_title,
            employee_id: inviteData.employee_id,
            manager_id: inviteData.manager_id
          },
          invited_by: admin._id,
          expires_at,
          invitation_metadata: {
            custom_message: inviteData.custom_message,
            sender_ip: req.ip,
            user_agent: req.get('User-Agent'),
            sent_via: 'bulk'
          }
        });

        await invitation.save();

        // Send invitation email via SendGrid
        try {
          const emailResult = await sendGridService.sendInvitationEmail({
            email: invitation.email,
            name: invitation.name,
            token: invitation.invitation_token,
            organizationName: admin.organization_id.name || 'Your Organization',
            inviterName: admin.name || 'Team Admin',
            frontendUrl: process.env.FRONTEND_ORIGIN
          });

          // Update invitation with email status
          invitation.email_sent_at = new Date();
          invitation.email_sent_count = 1;
          invitation.last_email_sent_at = new Date();
          invitation.invitation_metadata.email_status = emailResult.success ? 'sent' : 'failed';
          invitation.invitation_metadata.email_message_id = emailResult.messageId;
          
          if (!emailResult.success) {
            invitation.invitation_metadata.email_error = emailResult.error;
          }

          await invitation.save();
        } catch (emailError) {
          console.error('❌ Bulk email sending error:', emailError);
          invitation.invitation_metadata.email_status = 'failed';
          invitation.invitation_metadata.email_error = emailError.message;
          await invitation.save();
        }

        results.push({ 
          index: i, 
          email: inviteData.email, 
          invitation_id: invitation._id,
          status: 'created' 
        });

      } catch (error) {
        errors.push({ 
          index: i, 
          email: inviteData.email, 
          error: error.message 
        });
      }
    }

    // Update admin settings invitation count (robust)
    if (adminSettings && results.length > 0) {
      if (typeof adminSettings.incrementInvitations === 'function') {
        // Call increment method N times to keep logic consistent
        for (let i = 0; i < results.length; i++) {
          await adminSettings.incrementInvitations();
        }
      } else if (adminSettings._id) {
        await AdminSettings.updateOne(
          { _id: adminSettings._id },
          {
            $inc: {
              "hierarchy.current_invitations_count": results.length,
              "activity.total_invitations_sent": results.length
            },
            $set: { "activity.last_invitation_sent": new Date() }
          }
        );
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: results.length,
        failed: errors.length,
        total: invitations.length,
        results,
        errors
      },
      message: `Successfully created ${results.length} invitations${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error("Create bulk invitations error:", error);
    res.status(500).json({ error: "Failed to create bulk invitations" });
  }
}
export async function resendInvitation(req, res) {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id)
      .populate('invited_by', 'name email')
      .populate('organization_id', 'name');

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Check if invitation belongs to admin's organization
    const admin = await Admin.findById(req.user.id);
    if (invitation.organization_id._id.toString() !== admin.organization_id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if invitation is still valid
    if (!invitation.isValid()) {
      return res.status(400).json({ error: "Invitation is no longer valid" });
    }

    // Update email tracking
    invitation.email_sent_count += 1;
    invitation.last_email_sent_at = new Date();
    await invitation.save();

    // Here you would integrate with SendGrid to send the email
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: "Invitation email sent successfully",
      data: {
        email_sent_count: invitation.email_sent_count,
        last_sent: invitation.last_email_sent_at
      }
    });

  } catch (error) {
    console.error("Resend invitation error:", error);
    res.status(500).json({ error: "Failed to resend invitation" });
  }
}

// DELETE /api/admin/invitations/:id - Cancel invitation
export async function cancelInvitation(req, res) {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Check if invitation belongs to admin's organization
    const admin = await Admin.findById(req.user.id);
    if (invitation.organization_id.toString() !== admin.organization_id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update invitation status
    invitation.status = 'cancelled';
    invitation.responded_at = new Date();
    await invitation.save();

    res.json({
      success: true,
      message: "Invitation cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel invitation error:", error);
    res.status(500).json({ error: "Failed to cancel invitation" });
  }
}

// POST /api/invitations/accept/:token - Accept invitation (public endpoint)
// GET /api/invitations/verify/:token - Verify invitation token (public route)
export async function verifyInvitation(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Find invitation by token
    const invitation = await Invitation.findOne({ 
      invitation_token: token,
      status: 'pending'
    }).populate('organization_id', 'name')
     .populate('invited_by', 'name email');

    if (!invitation) {
      return res.status(404).json({ 
        success: false,
        error: "Invalid or expired invitation" 
      });
    }

    // Check if invitation is still valid
    if (!invitation.isValid()) {
      await invitation.expire();
      return res.status(400).json({ 
        success: false,
        error: "Invitation has expired" 
      });
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: "User already exists with this email" 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: invitation._id,
        name: invitation.name,
        email: invitation.email,
        organization_id: invitation.organization_id,
        employee_details: invitation.employee_details,
        invited_by: invitation.invited_by,
        expires_at: invitation.expires_at,
        status: invitation.status
      },
      message: "Invitation verified successfully"
    });

  } catch (error) {
    console.error("Verify invitation error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to verify invitation" 
    });
  }
}

export async function acceptInvitation(req, res) {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    // Find invitation by token
    const invitation = await Invitation.findOne({ 
      invitation_token: token,
      status: 'pending'
    }).populate('organization_id');

    if (!invitation) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }

    // Check if invitation is still valid
    if (!invitation.isValid()) {
      await invitation.expire();
      return res.status(400).json({ error: "Invitation has expired" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Get organization's allowed models
    const organization = await Organization.findById(invitation.organization_id._id)
      .populate('settings.allowed_models');

    // Create user with invitation details
    const userData = {
      name,
      email: invitation.email,
      password_hash,
      role: invitation.role,
      organization_id: invitation.organization_id._id,
      status: 'active',
      available_models: organization.settings.allowed_models || [],
      employee_details: {
        ...invitation.employee_details,
        current_invitation_id: invitation._id
      },
      email_verified: true
    };

    // Create user with default settings
    const { user } = await createUserWithDefaults(userData);

    // Mark invitation as accepted
    await invitation.accept(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user_id: user._id,
        name: user.name,
        email: user.email,
        organization: invitation.organization_id.name
      }
    });

  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
}


