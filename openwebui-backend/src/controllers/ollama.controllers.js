import { runModelStream } from "../services/ollama.service.js";
import * as chatService from "../services/chat.service.js";

// helper to safe-send SSE events
function sseSend(res, event, payload) {
  if (event) {
    res.write(`event: ${event}\n`);
  }
  res.write(`data: ${JSON.stringify(payload || {})}\n\n`);
}

export async function streamGenerate(req, res) {
  try {
    const { modelId, prompt, modelName } = req.body || {};

    if (typeof modelId !== "string" || typeof prompt !== "string") {
      return res
        .status(400)
        .json({ error: "modelId and prompt must be strings." });
    }
    if (!modelId.trim() || !prompt.trim()) {
      return res
        .status(400)
        .json({ error: "modelId and prompt are required." });
    }
    if (prompt.length > 2000) {
      return res
        .status(400)
        .json({ error: "Prompt too long (max 2000 chars)." });
    }

    // Set headers for SSE (Server sent events)

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Ensure we have a conversation id (either provided or create new)
    const conversationId = req.body.conversationId;
    let convoDoc = null;
    const userId = req.user?.id;

    // Better validation for conversationId - check if it's a valid non-empty string
    if (
      conversationId &&
      typeof conversationId === "string" &&
      conversationId.trim()
    ) {
      console.log(
        `[streamGenerate] Using existing conversation: ${conversationId}`
      );
      // verify ownership
      convoDoc = await chatService.getConversation(conversationId, userId);
      if (!convoDoc) {
        return res.status(404).json({ error: "Conversation not found." });
      }
    } else {
      console.log(
        `[streamGenerate] Creating new conversation for user: ${userId}`
      );
      // create conversation for user only when no valid conversationId
      convoDoc = await chatService.createConversation(userId, "New Chat");
    }

    const convoId = convoDoc._id || convoDoc.id;

    // Persist user message first (include user id)
    const userMsg = await chatService.addUserMessage(convoId, prompt, userId);
    

    // Create assistant placeholder message and immediately send its id to client
    const assistantMsg = await chatService.createModelMessage(convoId, modelId, modelName);
    sseSend(res, "message_id", { message_id: assistantMsg._id.toString() });

    // Helper to send chunk event
    const sendChunk = (data) => {
      sseSend(res, "chunk", { chunk: data });
    };

    let finished = false;

    // Start model stream
    const proc = runModelStream(
      modelId,
      prompt,
      async (chunk) => {
        try {
          // append chunk to DB (async, best-effort)
          await chatService.appendToModelMessage(assistantMsg._id, chunk);
        } catch (e) {
          console.error("Failed to append chunk to model message:", e);
        }
        sendChunk(chunk);
      },
      async (code) => {
        if (finished) return;
        finished = true;
        try {
          // finalize: collapse chunks into text and mark done
          const finalMsg = await chatService.finalizeModelMessage(assistantMsg._id);
          await chatService.finalizeConversationTouch(convoId);
          sseSend(res, "done", {
            message_id: assistantMsg._id.toString(),
            text: finalMsg?.text || null,
            conversation_id: convoId.toString(),
            status: "done",
            model_name: finalMsg?.model_name || modelName || null,
          });
        } catch (e) {
          console.error("Error finalizing model message:", e);
        }
        res.end();
      },
      async (err) => {
        if (finished) return;
        finished = true;
        console.error("Model stream error:", err);
        try {
          await chatService.appendToModelMessage(
            assistantMsg._id,
            "\n[Model error: " + err.message + "]"
          );
          await chatService.markModelMessageError(
            assistantMsg._id,
            err.message
          );
        } catch (e) {}
        sseSend(res, "error", { message: err.message });
        res.end();
      }
    );

    // If client closes connection, kill the process and mark message
    req.on("close", async () => {
      try {
        proc.kill();
      } catch (e) {}
      if (!finished) {
        finished = true;
        try {
          await chatService.appendToModelMessage(
            assistantMsg._id,
            "\n[Client disconnected]"
          );
          await chatService.markModelMessageError(
            assistantMsg._id,
            "client_disconnected"
          );
        } catch (e) {}
      }
      try {
        res.end();
      } catch (e) {}
    });
  } catch (err) {
    console.error("Error in streamGenerate: ", err);
    res.status(500).json({ error: "Unexpected server error." });
  }
}
