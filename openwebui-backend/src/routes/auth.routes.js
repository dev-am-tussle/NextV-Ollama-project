import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  revokeToken,
} from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserProfile } from "../services/auth.service.js";

const router = express.Router();

// Rate limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: "Too many auth attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const data = await registerUser(req.body);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const data = await loginUser(req.body);
    res.json(data);
  } catch (e) {
    // Generic message for security
    res.status(400).json({ error: "Invalid credentials" });
  }
});

// Logout (revoke token) — expects Authorization: Bearer <token> or optional token in body
router.post("/logout", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : req.body?.token;
    if (token) revokeToken(token);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to logout" });
  }
});

// get current user (for debugging/testing)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await getUserProfile(userId);
    return res.json(data);
  } catch (err) {
    console.error("GET /auth/me error:", err);
    // map known errors to status codes
    if (err.message === "User not found")
      return res.status(404).json({ error: err.message });
    if (err.message === "Missing user id")
      return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: "Failed to fetch current user" });
  }
});

export default router;
