import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as adminUsersController from "../controllers/adminUsers.controller.js";

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

// GET /api/admin/users - Get all users with pagination
router.get("/", adminUsersController.getAllUsers);

// GET /api/admin/users/stats - Get user statistics
router.get("/stats", adminUsersController.getUsersStats);

// GET /api/admin/users/:id - Get specific user details
router.get("/:id", adminUsersController.getUserById);

// PUT /api/admin/users/:id - Update user
router.put("/:id", adminUsersController.updateUser);

// DELETE /api/admin/users/:id - Delete user
router.delete("/:id", adminUsersController.deleteUser);

export default router;