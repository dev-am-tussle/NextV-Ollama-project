import React, { useRef, useEffect } from "react";

type Message = {
  _id?: string;
  id?: string;
  sender?: "user" | "assistant" | string;
  text?: string;
  createdAt?: string | number | Date;
};

interface Props {
  messages: Message[];
  userId?: string;
}

export const MessagesPane: React.FC<Props> = ({ messages, userId }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="p-4 overflow-auto flex-1">
      <div className="space-y-4">
        {messages.map((m) => (
          <div
            key={m._id}
            className={`flex items-start gap-3 ${
              m.sender === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            {m.sender === "assistant" ? (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                A
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                U
              </div>
            )}

            <div className="max-w-[70%] break-words rounded-lg p-3 bg-card">
              <div className="text-sm">{m.text}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
