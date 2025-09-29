import React, { useState, useEffect, useRef } from "react";
import { ModelKey } from "./model-selector";
import { Button } from "@/components/ui/button";
interface Props {
  onSend: (text: string, model?: ModelKey) => Promise<void> | void;
  selectedModel: ModelKey;
}

export const Composer: React.FC<Props> = ({ onSend, selectedModel }) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const clear = () => setText("");

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    await onSend(t, selectedModel);
    clear();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex items-start gap-2">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Send a message. Shift+Enter for newline."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
        />
        <div className="flex items-center gap-2">
          <Button onClick={send}>Send</Button>
        </div>
      </div>
    </div>
  );
};
