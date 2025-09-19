"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Chat } from "@/components/context/AppContext";
import { useApp } from "@/components/context/AppContext";
import {
  Bot,
  User,
  Copy,
  Edit3,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChattingWindowProps {
  chat: Chat;
}

export function ChattingWindow({ chat }: ChattingWindowProps) {
  const { state } = useApp();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chat.messages]);

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 sm:px-3 md:px-4">
      <div className="max-w-5xl mx-auto py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
        {chat.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={
              state.isStreaming &&
              index === chat.messages.length - 1 &&
              message.role === "assistant"
            }
          />
        ))}

        {/* Streaming indicator */}
        {state.isStreaming && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce" />
              <div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

interface MessageBubbleProps {
  message: any;
  isStreaming?: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-3 md:gap-4 group",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 flex-shrink-0">
        {isUser ? (
          <>
            <AvatarImage src="/diverse-user-avatars.png" />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <User className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 space-y-1 sm:space-y-2 min-w-0",
          isUser && "flex flex-col items-end"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-2 py-2 sm:px-3 sm:py-2 md:px-4 md:py-3 break-words",
            "max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%]",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          <div className="prose prose-xs sm:prose-sm md:prose-base max-w-none dark:prose-invert">
            {/* Simple markdown-like rendering */}
            <MessageContent content={message.content} />
          </div>
        </div>

        {/* Message Actions */}
        <div
          className={cn(
            "flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser && "flex-row-reverse"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 sm:h-6 sm:w-6"
            onClick={() => copyToClipboard(message.content)}
          >
            {copied ? (
              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            ) : (
              <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6"
              >
                <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isUser ? "end" : "start"}>
              <DropdownMenuItem>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!isUser && (
                <DropdownMenuItem>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Regenerate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            "text-xs text-muted-foreground px-1",
            isUser && "text-right"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for code blocks
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Code block
          const code = part.slice(3, -3).trim();
          const [language, ...codeLines] = code.split("\n");
          const codeContent = codeLines.join("\n");

          return (
            <div key={index} className="relative">
              <pre className="bg-muted/50 rounded-md p-2 sm:p-3 md:p-4 overflow-x-auto text-xs sm:text-sm">
                <code>{codeContent || code}</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 sm:top-2 sm:right-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
                onClick={() =>
                  navigator.clipboard.writeText(codeContent || code)
                }
              >
                <Copy className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </Button>
            </div>
          );
        } else if (part.startsWith("`") && part.endsWith("`")) {
          // Inline code
          return (
            <code
              key={index}
              className="bg-muted/50 px-1 py-0.5 rounded text-xs sm:text-sm"
            >
              {part.slice(1, -1)}
            </code>
          );
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      })}
    </>
  );
}
