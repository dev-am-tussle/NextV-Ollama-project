const ALLOWED_MODELS = ["gemma:2b", "phi:2.7b"];

// Use environment variable for Ollama API URL
const OLLAMA_BASE_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";

// helper to remove ANSI escape codes (cursor hide/show, colors, etc.)
function stripAnsiCodes(str) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

export async function runModelStream(modelId, prompt, onChunk, onClose, onError) {
  try {
    // Validate modelId
    if (!ALLOWED_MODELS.includes(modelId)) {
      throw new Error(`Model ${modelId} is not allowed.`);
    }

    // Validate prompt
    if (typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("Prompt must be a non-empty string.");
    }
    if (prompt.length > 1000) {
      throw new Error("Prompt is too long. Maximum 1000 characters.");
    }

    console.log(`[runModelStream] Using Ollama API: ${OLLAMA_BASE_URL}`);
    console.log(`[runModelStream] Starting model: ${modelId}`);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body from Ollama API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";

    // Set up timeouts using your env variables
    const IDLE_TIMEOUT_MS = parseInt(process.env.OLLAMA_IDLE_TIMEOUT_MS) || 300000; // 5 minutes
    const TOTAL_TIMEOUT_MS = parseInt(process.env.OLLAMA_TOTAL_TIMEOUT_MS) || 600000; // 10 minutes

    let idleTimer = null;
    let totalTimer = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const err = new Error("Model run idle timeout");
        reader.cancel();
        onError(err);
      }, IDLE_TIMEOUT_MS);
    }

    function startTotalTimer() {
      if (totalTimer) clearTimeout(totalTimer);
      totalTimer = setTimeout(() => {
        const err = new Error("Model run total timeout");
        reader.cancel();
        onError(err);
      }, TOTAL_TIMEOUT_MS);
    }

    // Start timers
    resetIdle();
    startTotalTimer();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetIdle(); // Reset idle timer on each chunk

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              const cleanResponse = stripAnsiCodes(data.response);
              accumulatedText += cleanResponse;
              onChunk && onChunk(cleanResponse);
            }
            
            if (data.done) {
              // Clear timers
              if (idleTimer) clearTimeout(idleTimer);
              if (totalTimer) clearTimeout(totalTimer);
              
              console.log(`[runModelStream] Stream completed. Total length: ${accumulatedText.length}`);
              onClose && onClose(accumulatedText);
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('[runModelStream] Invalid JSON line:', line);
          }
        }
      }

      // Stream ended without explicit done
      if (idleTimer) clearTimeout(idleTimer);
      if (totalTimer) clearTimeout(totalTimer);
      onClose && onClose(accumulatedText);

    } catch (readError) {
      if (idleTimer) clearTimeout(idleTimer);
      if (totalTimer) clearTimeout(totalTimer);
      throw readError;
    }

  } catch (err) {
    console.error(`[runModelStream] Error:`, err);
    
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      onError && onError(new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE_URL}. Please ensure Ollama is running with: ollama serve`));
    } else if (err.message.includes('ECONNREFUSED')) {
      onError && onError(new Error(`Ollama server not running at ${OLLAMA_BASE_URL}. Start with: ollama serve`));
    } else {
      onError && onError(err);
    }
  }
}
