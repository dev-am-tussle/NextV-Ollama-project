import React from "react";
import { Loader2, Send, Activity, CheckCircle2, XCircle } from "lucide-react";
import { ChatStatus } from "@/hooks/useChatMessaging";

interface Props {
  status: ChatStatus;
  onAbort?: () => void;
  streaming?: boolean;
}

const STATUS_COPY: Record<ChatStatus, string> = {
  idle: "Ready",
  "creating-conversation": "Creating conversation...",
  "sending-user": "Sending your message...",
  "streaming-assistant": "Streaming response...",
  finalizing: "Finalizing...",
  done: "Done",
  error: "Error occurred",
};

export const ChatStatusBar: React.FC<Props> = ({
  status,
  onAbort,
  streaming,
}) => {
  const icon = () => {
    switch (status) {
      case "creating-conversation":
      case "sending-user":
      case "streaming-assistant":
      case "finalizing":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "done":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-t bg-muted/40 text-xs text-muted-foreground">
      {icon()}
      <span>{STATUS_COPY[status]}</span>
      {streaming && onAbort && (
        <button
          onClick={onAbort}
          className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 hover:bg-background transition text-xs"
        >
          <XCircle className="h-3 w-3" /> Stop
        </button>
      )}
    </div>
  );
};
