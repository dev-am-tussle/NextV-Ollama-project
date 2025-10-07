import express from "express";
import { unifiedLogin, getUnifiedProfile, unifiedLogout } from "../controllers/unifiedAuth.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Unified login endpoint
router.post("/login", unifiedLogin);

// Unified profile endpoint  
router.get("/profile", authenticateToken, getUnifiedProfile);

// Unified logout endpoint
router.post("/logout", authenticateToken, unifiedLogout);

export default router;