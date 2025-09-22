import { runModelStream } from "../services/ollama.service.js";

export function streamGenerate(req, res) {
  try {
    const { modelId, prompt } = req.body || {};

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

    // Helper to send a chunk of client
    const sendChunk = (data) => {
      res.write(`data: ${JSON.stringify({ chunk: data })}\n\n`);
    };

    // Start model stream

    const proc = runModelStream(
      modelId,
      prompt,
      (chunk) => sendChunk(chunk),
      () => {
        res.write(`event: done\ndata: {}\n\n`);
        res.end();
      },
      (err) => {
        // onError
        res.write(
          `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
        );

        res.end();
      }
    );

    // If client closes connection, kill the process
    req.on("close", () => {
      try {
        proc.kill();
      } catch (e) {}
      res.end();
    });
  } catch (err) {
    console.error("Error in streamGenerate: ", err);
    res.status(500).json({ error: "Unexpected server error." });
  }
}

