import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useApp } from "@/providers/AppProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Send,
  Square,
  Paperclip,
  User,
  Copy,
  Check,
  GitCompare,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  ModelSelector,
  modelIcon,
  ModelKey,
} from "@/components/chat/model-selector";
import { ChatSidebar } from "@/components/chat/sidebar";
import { FileManagerDialog } from "@/components/chat/file-manager-dialog";
import { PromptsDialog, PromptItem } from "@/components/chat/prompts-dialog";
import { SettingsDialog } from "@/components/chat/settings-dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  model?: string; // model used for this thread
}

// ModelKey imported from component

const MODEL_INFO: Record<ModelKey, { intro: string; suggestions: string[] }> = {
  Mistral: {
    intro:
      "Mistral is a fast, efficient general-purpose model. Great for concise answers & code refactors.",
    suggestions: [
      "Refactor this React component for performance",
      "Summarize this block of code",
      "Generate unit tests for a TypeScript function",
      "Explain JavaScript event loop",
    ],
  },
  Gemma: {
    intro:
      "Gemma excels at reasoning & structured generation. Use it for explanations & multi-step logic.",
    suggestions: [
      "Explain this algorithm step by step",
      "Design a database schema for an e-commerce app",
      "Compare REST vs GraphQL",
      "Generate a migration plan",
    ],
  },
  Phi: {
    intro:
      "Phi is lightweight and great for quick iterative coding tasks & rapid prototyping.",
    suggestions: [
      "Create a simple Express route",
      "Optimize this loop in Python",
      "Give me a regex for email validation",
      "Convert this callback code to async/await",
    ],
  },
  Ollama: {
    intro:
      "Ollama (local) lets you run models on-device. Ideal for privacy-sensitive or offline workflows.",
    suggestions: [
      "How to run a local LLM securely",
      "Generate a bash script to automate backups",
      "Draft a README introduction",
      "Suggest improvements to this prompt",
    ],
  },
};

const Chat = () => {
  const { isAuthenticated, user, signout } = useApp();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("Mistral");
  const [compareMode, setCompareMode] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [promptSearch, setPromptSearch] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    window.location.href = "/home";
    return null;
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewThread = () => {
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      updatedAt: new Date(),
      model: selectedModel,
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;

    let currentThreadId = activeThreadId;

    // Create new thread if none exists
    if (!currentThreadId) {
      const newThread: ChatThread = {
        id: Date.now().toString(),
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        messages: [],
        updatedAt: new Date(),
        model: selectedModel,
      };
      setThreads((prev) => [newThread, ...prev]);
      currentThreadId = newThread.id;
      setActiveThreadId(currentThreadId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    // Add user message
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === currentThreadId
          ? {
              ...thread,
              messages: [...thread.messages, userMessage],
              updatedAt: new Date(),
              title:
                thread.messages.length === 0
                  ? message.slice(0, 50) + (message.length > 50 ? "..." : "")
                  : thread.title,
            }
          : thread
      )
    );

    setMessage("");
    setIsStreaming(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Model (${selectedModel}) understands you're asking about: "${message}"\n\nThis is a mock response. In a real implementation, this would call your backend with the selected model${
          compareMode ? " (compare mode active)" : ""
        }.`,
        timestamp: new Date(),
      };

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: [...thread.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : thread
        )
      );
      setIsStreaming(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSend(e);
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard.",
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy message.",
        variant: "destructive",
      });
    }
  };

  // Initialize with a new thread
  useEffect(() => {
    if (threads.length === 0) {
      createNewThread();
    }
  }, [threads.length]);

  // Thread operations
  const renameThread = (id: string) => {
    const title = prompt("Enter new title");
    if (title) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, title, updatedAt: new Date() } : t
        )
      );
    }
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeThreadId === id) setActiveThreadId(null);
  };

  const duplicateThread = (id: string) => {
    const original = threads.find((t) => t.id === id);
    if (!original) return;
    const clone: ChatThread = {
      ...original,
      id: Date.now().toString(),
      title: original.title + " (Copy)",
      updatedAt: new Date(),
    };
    setThreads((prev) => [clone, ...prev]);
  };

  const filteredSuggestions = MODEL_INFO[selectedModel].suggestions.filter(
    (s) => s.toLowerCase().includes(suggestionSearch.toLowerCase())
  );

  const prompts: PromptItem[] = useMemo(
    () => [
      {
        id: "p1",
        title: "Brainstorm feature ideas",
        content:
          "Act as a senior engineer and brainstorm new feature ideas for a SaaS dashboard.",
      },
      {
        id: "p2",
        title: "Explain code",
        content: "Explain what this code does and potential edge cases.",
      },
      {
        id: "p3",
        title: "Optimize query",
        content: "Suggest optimizations for this SQL query.",
      },
    ],
    []
  );

  const filteredPrompts = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(promptSearch.toLowerCase()) ||
      p.content.toLowerCase().includes(promptSearch.toLowerCase())
  );

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  // modelIcon imported

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <ChatSidebar
          threads={filteredThreads.map((t) => ({
            id: t.id,
            title: t.title,
            updatedAt: t.updatedAt,
            messagesCount: t.messages.length,
          }))}
          activeId={activeThreadId}
          onSelect={setActiveThreadId}
          onNew={createNewThread}
          onRename={renameThread}
          onDuplicate={duplicateThread}
          onDelete={deleteThread}
          chatSearch={chatSearch}
          onChatSearch={setChatSearch}
          onOpenFiles={() => setIsFileManagerOpen(true)}
          onOpenPrompts={() => setIsPromptsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          user={user}
          onSignOut={signout}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <ModelSelector
                  selected={selectedModel}
                  onSelect={setSelectedModel}
                  compareMode={compareMode}
                  onToggleCompare={() => setCompareMode((c) => !c)}
                />
                <h1 className="font-semibold hidden md:block">
                  {activeThread?.title || "New Chat"}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.name?.[0]?.toUpperCase() ||
                          user?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-popover border border-border"
                >
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    <span>{user?.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-6">
            {compareMode && (
              <div className="mb-4 p-3 text-xs rounded-md border bg-muted/30 flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> Compare Mode active.
                Responses would be shown side-by-side (UI placeholder).
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-2xl mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    {modelIcon(selectedModel)}
                  </div>
                  <h3 className="text-xl font-semibold">
                    {selectedModel} Ready
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {MODEL_INFO[selectedModel].intro}
                  </p>
                </div>
                <div className="w-full space-y-3">
                  <input
                    type="text"
                    value={suggestionSearch}
                    onChange={(e) => setSuggestionSearch(e.target.value)}
                    placeholder="Search suggestions..."
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  />
                  <div className="flex flex-wrap gap-2 justify-center">
                    {filteredSuggestions.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setMessage(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                    {filteredSuggestions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No suggestions found.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${
                      msg.role === "user" ? "justify-end" : ""
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          AI
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <Card
                      className={`max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : ""
                      } ${compactMode ? "p-1" : ""}`}
                    >
                      <CardContent className={compactMode ? "p-3" : "p-4"}>
                        <div className="space-y-2">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {msg.content}
                          </pre>
                          {msg.role === "assistant" && (
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(msg.content, msg.id)
                                }
                                className="h-6 w-6 p-0"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          {user?.name?.[0]?.toUpperCase() ||
                            user?.email?.[0]?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isStreaming && (
                  <div className="flex gap-4">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            AI is thinking...
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t p-4">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto">
              <div className="relative flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about coding... (Ctrl/Cmd + Enter to send)"
                    className="min-h-[60px] max-h-[200px] resize-none pr-12"
                    disabled={isStreaming}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0"
                    disabled={isStreaming}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {isStreaming ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsStreaming(false)}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!message.trim()}
                      className="btn-hover"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  Ctrl/Cmd + Enter
                </kbd>{" "}
                to send your message
              </p>
            </form>
          </div>
        </div>
      </div>
      <FileManagerDialog
        open={isFileManagerOpen}
        onOpenChange={setIsFileManagerOpen}
        search={fileSearch}
        onSearch={setFileSearch}
      />
      <PromptsDialog
        open={isPromptsOpen}
        onOpenChange={setIsPromptsOpen}
        search={promptSearch}
        onSearch={setPromptSearch}
        prompts={prompts}
        onSelect={(p) => setMessage(p.content)}
      />
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        compact={compactMode}
        onToggleCompact={() => setCompactMode((c) => !c)}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode((c) => !c)}
      />
    </SidebarProvider>
  );
};

export default Chat;
