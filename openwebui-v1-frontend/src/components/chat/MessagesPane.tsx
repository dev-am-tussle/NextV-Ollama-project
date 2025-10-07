import React from "react";
import AssistantSkeleton from "./AssistantSkeleton";
import {
  Copy,
  Edit2,
  BookmarkPlus,
  RefreshCcw,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  BookmarkCheck,
} from "lucide-react";
import { useState } from "react";

// Extended message type used within chat UI layer
export type ChatMessage = {
  _id?: string; // backend id
  id?: string; // local temp id
  sender: "user" | "assistant" | string;
  text: string;
  createdAt?: string | number | Date;
  isSkeleton?: boolean; // show placeholder skeleton instead of real content
  isStreaming?: boolean; // actively receiving stream chunks
  saved?: boolean; // whether this message is saved as prompt
  modelName?: string; // model name that generated this message
};

interface Props {
  messages: ChatMessage[];
  userId?: string;
  onEditMessage?: (id: string, newContent: string) => void;
  onSavePrompt?: (id: string, content: string) => Promise<void>;
  onRegenerate?: (id: string, content: string) => void;
  onFeedback?: (id: string, value: "up" | "down") => void;
  onCopy?: (content: string) => void;
}

export const MessagesPane: React.FC<Props> = ({
  messages,
  userId,
  onEditMessage,
  onSavePrompt,
  onRegenerate,
  onFeedback,
  onCopy,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, "up" | "down" | undefined>
  >({});

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditingValue(current);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };
  const commitEdit = () => {
    if (editingId) onEditMessage?.(editingId, editingValue);
    cancelEdit();
  };

  const copyToClipboard = async (text: string, id?: string) => {
    try {
      if (onCopy) return onCopy(text);
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId((curr) => (curr === id ? null : curr));
        }, 2200);
      }
    } catch (_) {}
  };

  const savePrompt = async (id: string, text: string) => {
    try {
      if (onSavePrompt) {
        await onSavePrompt(id, text);
        setSavedIds((prev) => new Set(prev).add(id));
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
      // You could show a toast notification here
    }
  };

  const regenerate = (id: string, text: string) => {
    onRegenerate?.(id, text);
  };

  const feedback = (id: string, v: "up" | "down") => {
    setFeedbackMap((prev) => ({
      ...prev,
      [id]: prev[id] === v ? undefined : v,
    }));
    const final = feedbackMap[id] === v ? undefined : v;
    if (final) onFeedback?.(id, final);
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        {messages.map((m) => {
          const key = m._id || m.id || `${m.sender}-${Math.random()}`;
          const isAssistant = m.sender === "assistant";
          const mid = String(m.id || m._id || key);
          const saved = savedIds.has(mid) || (m as any).saved;
          const fb = feedbackMap[mid] || (m as any).feedback;
          const isEditing = editingId === m.id || editingId === m._id;
          return (
            <div
              key={key}
              className={`group flex items-start gap-3 ${
                isAssistant ? "justify-start" : "justify-end"
              }`}
            >
              {isAssistant && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium select-none">
                  AI
                </div>
              )}

              <div
                className={`relative max-w-[72%] break-words rounded-xl px-4 py-3 bg-card shadow-sm border border-border/50 transition-colors ${
                  isAssistant ? "rounded-tl-sm" : "rounded-tr-sm"
                }`}
              >
                {m.isSkeleton ? (
                  <AssistantSkeleton />
                ) : isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-sm bg-background/60 border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                      rows={3}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                    />
                    <div
                      className="flex items-center gap-2 justify-end"
                      role="toolbar"
                      aria-label="Edit actions"
                    >
                      <button
                        onClick={commitEdit}
                        className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-xs flex items-center gap-1"
                        title="Save"
                      >
                        <Check className="h-4 w-4" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-md bg-muted hover:bg-muted/70 text-xs flex items-center gap-1"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {/* Show error message for error status */}
                    {(m as any).status === "error" && (m as any).error ? (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
                          <X className="h-4 w-4" />
                          Failed to generate response
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {(m as any).error}
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Regular message content */}
                    {m.text}
                    {m.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary/70 ml-1 align-baseline animate-pulse rounded-sm" />
                    )}
                  </div>
                )}

                {/* Action Toolbar */}
                {!m.isSkeleton && !isEditing && (
                  <div
                    className={`mt-2 flex items-center gap-1 transition-opacity duration-150 text-muted-foreground flex-wrap ${
                      isAssistant ? "justify-start" : "justify-end"
                    }`}
                    role="toolbar"
                    aria-label={
                      isAssistant
                        ? "Assistant message actions"
                        : "User message actions"
                    }
                  >
                    {/* Shared: Copy */}
                    <button
                      onClick={() => copyToClipboard(m.text, mid)}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors"
                      title={copiedId === mid ? "Copied" : "Copy"}
                      aria-label="Copy"
                    >
                      {copiedId === mid ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    {isAssistant ? (
                      <>
                        <button
                          onClick={() =>
                            regenerate(String(m.id || m._id), m.text)
                          }
                          className="p-1.5 hover:bg-muted rounded-md"
                          title="Regenerate"
                          aria-label="Regenerate"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => feedback(mid, "up")}
                          className={`p-1.5 rounded-md hover:bg-muted ${
                            fb === "up" ? "text-primary" : ""
                          }`}
                          title={fb === "up" ? "Undo like" : "Like"}
                          aria-label="Like"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        {fb !== "up" && (
                          <button
                            onClick={() => feedback(mid, "down")}
                            className={`p-1.5 rounded-md hover:bg-muted ${
                              fb === "down" ? "text-primary" : ""
                            }`}
                            title={fb === "down" ? "Undo dislike" : "Dislike"}
                            aria-label="Dislike"
                            >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        )}
                        {m.modelName && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 select-none font-medium">
                            {m.modelName}
                          </span>
                        )}
                        {m.isStreaming && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary animate-pulse select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                            Generating
                          </span>
                        )}
                        {!m.isStreaming && (m as any).status && (
                          <span
                            className={`ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border select-none ${
                              (m as any).status === "done"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : (m as any).status === "error"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : (m as any).status === "finalizing"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-primary/10 text-primary border-primary/30"
                            }`}
                            title={(m as any).error || (m as any).status}
                          >
                            {(m as any).status === "error"
                              ? "Error"
                              : (m as any).status === "done"
                              ? "Done"
                              : (m as any).status === "finalizing"
                              ? "Finalizing"
                              : "Streaming"}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            startEdit(String(m.id || m._id), m.text)
                          }
                          className="p-1.5 hover:bg-muted rounded-md"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => savePrompt(mid, m.text)}
                          className="p-1.5 hover:bg-muted rounded-md"
                          title={saved ? "Saved" : "Save as Prompt"}
                          aria-label="Save as Prompt"
                          disabled={saved}
                        >
                          {saved ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <BookmarkPlus className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Show saved marker if user saved prompt (would require state tracking externally) */}
                {/* Example placeholder: <div className="absolute top-2 right-2 text-primary"><BookmarkCheck className="h-4 w-4"/></div> */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
