import { useState, useRef, useCallback } from "react";
import { createConversation, postMessage } from "@/services/conversation";
import { streamGenerate } from "@/services/ollama";

// Structured error interface matching backend OllamaError
interface StructuredError {
  message: string;
  code?: string;
  userMessage?: string;
  suggestions?: string[];
}

export type ChatMessage = {
  id: string; // local or backend message id
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isSkeleton?: boolean; // true while assistant placeholder skeleton is shown
  isStreaming?: boolean; // true while receiving stream tokens
  status?: "streaming" | "finalizing" | "done" | "error"; // backend/runtime status for assistant
  error?: string; // error message if status=error
  saved?: boolean; // user saved as prompt
  feedback?: "up" | "down"; // like/dislike
  modelName?: string; // model name that generated this message
};

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: Date;
  model?: string;
}

export type ChatStatus =
  | "idle"
  | "sending-user"
  | "creating-conversation" // backend conversation creation in progress (first message)
  | "streaming-assistant"
  | "finalizing" // wrapping up persistence
  | "done"
  | "error";

interface UseChatMessagingArgs {
  selectedModel: string; // Using backend model names directly
  setThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  setActiveThreadId: (id: string) => void;
  toast: (opts: {
    title: string;
    description?: string;
    variant?: string;
  }) => void;
}

export function useChatMessaging({
  selectedModel,
  setThreads,
  setActiveThreadId,
  toast,
}: UseChatMessagingArgs) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  // Helper to format error messages with suggestions
  const formatErrorMessage = (error: any): { title: string; description: string } => {
    // Check if it's a structured error from backend
    if (error.userMessage && error.suggestions) {
      const suggestions = Array.isArray(error.suggestions) 
        ? error.suggestions.slice(0, 3).join(' • ') 
        : '';
      return {
        title: getErrorTitle(error.code),
        description: suggestions ? `${error.userMessage}\n\nSuggestions: ${suggestions}` : error.userMessage
      };
    }
    
    // Fallback for regular errors
    return {
      title: "Error",
      description: String(error?.message || error || "An unexpected error occurred")
    };
  };

  // Get user-friendly error titles based on error codes
  const getErrorTitle = (code?: string): string => {
    switch (code) {
      case 'MODEL_NOT_FOUND': return 'Model Not Available';
      case 'CONNECTION_FAILED': return 'Connection Error';
      case 'SERVER_OFFLINE': return 'Service Unavailable';
      case 'EMPTY_PROMPT': return 'Empty Message';
      case 'PROMPT_TOO_LONG': return 'Message Too Long';
      case 'MISSING_MODEL_ID': return 'No Model Selected';
      default: return 'Error';
    }
  };

  // Mongo style ObjectId (24 hex chars) detector
  const isBackendId = (id: string | null | undefined) =>
    !!id && /^[a-f\d]{24}$/i.test(id);

  const sendMessage = useCallback(
    async (
      text: string,
      activeThreadId: string | null,
      threads: ChatThread[]
    ): Promise<void> => {
      if (!text.trim() || isStreaming) return;

      setStatus("sending-user");
      setIsStreaming(true);

      // Ensure a local thread exists; don't create backend conversation yet.
      let workingThreadId = activeThreadId;
      if (!workingThreadId) {
        workingThreadId = `local-${Date.now()}`;
        setThreads((prev) => [
          {
            id: workingThreadId!,
            title: text.slice(0, 50) || "New Chat",
            messages: [],
            updatedAt: new Date(),
            model: selectedModel,
          },
          ...prev,
        ]);
        setActiveThreadId(workingThreadId);
      }

      // Append user message locally
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === workingThreadId
            ? { ...t, messages: [...t.messages, userMessage] }
            : t
        )
      );

      const backendModelId = selectedModel; // selectedModel is already backend model name
      const assistantId = `assistant-${Date.now()}`;

      // Insert placeholder assistant skeleton message
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "", // will be filled as tokens arrive
        timestamp: new Date(),
        isSkeleton: true,
        isStreaming: true,
        status: "streaming",
        modelName: selectedModel,
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === workingThreadId
            ? { ...t, messages: [...t.messages, assistantPlaceholder] }
            : t
        )
      );

      // Create backend conversation after user message appended (lazy) if needed
      let backendConversationId: string | null = null;
      if (
        !isBackendId(workingThreadId) ||
        workingThreadId.startsWith("local-")
      ) {
        try {
          setStatus("creating-conversation");
          if (process.env.NODE_ENV !== "production") {
            console.debug(
              "[chat] creating conversation because id invalid or local",
              workingThreadId
            );
          }
          const conv = await createConversation(text.slice(0, 50));
          backendConversationId = String(conv._id);
          const title = String(conv.title || text.slice(0, 50) || "New Chat");
          // Merge local temp thread id -> backend id
          setThreads((prev) => {
            const existing = prev.find((t) => t.id === workingThreadId);
            if (!existing) return prev;
            return [
              {
                ...existing,
                id: backendConversationId!,
                title,
                updatedAt: new Date(),
              },
              ...prev.filter((t) => t.id !== workingThreadId),
            ];
          });
          workingThreadId = backendConversationId;
          setActiveThreadId(backendConversationId);
        } catch (err) {
          const errorInfo = formatErrorMessage(err);
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive",
          });
          setIsStreaming(false);
          setStatus("error");
          return;
        }
      } else {
        // Use existing backend conversation ID
        backendConversationId = workingThreadId;
      }

      // After conversation exists, begin streaming (Gemma) or single-shot
      try {
        if (selectedModel === "Gemma") {
          setStatus("streaming-assistant");
          abortRef.current?.abort();
          abortRef.current = new AbortController();

          // Helper to clean incoming chunks (remove stray nulls etc.)
          const cleanChunk = (raw: string) =>
            raw.replace(/\u0000|\r/g, "").replace(/\s+$/g, " ");

          // Use the correct conversation ID - if we have backend ID, use it, otherwise use working ID
          const streamConversationId =
            backendConversationId ||
            (isBackendId(workingThreadId) ? workingThreadId : undefined);

          if (process.env.NODE_ENV !== "production") {
            console.debug(
              "[chat] Streaming with conversationId:",
              streamConversationId,
              "workingThreadId:",
              workingThreadId
            );
          }

          await streamGenerate(
            {
              prompt: text,
              modelId: backendModelId || "gemma:2b",
              modelName: selectedModel,
              conversationId: streamConversationId,
              signal: abortRef.current.signal,
            },
            {
              onChunk: (chunk) => {
                const cleaned = cleanChunk(chunk);
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === workingThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m) =>
                            m.id === assistantId
                              ? {
                                  ...m,
                                  content: m.content + cleaned,
                                  isSkeleton: false, // first real token arrives -> remove skeleton
                                  isStreaming: true,
                                  status: "streaming",
                                }
                              : m
                          ),
                        }
                      : t
                  )
                );
              },
              onMessageId: (backendMessageId) => {
                // Replace temporary assistantId with backend id for persistence mapping
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === workingThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m) =>
                            m.id === assistantId && !/^[a-f\d]{24}$/i.test(m.id)
                              ? { ...m, id: backendMessageId }
                              : m
                          ),
                        }
                      : t
                  )
                );
              },
              onError: (err) => {
                const errorInfo = formatErrorMessage(err);
                toast({
                  title: errorInfo.title,
                  description: errorInfo.description,
                  variant: "destructive",
                });
                setStatus("error");
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === workingThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m) =>
                            m.id === assistantId
                              ? {
                                  ...m,
                                  isStreaming: false,
                                  status: "error",
                                  error: errorInfo.description,
                                }
                              : m
                          ),
                        }
                      : t
                  )
                );
              },
              onClose: (final) => {
                setStatus("finalizing");
                const finalText = final?.text; // refined full text from backend if provided
                const backendMessageId = final?.messageId;
                const backendModelName = final?.modelName;
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === workingThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m) => {
                            const isTarget =
                              m.id === assistantId ||
                              (backendMessageId && m.id === backendMessageId);
                            if (!isTarget) return m;
                            return {
                              ...m,
                              id: backendMessageId || m.id,
                              content: finalText && finalText.length > m.content.length ? finalText : m.content,
                              isStreaming: false,
                              status: "done",
                              isSkeleton: false,
                              modelName: backendModelName || m.modelName,
                            };
                          }),
                          updatedAt: new Date(),
                        }
                      : t
                  )
                );
              },
            }
          );
        } else {
          // Non-streaming path
          setStatus("finalizing");
          if (workingThreadId) {
            const respUnknown = await postMessage(
              workingThreadId,
              text,
              backendModelId
            );
            const resp = respUnknown as any;
            const assistantText = resp?.assistant?.text || "";
            setThreads((prev) =>
              prev.map((t) =>
                t.id === workingThreadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === assistantId
                          ? {
                              ...m,
                              content: assistantText,
                              isSkeleton: false,
                              isStreaming: false,
                              status: "done",
                            }
                          : m
                      ),
                      updatedAt: new Date(),
                    }
                  : t
              )
            );
          }
        }
        setStatus("done");
      } catch (err: any) {
        const errorInfo = formatErrorMessage(err);
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
          variant: "destructive",
        });
        setStatus("error");
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, selectedModel, setThreads, setActiveThreadId, toast]
  );

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsStreaming(false);
      setStatus("idle");
    }
  }, []);

  return { sendMessage, isStreaming, status, abort };
}
