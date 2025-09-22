import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createConversation,
  listConversations,
  getMessages,
} from "../services/chat.service.js";

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

export default router;
