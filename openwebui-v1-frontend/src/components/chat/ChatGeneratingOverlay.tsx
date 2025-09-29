import React from "react";

interface Props {
  active: boolean;
  status?: string;
}

// Centered translucent overlay indicating active generation / streaming
export const ChatGeneratingOverlay: React.FC<Props> = ({ active, status }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
      <div className="px-6 py-4 rounded-xl bg-background/80 backdrop-blur border shadow-sm flex items-center gap-3 text-sm">
        <div className="flex -space-x-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="font-medium tracking-wide text-muted-foreground">
          {status === "streaming-assistant" && "Generating response..."}
          {status === "creating-conversation" && "Creating conversation..."}
          {status === "finalizing" && "Finalizing..."}
          {status !== "streaming-assistant" &&
            status !== "creating-conversation" &&
            status !== "finalizing" &&
            (status || "Working...")}
        </span>
      </div>
    </div>
  );
};

export default ChatGeneratingOverlay;
