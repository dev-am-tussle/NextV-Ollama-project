import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createConversation,
  listConversations,
  getMessages,
  addUserMessage,
  createModelMessage,
  appendToModelMessage,
  finalizeConversationTouch,
  getConversation,
  deleteConversation,
} from "../services/chat.service.js";
import { Message } from "../models/message.model.js";
import { runModelStream } from "../services/ollama.service.js";

const router = express.Router();

// All conversation routes require authentication
router.use(requireAuth);

// Create a new conversation
router.post("/", async (req, res) => {
  try {
    const { title } = req.body;
    const conversation = await createConversation(req.user.id, title);
    res.status(201).json(conversation);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List user's conversations
router.get("/", async (req, res) => {
  try {
    const { limit } = req.query;
    const conversations = await listConversations(
      req.user.id,
      Number(limit) || 20
    );
    res.json(conversations);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get messages for a specific conversation
router.get("/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit } = req.query;
    const messages = await getMessages(
      conversationId,
      req.user.id,
      Number(limit) || 50
    );

    if (!messages) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(messages);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Post a new user message and generate model reply (synchronous, collects stream)
router.post("/:conversationId/messages", async (req, res) => {
  const started = Date.now();
  const { conversationId } = req.params;
  const { content, model } = req.body || {};
  try {
    // Basic validation
    if (typeof content !== "string" || !content.trim()) {
      return res
        .status(400)
        .json({ error: "Content must be a non-empty string" });
    }
    if (content.length > 4000) {
      return res
        .status(400)
        .json({ error: "Content too long (max 4000 chars)" });
    }
    if (model && typeof model !== "string") {
      return res.status(400).json({ error: "Invalid model parameter" });
    }

    // Ownership check
    const conv = await getConversation(conversationId, req.user.id);
    if (!conv) {
      return res
        .status(404)
        .json({ error: "Conversation not found or access denied" });
    }

    // Persist user message first
    const userMsg = await addUserMessage(conversationId, content);

    // Create model placeholder
    const modelMsg = await createModelMessage(conversationId, model, model);

    let collected = "";
    let errored = false;

    await new Promise((resolve) => {
      const onChunk = async (chunk) => {
        const text = String(chunk || "");
        if (!text) return;
        collected += text;
        try {
          await appendToModelMessage(modelMsg._id, text);
        } catch (err) {
          // non-fatal
        }
      };
      const onClose = async () => {
        resolve(null);
      };
      const onError = async (err) => {
        errored = true;
        console.error("Model stream error:", err);
        resolve(null);
      };
      try {
        runModelStream(model || "gemma:2b", content, onChunk, onClose, onError);
      } catch (err) {
        errored = true;
        console.error("runModelStream immediate error:", err);
        resolve(null);
      }
    });

    // Finalize: merge chunks into text & set status
    try {
      const update = errored
        ? {
            status: "error",
            error: collected || "Stream failed",
            updated_at: new Date(),
          }
        : {
            status: "done",
            text: collected,
            chunks: [],
            updated_at: new Date(),
          };
      await Message.updateOne({ _id: modelMsg._id }, { $set: update });
      await finalizeConversationTouch(conversationId);
    } catch (finErr) {
      console.warn("Finalize update failed:", finErr);
    }

    const durationMs = Date.now() - started;
    return res.json({
      user: {
        id: userMsg._id,
        text: userMsg.text,
        created_at: userMsg.created_at,
      },
      assistant: {
        id: modelMsg._id,
        text: collected,
        status: errored ? "error" : "done",
        error: errored ? collected || "Model stream error" : undefined,
        model_name: model,
        duration_ms: durationMs,
      },
      conversation: { id: conv._id, updated_at: new Date() },
    });
  } catch (e) {
    console.error("Error in POST /:conversationId/messages:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Delete a conversation
router.delete("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await deleteConversation(conversationId, req.user.id);
    res.json(result);
  } catch (e) {
    console.error("Error deleting conversation:", e);
    res.status(400).json({ error: e.message });
  }
});

export default router;
