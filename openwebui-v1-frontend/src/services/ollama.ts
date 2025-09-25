export type StreamCallbacks = {
  onChunk?: (text: string) => void;
  onClose?: () => void;
  onError?: (err: any) => void;
};

export type StreamOptions = {
  prompt: string;
  modelId?: string;
  signal?: AbortSignal;
};

const API_BASE: string = (import.meta as any).env?.VITE_API_URL as string;

export async function streamGenerate(
  opts: StreamOptions,
  callbacks: StreamCallbacks = {}
): Promise<void> {
  const { prompt: content, modelId: model, signal } = opts;
  const { onChunk, onClose, onError } = callbacks;

  const url = `${API_BASE.replace(/\/$/, "")}/api/v1/models/generate/stream`;
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ modelId: model, prompt: content }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || "Stream request failed");
    }

    if (!res.body) {
      const text = await res.text();
      onChunk?.(text);
      onClose?.();
      return;
    }

    // SSE parser: accumulate text and split by double-newline
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let parts = buffer.split("\n\n");
      // Keep the last partial chunk in buffer
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part.split(/\r?\n/).map((l) => l.trim());
        let event = "message";
        let dataLines: string[] = [];
        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:"))
            dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length > 0) {
          const dataStr = dataLines.join("\n");
          try {
            const obj = JSON.parse(dataStr);
            // if payload has { chunk }
            if (obj && typeof obj.chunk === "string") {
              onChunk?.(obj.chunk);
            } else {
              // fallback: stringify entire obj
              onChunk?.(JSON.stringify(obj));
            }
          } catch (e) {
            // not json: pass raw
            onChunk?.(dataStr);
          }
        }
        if (event === "done") onClose?.();
        if (event === "error") onError?.(new Error("Stream error from server"));
      }
    }

    // If stream ends without explicit done event
    if (buffer.trim()) {
      // try process last buffered chunk
      const lines = buffer.split(/\r?\n/).map((l) => l.trim());
      let dataLines: string[] = [];
      for (const line of lines)
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      if (dataLines.length > 0) {
        try {
          const obj = JSON.parse(dataLines.join("\n"));
          if (obj && typeof obj.chunk === "string") onChunk?.(obj.chunk);
          else onChunk?.(JSON.stringify(obj));
        } catch (e) {
          onChunk?.(dataLines.join("\n"));
        }
      }
    }

    onClose?.();
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

// Convenience helper to return full generated text (non-streaming) by collecting chunks
export async function generateText(
  content: string,
  model?: string,
  signal?: AbortSignal
) {
  let text = "";
  await streamGenerate(
    { prompt: content, modelId: model, signal },
    {
      onChunk: (c) => (text += c),
    }
  );
  return text;
}
