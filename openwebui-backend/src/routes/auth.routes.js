import express from "express";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser } from "../services/auth.service.js";

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

export default router;
