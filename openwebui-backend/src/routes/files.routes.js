import express from "express";
import { FileMeta } from "../models/file.model.js";

const router = express.Router();

// register file metadata (assumes file already uploaded to storage)
router.post("/", async (req, res, next) => {
  try {
    const {
      user_id,
      conversation_id,
      filename,
      content_type,
      size_bytes,
      storage_url,
    } = req.body;
    if (!user_id || !storage_url)
      return res.status(400).json({ error: "missing fields" });
    const f = await FileMeta.create({
      user_id,
      conversation_id,
      filename,
      content_type,
      size_bytes,
      storage_url,
    });
    res.status(201).json(f);
  } catch (err) {
    next(err);
  }
});

// list files by user
router.get("/user/:userId", async (req, res, next) => {
  try {
    const list = await FileMeta.find({ user_id: req.params.userId })
      .sort({ created_at: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

export default router;
