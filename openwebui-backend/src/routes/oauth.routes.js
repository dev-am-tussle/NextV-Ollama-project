import express from "express";
import { loginWithOAuth } from "../services/auth.service.js";

const router = express.Router();

// POST /api/v1/auth/microsoft
// body: { code, redirect_uri }
router.post("/microsoft", async (req, res, next) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });
    const result = await loginWithOAuth({
      provider: "microsoft",
      code,
      redirect_uri,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
