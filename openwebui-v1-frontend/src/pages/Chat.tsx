import React, { useState, useEffect, useMemo } from "react";
import { GitCompare } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  listConversations,
  createConversation,
  getMessages as fetchMessages,
  postMessage,
} from "@/services/conversation";
import { streamGenerate } from "@/services/ollama";
import { ModelKey, modelIcon } from "@/components/chat/model-selector";
import { ChatSidebar } from "@/components/chat/sidebar";
import { FileManagerDialog } from "@/components/chat/file-manager-dialog";
import { PromptsDialog, PromptItem } from "@/components/chat/prompts-dialog";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessagesPane } from "@/components/chat/MessagesPane";
import { Composer } from "@/components/chat/Composer";

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
  model?: string;
}

const MODEL_INFO: Record<ModelKey, { intro: string; suggestions: string[] }> = {
  Mistral: {
    intro:
      "Mistral is a fast, efficient general-purpose model. Great for concise answers & code refactors.",
    suggestions: [
      "Refactor this React component for performance",
      "Summarize this block of code",
    ],
  },
  Gemma: {
    intro: "Gemma excels at reasoning & structured generation.",
    suggestions: ["Explain this algorithm step by step"],
  },
  Phi: {
    intro: "Phi is lightweight and great for quick iterative coding tasks.",
    suggestions: ["Create a simple Express route"],
  },
  Ollama: {
    intro: "Ollama (local) lets you run models on-device.",
    suggestions: ["How to run a local LLM securely"],
  },
};

const Chat: React.FC = () => {
  const { isAuthenticated, user, logout: signout, loading } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
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

  // Redirect to home if not auth'd (after auth init)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/home";
    }
  }, [loading, isAuthenticated]);

  // Load conversations only after auth is initialized and user is authenticated
  useEffect(() => {
    if (loading) return; // wait until auth init completes
    if (!isAuthenticated) return;

    let mounted = true;
    (async () => {
      try {
        const convs: any = await listConversations(50);
        if (!mounted) return;
        const mapped = (convs || []).map((c: any) => ({
          id: c._id,
          // Coerce title to string to avoid objects being rendered
          title: String(c.title || "New Chat"),
          messages: [],
          updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
        }));
        setThreads(mapped);
        if (mapped.length > 0 && !activeThreadId)
          setActiveThreadId(mapped[0].id);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading, isAuthenticated]);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  // Create a new local-only thread. Backend conversation will be created when the
  // user sends the first message in that thread.
  const createNewThread = (title?: string) => {
    const id = `local-${Date.now()}`;
    const t: ChatThread = {
      id,
      // ensure title is always a string
      title: String(title || "New Chat"),
      messages: [],
      updatedAt: new Date(),
      model: selectedModel,
    };
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
  };

  // Fetch messages for a conversation when a persisted (non-local) thread is active
  useEffect(() => {
    if (!activeThreadId) return;

    // If this is a local-only thread (created in frontend but not persisted yet),
    // skip fetching messages from backend until it is persisted.
    if (String(activeThreadId).startsWith("local-")) return;

    let mounted = true;
    (async () => {
      try {
        const msgs: any = await fetchMessages(activeThreadId, 200);
        if (!mounted) return;
        const mapped = (msgs || []).map((m: any) => ({
          id: m._id || String(m._id || Date.now()),
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text || m.content || "",
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }));
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId ? { ...t, messages: mapped } : t
          )
        );
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeThreadId]);

  const shareCurrentChat = async () => {
    // share/quick-send current composer text
    await handleSend();
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleSend = async (text?: string) => {
    const sendText = text ?? message;
    if (!sendText.trim() || isStreaming) return;

    let currentThreadId = activeThreadId;
    // If there is no active thread, or the active thread is a local-only thread
    // (created with id prefix "local-"), create/persist a backend conversation
    // and replace the local thread with the persisted one (preserve messages).
    if (!currentThreadId || String(currentThreadId).startsWith("local-")) {
      try {
        const conv = await createConversation(sendText.slice(0, 50));
        const backendId = conv._id;

        // Preserve existing messages from local thread (if any)
        const localMessages =
          threads.find((t) => t.id === currentThreadId)?.messages || [];

        // Replace local thread with backend-persisted thread (put it at top)
        const newThread: ChatThread = {
          id: backendId,
          // coerce backend title to string to be safe
          title: String(conv.title || sendText.slice(0, 50)),
          messages: localMessages,
          updatedAt: new Date(),
          model: selectedModel,
        };

        setThreads((prev) => [
          newThread,
          ...prev.filter((t) => t.id !== currentThreadId),
        ]);
        currentThreadId = backendId;
        setActiveThreadId(currentThreadId);
      } catch (err: any) {
        toast({ title: "Error", description: "Unable to create conversation" });
        return;
      }
    }

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: sendText,
      timestamp: new Date(),
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === currentThreadId
          ? { ...t, messages: [...t.messages, userMessage] }
          : t
      )
    );
    setMessage("");
    setIsStreaming(true);

    try {
      // Map our UI model keys to backend model identifiers where applicable
      const modelMap: Record<string, string | undefined> = {
        Mistral: "mistral:latest",
        Gemma: "gemma:2b",
        Phi: "phi:2.7b",
        Ollama: "gemma:2b", // use local gemma for client-side streaming path
      };
      const backendModelId = modelMap[selectedModel] || undefined;

      // If using local Ollama model (or modelId indicates streaming), use SSE streaming endpoint
      if (selectedModel === "Ollama") {
        // Append an assistant placeholder message
        const assistantId = `assistant-${Date.now()}`;
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };
        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThreadId
              ? { ...t, messages: [...t.messages, assistantMessage] }
              : t
          )
        );

        let collected = "";
        await streamGenerate(
          { prompt: sendText, modelId: "gemma:2b" },
          {
            onChunk: (chunk) => {
              collected += chunk;
              // append chunk locally to assistant message
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === currentThreadId
                    ? {
                        ...t,
                        messages: t.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: m.content + chunk }
                            : m
                        ),
                      }
                    : t
                )
              );
            },
            onError: (err) => {
              toast({
                title: "Stream error",
                description: String(err?.message || err),
              });
            },
          }
        );

        // persist the assistant message via conversation post (server will create model message)
        try {
          await postMessage(currentThreadId, collected, backendModelId);
        } catch (err: any) {
          // show an error toast but keep local content
          toast({
            title: "Persist error",
            description: err?.message || "Failed to persist assistant message",
          });
          // log server error body (apiFetch attaches it to Error.body)
          console.error(
            "postMessage persist error:",
            (err && (err as any).body) || err
          );
        }
      } else {
        const resp: any = await postMessage(
          currentThreadId,
          sendText,
          backendModelId
        );
        const assistantText = resp?.assistant?.text || "";
        const assistantMessage: Message = {
          id: resp?.assistant?.id || String(Date.now() + 1),
          role: "assistant",
          content: assistantText,
          timestamp: new Date(),
        };
        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThreadId
              ? {
                  ...t,
                  messages: [...t.messages, assistantMessage],
                  updatedAt: new Date(),
                }
              : t
          )
        );
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
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
    String(t?.title || "")
      .toLowerCase()
      .includes(chatSearch.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <ChatSidebar
          threads={filteredThreads.map((t) => ({
            id: t.id,
            // ensure title is a string
            title: String(t.title || "New Chat"),
            updatedAt: t.updatedAt,
            messagesCount: t.messages.length,
          }))}
          activeId={activeThreadId}
          onSelect={setActiveThreadId}
          onNew={createNewThread}
          onRename={(id) => {
            const title = prompt("Enter new title");
            if (title)
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === id ? { ...t, title, updatedAt: new Date() } : t
                )
              );
          }}
          onDuplicate={(id) => {
            const original = threads.find((t) => t.id === id);
            if (!original) return;
            const clone: ChatThread = {
              ...original,
              id: Date.now().toString(),
              title: original.title + " (Copy)",
              updatedAt: new Date(),
            };
            setThreads((prev) => [clone, ...prev]);
          }}
          onDelete={(id) => {
            setThreads((prev) => prev.filter((t) => t.id !== id));
            if (activeThreadId === id) setActiveThreadId(null);
          }}
          chatSearch={chatSearch}
          onChatSearch={setChatSearch}
          onOpenFiles={() => setIsFileManagerOpen(true)}
          onOpenPrompts={() => setIsPromptsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          user={user}
          onSignOut={async () => {
            try {
              await signout();
              toast({
                title: "Signed out",
                description: "You have been signed out.",
              });
            } catch (_) {
              toast({ title: "Sign out", description: "Sign out completed." });
            }
          }}
        />

        <div className="flex-1 flex flex-col">
          <ChatHeader
            // ensure title is a string to prevent React rendering objects
            title={String(activeThread?.title || "New Chat")}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            compareMode={compareMode}
            onToggleCompare={() => setCompareMode((c) => !c)}
            onShare={shareCurrentChat}
            onOpenSettings={openSettings}
          />

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
                      <button
                        key={prompt}
                        className="btn btn-outline btn-sm text-xs"
                        onClick={() => setMessage(prompt)}
                      >
                        {prompt}
                      </button>
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
              <MessagesPane
                messages={messages.map((m) => ({
                  _id: m.id,
                  text: m.content,
                  sender: m.role === "user" ? "user" : "assistant",
                  createdAt: m.timestamp,
                }))}
                userId={user?.id}
              />
            )}
          </div>

          <Composer
            onSend={async (text) => await handleSend(text)}
            selectedModel={selectedModel}
          />
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
