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
import {
  ModelKey,
  modelIcon,
  keyToBackend,
} from "@/components/chat/model-selector";
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
  Gemma: {
    intro: "Gemma excels at reasoning & structured generation.",
    suggestions: ["Explain this algorithm step by step"],
  },
  Phi: {
    intro: "Phi is lightweight and great for quick iterative coding tasks.",
    suggestions: ["Create a simple Express route"],
  },
};

const Chat: React.FC = () => {
  const {
    isAuthenticated,
    user,
    logout: signout,
    loading,
    savedPrompts: authSavedPrompts,
    stats,
  } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("Gemma");
  const [compareMode, setCompareMode] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [promptSearch, setPromptSearch] = useState("");
  const [compactMode, setCompactMode] = useState(false);

  // Route protection handled by ProtectedRoute wrapper; no redirect here now.

  // Load conversations only after auth is initialized and user is authenticated
  useEffect(() => {
    if (loading) return; // wait until auth init completes
    if (!isAuthenticated) return;

    // Helper to normalize any possible shape of title coming from backend or accidental object assignment
    const normalizeTitle = (raw: unknown): string => {
      if (typeof raw === "string") return raw.trim() || "New Chat";
      if (raw == null) return "New Chat";
      if (typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (typeof r.title === "string") return r.title || "New Chat";
        if (typeof r.name === "string") return r.name || "New Chat";
        // Last resort stringify (avoid huge strings)
        try {
          const json = JSON.stringify(raw);
          return json.length > 60 ? json.slice(0, 57) + "..." : json;
        } catch (_) {
          return "New Chat";
        }
      }
      return String(raw || "New Chat");
    };

    let mounted = true;
    (async () => {
      try {
        const convs = (await listConversations(50)) as unknown;
        if (!mounted) return;
        const mapped = (Array.isArray(convs) ? convs : []).map((c) => {
          const obj = c as Record<string, unknown>;
          return {
            id: String(obj._id),
            title: normalizeTitle(obj.title),
            messages: [],
            updatedAt: obj.updated_at
              ? new Date(String(obj.updated_at))
              : new Date(),
          };
        });

        // Log any suspicious titles (only in development to avoid noise in prod)
        if (process.env.NODE_ENV !== "production") {
          mapped.forEach((m) => {
            // Heuristic: title that looks like JSON object or default Object toString
            if (
              m.title.startsWith("{") ||
              m.title.startsWith("[object Object")
            ) {
              console.warn(
                "Non-string or object-like conversation title received, normalized to:",
                m.title
              );
            }
          });
        }
        // Set the threads list but do NOT auto-select an existing conversation.
        // This ensures all users (new or existing) see the "new chat" intro
        // and can choose to resume an existing conversation from the sidebar.
        setThreads(mapped);

        // Restore last active thread from localStorage unless the user just logged in
        try {
          const justLoggedIn = localStorage.getItem("authJustLoggedIn");
          if (justLoggedIn) {
            // clear the flag so subsequent refreshes will restore
            localStorage.removeItem("authJustLoggedIn");
          } else {
            const last = localStorage.getItem("lastActiveThreadId");
            if (last) {
              // only restore if it exists in mapped list
              const exists = mapped.find((m) => m.id === last);
              if (exists) setActiveThreadId(last);
            }
          }
        } catch (_) {}
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
    // activeThreadId intentionally omitted: we only want to load conversations once after auth ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated]);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  // Create a new local-only thread. Backend conversation will be created when the
  // user sends the first message in that thread.
  const createNewThread = (title?: string) => {
    // Guard: if there is already an unsaved local thread (id starts with local-) with no messages
    // keep user on that thread instead of creating another redundant empty chat
    const existingLocal = threads.find(
      (t) => t.id.startsWith("local-") && t.messages.length === 0
    );
    if (existingLocal) {
      setActiveThreadId(existingLocal.id);
      return;
    }
    const id = `local-${Date.now()}`;
    const t: ChatThread = {
      id,
      // ensure title is always a string (avoid accidental object)
      title: typeof title === "string" ? title : "New Chat",
      messages: [],
      updatedAt: new Date(),
      model: selectedModel,
    };
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
    try {
      localStorage.setItem("lastActiveThreadId", t.id);
    } catch (_) {}
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
        const msgs = (await fetchMessages(activeThreadId, 200)) as unknown;
        if (!mounted) return;
        const mapped = (Array.isArray(msgs) ? msgs : []).map((m) => {
          const obj = m as Record<string, unknown>;
          const id = obj?._id ? String(obj._id) : String(Date.now());
          return {
            id,
            role: obj?.sender === "user" ? "user" : "assistant",
            content: (obj?.text as string) || (obj?.content as string) || "",
            timestamp: obj?.created_at
              ? new Date(String(obj.created_at))
              : new Date(),
          } as Message;
        });
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
      } catch (err: unknown) {
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
      // Derive backend model id from the single source `keyToBackend`.
      const backendModelId = keyToBackend[selectedModel] || undefined;

      // If using the local streaming model (Gemma maps to ollama local gemma:2b),
      // use the SSE streaming endpoint. We check by UI key to avoid string-case bugs.
      if (selectedModel === "Gemma") {
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
        console.debug("Starting streamGenerate", {
          conversationId: currentThreadId,
          model: backendModelId,
        });
        await streamGenerate(
          { prompt: sendText, modelId: backendModelId || "gemma:2b" },
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
        } catch (err: unknown) {
          // show an error toast but keep local content
          toast({
            title: "Persist error",
            description:
              (err as Error)?.message || "Failed to persist assistant message",
          });
          // log server error body (apiFetch attaches it to Error.body)
          console.error("postMessage persist error:", err);
        }
      } else {
        const respUnknown = await postMessage(
          currentThreadId,
          sendText,
          backendModelId
        );
        interface PostMessageResp {
          assistant?: { id?: string; text?: string };
          [k: string]: unknown;
        }
        const resp = respUnknown as PostMessageResp;
        const assistantText = resp.assistant?.text || "";
        const assistantMessage: Message = {
          id: resp.assistant?.id || String(Date.now() + 1),
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
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const filteredSuggestions = MODEL_INFO[selectedModel].suggestions.filter(
    (s) => s.toLowerCase().includes(suggestionSearch.toLowerCase())
  );

  const prompts: PromptItem[] = useMemo(() => {
    if (Array.isArray(authSavedPrompts) && authSavedPrompts.length > 0) {
      return authSavedPrompts.map((p: any, idx: number) => ({
        id: String(p._id || p.id || `ap-${idx}`),
        title: String(p.title || p.name || "Untitled Prompt"),
        content: String(p.content || p.prompt || ""),
      }));
    }
    // No fallback defaults per user request
    return [];
  }, [authSavedPrompts]);

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
            title:
              typeof t.title === "string" ? t.title || "New Chat" : "New Chat",
            updatedAt: t.updatedAt,
            messagesCount: t.messages.length,
          }))}
          activeId={activeThreadId}
          onSelect={(id: string) => {
            setActiveThreadId(id);
            try {
              localStorage.setItem("lastActiveThreadId", id);
            } catch (_) {}
          }}
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
        files={(() => {
          try {
            const raw = localStorage.getItem("authProfile");
            if (!raw) return [];
            const profile = JSON.parse(raw);
            const arr = profile?.saved_files || profile?.files || [];
            if (!Array.isArray(arr)) return [];
            return arr.map((f: any, idx: number) => ({
              id: String(f._id || f.id || idx),
              name: String(f.name || f.filename || f.originalName || "Unnamed"),
              size: typeof f.size === "number" ? f.size : undefined,
              createdAt: f.created_at || f.createdAt || undefined,
            }));
          } catch (_) {
            return [];
          }
        })()}
        totalSizeBytes={(() => {
          try {
            const raw = localStorage.getItem("authProfile");
            if (!raw) return null;
            const profile = JSON.parse(raw);
            const arr = profile?.saved_files || profile?.files || [];
            if (!Array.isArray(arr)) return null;
            const total = arr.reduce(
              (acc: number, f: any) =>
                acc + (typeof f.size === "number" ? f.size : 0),
              0
            );
            return total;
          } catch (_) {
            return null;
          }
        })()}
      />
      <PromptsDialog
        open={isPromptsOpen}
        onOpenChange={setIsPromptsOpen}
        search={promptSearch}
        onSearch={setPromptSearch}
        prompts={prompts}
        savedCount={
          stats && typeof stats.saved_prompts_count === "number"
            ? stats.saved_prompts_count
            : Array.isArray(authSavedPrompts)
            ? authSavedPrompts.length
            : null
        }
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
