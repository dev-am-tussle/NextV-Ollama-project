import express from "express";
import { SavedPrompt } from "../models/savedPrompt.model.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// create saved prompt
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, prompt } = req.body;
    const user_id = req.user?.id;

    if (!user_id || !prompt) {
      return res.status(400).json({ error: "user_id and prompt are required" });
    }

    const sp = await SavedPrompt.create({
      user_id,
      title: title || "Untitled Prompt",
      prompt,
    });
    res.status(201).json(sp);
  } catch (err) {
    next(err);
  }
});

// list user's saved prompts
router.get("/user/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id;

    console.log(
      `[savedprompts] GET request - userId: ${userId}, requestUserId: ${requestUserId}`
    );

    // User can only access their own prompts
    if (userId !== requestUserId) {
      console.log(`[savedprompts] Access denied - userId mismatch`);
      return res.status(403).json({ error: "Access denied" });
    }

    const list = await SavedPrompt.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();

    console.log(
      `[savedprompts] Found ${list.length} prompts for user ${userId}`
    );
    res.json(list);
  } catch (err) {
    console.error(`[savedprompts] Error fetching prompts:`, err);
    next(err);
  }
}); // delete saved prompt
router.delete("/:promptId", requireAuth, async (req, res, next) => {
  try {
    const { promptId } = req.params;
    const user_id = req.user?.id;

    const prompt = await SavedPrompt.findOne({ _id: promptId, user_id });
    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    await SavedPrompt.deleteOne({ _id: promptId, user_id });
    res.json({ message: "Prompt deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// update saved prompt
router.patch("/:promptId", requireAuth, async (req, res, next) => {
  try {
    const { promptId } = req.params;
    const { title, prompt } = req.body;
    const user_id = req.user?.id;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (prompt !== undefined) updates.prompt = prompt;

    const updatedPrompt = await SavedPrompt.findOneAndUpdate(
      { _id: promptId, user_id },
      updates,
      { new: true, lean: true }
    );

    if (!updatedPrompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    res.json(updatedPrompt);
  } catch (err) {
    next(err);
  }
});

export default router;
