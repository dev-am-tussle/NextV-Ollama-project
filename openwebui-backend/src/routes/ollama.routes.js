import express from "express";
import { streamGenerate } from "../controllers/ollama.controllers.js";
import ratelimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const limiter = ratelimit({
  windowMs: 60 * 1000, // 1 min window
  max: 20, // limit each IP to 20 req per window
  message: { error: "Too many requests, please try again later." },
});

// POST /api/models/stream-generate
router.post("/generate/stream", requireAuth, limiter, streamGenerate);

export default router;
