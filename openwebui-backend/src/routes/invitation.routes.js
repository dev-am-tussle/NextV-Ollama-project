import express from "express";
import { requireAuth, requireAdmin } from "../middleware/roleAuth.js";
import * as invitationController from "../controllers/invitation.controller.js";

const router = express.Router();

// Admin routes (require admin authentication)
router.use("/admin/invitations", requireAdmin);

// GET /api/admin/invitations - Get all invitations for organization
router.get("/admin/invitations", invitationController.getInvitations);

// POST /api/admin/invitations - Create new invitation
router.post("/admin/invitations", invitationController.createInvitation);

// POST /api/admin/invitations/bulk - Create multiple invitations
router.post("/admin/invitations/bulk", invitationController.createBulkInvitations);

// POST /api/admin/invitations/:id/resend - Resend invitation email
router.post("/admin/invitations/:id/resend", invitationController.resendInvitation);

// DELETE /api/admin/invitations/:id - Cancel invitation
router.delete("/admin/invitations/:id", invitationController.cancelInvitation);

// Public routes (no authentication required)
// GET /api/invitations/verify/:token - Verify invitation token
router.get("/invitations/verify/:token", invitationController.verifyInvitation);

// POST /api/invitations/accept/:token - Accept invitation
router.post("/invitations/accept/:token", invitationController.acceptInvitation);

export default router;
