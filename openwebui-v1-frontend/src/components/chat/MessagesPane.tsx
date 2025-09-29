import React from "react";
import AssistantSkeleton from "./AssistantSkeleton";

// Extended message type used within chat UI layer
export type ChatMessage = {
  _id?: string; // backend id
  id?: string; // local temp id
  sender: "user" | "assistant" | string;
  text: string;
  createdAt?: string | number | Date;
  isSkeleton?: boolean; // show placeholder skeleton instead of real content
  isStreaming?: boolean; // actively receiving stream chunks
};

interface Props {
  messages: ChatMessage[];
  userId?: string;
}

export const MessagesPane: React.FC<Props> = ({ messages, userId }) => {
  const formatDate = (d?: string | number | Date) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        {messages.map((m) => {
          const key = m._id || m.id || `${m.sender}-${Math.random()}`;
          const isAssistant = m.sender === "assistant";
          return (
            <div
              key={key}
              className={`flex items-start gap-3 ${
                isAssistant ? "justify-start" : "justify-end"
              }`}
            >
              {isAssistant ? (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  AI
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                  U
                </div>
              )}

              <div className="max-w-[70%] break-words rounded-lg p-3 bg-card relative">
                {m.isSkeleton ? (
                  <AssistantSkeleton />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {m.text}
                    {m.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary/70 ml-1 align-baseline animate-pulse rounded-sm" />
                    )}
                  </div>
                )}
                {!m.isSkeleton && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(m.createdAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
