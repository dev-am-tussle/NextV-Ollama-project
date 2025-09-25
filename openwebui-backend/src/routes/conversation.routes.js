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
} from "../services/chat.service.js";
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
  try {
    const { conversationId } = req.params;
    const { content, model } = req.body || {};
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Missing content" });
    }

    // Log incoming request for debugging (dev only)
    console.log(
      `POST /conversations/${conversationId}/messages by user=${req.user.id} model=${model}`
    );

    if (model && typeof model !== "string") {
      return res.status(400).json({ error: "Invalid model parameter" });
    }

    // Verify conversation exists and belongs to the user
    const conv = await getConversation(conversationId, req.user.id);
    if (!conv) {
      return res
        .status(404)
        .json({ error: "Conversation not found or access denied" });
    }

    // Persist user message
    const userMsg = await addUserMessage(conversationId, content);

    // Create an empty model message we can append to
    const modelMsg = await createModelMessage(conversationId);

    // Collect chunks into a buffer then respond when done
    let collected = "";

    await new Promise((resolve, reject) => {
      const onChunk = async (chunk) => {
        try {
          const text = String(chunk);
          collected += text;
          await appendToModelMessage(modelMsg._id, text);
        } catch (err) {
          // ignore append errors
        }
      };
      const onClose = async () => {
        try {
          await finalizeConversationTouch(conversationId);
        } catch (e) {}
        resolve(null);
      };
      const onError = (err) => reject(err);

      // Run model stream (will call onChunk/onClose)
      try {
        runModelStream(model || "gemma:2b", content, onChunk, onClose, onError);
      } catch (err) {
        // handle synchronous errors (e.g., model not allowed)
        console.error("runModelStream failed synchronously:", err);
        reject(err);
      }
    });

    // Return both messages (user and assistant) as the response
    res.json({
      user: userMsg,
      assistant: { id: modelMsg._id, text: collected },
    });
  } catch (e) {
    // Log full error for server-side diagnosis
    console.error("Error in POST /:conversationId/messages:", e);
    // Return message and (in dev) stack to the client to aid debugging
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

export default router;
