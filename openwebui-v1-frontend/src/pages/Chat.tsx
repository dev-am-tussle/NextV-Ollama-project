import React, { useState, useEffect, useMemo, useRef } from "react";
import { GitCompare } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  listConversations,
  createConversation,
  getMessages as fetchMessages,
  postMessage,
  deleteConversation,
} from "@/services/conversation";
import {
  createSavedPrompt,
  deleteSavedPrompt,
  updateSavedPrompt,
} from "@/services/savedPrompts";
// streaming handled via hook now
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
import { useChatMessaging } from "@/hooks/useChatMessaging";
import { ChatStatusBar } from "@/components/chat/ChatStatusBar";
import ChatGeneratingOverlay from "@/components/chat/ChatGeneratingOverlay";

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
    refreshSavedPrompts,
  } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  // isStreaming managed inside useChatMessaging
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

  const { sendMessage, isStreaming, status, abort } = useChatMessaging({
    selectedModel,
    setThreads,
    setActiveThreadId,
    toast: (o) =>
      toast({
        title: o.title,
        description: o.description,
        variant: o.variant === "destructive" ? "destructive" : "default",
      }),
  });

  const handleSend = async (text?: string) => {
    const sendText = text ?? message;
    if (!sendText.trim()) return;
    setMessage("");
    await sendMessage(sendText, activeThreadId, threads);
  };

  const handleSavePrompt = async (messageId: string, content: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please login to save prompts",
        variant: "destructive",
      });
      return;
    }

    try {
      const title =
        content.length > 50 ? content.slice(0, 47) + "..." : content;
      await createSavedPrompt(title, content);

      toast({
        title: "Prompt Saved",
        description: "Your prompt has been saved successfully!",
      });

      // Refresh saved prompts to show in real-time
      await refreshSavedPrompts();
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle when user selects a saved prompt - fill it into message input
  const handleSelectPrompt = (prompt: PromptItem) => {
    setMessage(prompt.content);
    // Optionally auto-focus the input field
    setTimeout(() => {
      const textareaElements = document.querySelectorAll("textarea");
      const messageTextarea = Array.from(textareaElements).find(
        (el) =>
          el.placeholder?.includes("message") ||
          el.placeholder?.includes("Send")
      );
      messageTextarea?.focus();
    }, 100);
  };

  // Handle copying prompt content
  const handleCopyPrompt = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Prompt content copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle editing saved prompt
  const handleEditPrompt = async (
    id: string,
    title: string,
    content: string
  ) => {
    try {
      await updateSavedPrompt(id, { title, prompt: content });
      toast({
        title: "Prompt Updated",
        description: "Your prompt has been updated successfully!",
      });
      // Refresh saved prompts to show updated content
      await refreshSavedPrompts();
    } catch (error) {
      console.error("Failed to update prompt:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting saved prompt
  const handleDeletePrompt = async (id: string) => {
    try {
      await deleteSavedPrompt(id);
      toast({
        title: "Prompt Deleted",
        description: "Your prompt has been deleted successfully!",
      });
      // Refresh saved prompts to remove from list
      await refreshSavedPrompts();
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting conversation/chat
  const handleDeleteConversation = async (id: string) => {
    // Get conversation title for confirmation
    const conversation = threads.find((t) => t.id === id);
    const conversationTitle = conversation?.title || "this chat";

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${conversationTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Optimistic update - remove from frontend immediately
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
      }

      // Only call API if it's a backend conversation (not local)
      if (!id.startsWith("local-")) {
        await deleteConversation(id);
      }

      toast({
        title: "Chat Deleted",
        description: "Your chat has been deleted successfully!",
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);

      // Revert optimistic update on error
      try {
        const convs = await listConversations(50);
        const mapped = (Array.isArray(convs) ? convs : []).map((c) => {
          const obj = c as Record<string, unknown>;
          return {
            id: String(obj._id),
            title: String(obj.title || "New Chat"),
            messages: [],
            updatedAt: obj.updated_at
              ? new Date(String(obj.updated_at))
              : new Date(),
          };
        });
        setThreads(mapped);
      } catch (revertError) {
        console.error(
          "Failed to revert threads after delete error:",
          revertError
        );
      }

      toast({
        title: "Delete Failed",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredSuggestions = MODEL_INFO[selectedModel].suggestions.filter(
    (s) => s.toLowerCase().includes(suggestionSearch.toLowerCase())
  );

  const prompts: PromptItem[] = useMemo(() => {
    console.log("[Chat] authSavedPrompts:", authSavedPrompts);
    if (Array.isArray(authSavedPrompts) && authSavedPrompts.length > 0) {
      const mapped = authSavedPrompts.map((p: any, idx: number) => ({
        id: String(p._id || p.id || `ap-${idx}`),
        title: String(p.title || p.name || "Untitled Prompt"),
        content: String(p.content || p.prompt || ""),
      }));
      console.log("[Chat] Mapped prompts:", mapped);
      return mapped;
    }
    // No fallback defaults per user request
    console.log("[Chat] No saved prompts found");
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

  // Scroll management for messages
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Auto-scroll on new message append (when user or assistant messages length changes)
    bottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
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
          onDelete={handleDeleteConversation}
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

        <div className="flex-1 flex flex-col min-h-0">
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

          {/* Scrollable messages region only */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto p-6 relative"
          >
            {compareMode && (
              <div className="mb-4 p-3 text-xs rounded-md border bg-muted/30 flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> Compare Mode active.
                Responses would be shown side-by-side (UI placeholder).
              </div>
            )}

            <div className="relative min-h-full">
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
                    id: m.id,
                    text: m.content,
                    sender: m.role === "user" ? "user" : "assistant",
                    createdAt: m.timestamp,
                    // flags may already exist on underlying message objects if they were added by hook
                    // (Type assertion defensive merge)
                    ...((m as any).isSkeleton
                      ? { isSkeleton: (m as any).isSkeleton }
                      : {}),
                    ...((m as any).isStreaming
                      ? { isStreaming: (m as any).isStreaming }
                      : {}),
                  }))}
                  userId={user?.id}
                  onSavePrompt={handleSavePrompt}
                />
              )}
              <div ref={bottomAnchorRef} />
              <ChatGeneratingOverlay
                active={
                  isStreaming ||
                  [
                    "creating-conversation",
                    "streaming-assistant",
                    "finalizing",
                  ].includes(status)
                }
                status={status}
              />
            </div>
          </div>

          {/* Fixed bottom input + status bar (outside scroll area) */}
          <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <Composer
              onSend={async (text) => await handleSend(text)}
              selectedModel={selectedModel}
            />
            <ChatStatusBar
              status={status}
              streaming={isStreaming}
              onAbort={abort}
            />
          </div>
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
        onSelect={handleSelectPrompt}
        onCopy={handleCopyPrompt}
        onEdit={handleEditPrompt}
        onDelete={handleDeletePrompt}
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
