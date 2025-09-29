import express from "express";
import { SavedPrompt } from "../models/savedPrompt.model.js";

const router = express.Router();

// create saved prompt
router.post("/", async (req, res, next) => {
  try {
    const { user_id, title, prompt } = req.body;
    if (!user_id || !prompt)
      return res.status(400).json({ error: "missing fields" });
    const sp = await SavedPrompt.create({ user_id, title, prompt });
    res.status(201).json(sp);
  } catch (err) {
    next(err);
  }
});

// list user's saved prompts
router.get("/user/:userId", async (req, res, next) => {
  try {
    const list = await SavedPrompt.find({ user_id: req.params.userId })
      .sort({ created_at: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

export default router;
