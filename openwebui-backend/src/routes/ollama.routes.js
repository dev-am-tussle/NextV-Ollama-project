import express from "express";
import { streamGenerate } from "../controllers/ollama.controllers.js";
import ratelimit from "express-rate-limit";
const router = express.Router();

const limiter = ratelimit({
  windowMs: 60 * 1000, // 1 min window
  max: 20, // limit each IP to 20 req per window
  message: { error: "Too many requests, please try again later." },
});

// Dummy auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized. Token required." });
  }

  next();
}

// POST /api/models/stream-generate
router.post("/generate/stream", authMiddleware, limiter, streamGenerate);

export default router;
