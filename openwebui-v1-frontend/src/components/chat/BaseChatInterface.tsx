import React, { useState, useEffect, useMemo, useRef } from "react";
import { GitCompare, XCircle } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { modelIcon } from "@/components/chat/categorized-model-selector";
import { ChatSidebar } from "@/components/chat/sidebar";
import { FileManagerDialog } from "@/components/chat/file-manager-dialog";
import { PromptsDialog, PromptItem } from "@/components/chat/prompts-dialog";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { PreferencesDialog } from "@/components/chat/preferences-dialog";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessagesPane } from "@/components/chat/MessagesPane";
import { Composer } from "@/components/chat/Composer";
import { useChatMessaging } from "@/hooks/useChatMessaging";
import { ChatStatusBar } from "@/components/chat/ChatStatusBar";
import ChatGeneratingOverlay from "@/components/chat/ChatGeneratingOverlay";
import { ChatServiceInterface, UserType, getModelSuggestions } from "@/services/chatService";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  modelName?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  model?: string;
}

interface BaseChatInterfaceProps {
  userType: UserType;
  chatService: ChatServiceInterface;
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  savedPrompts: any[];
  refreshSavedPrompts: () => Promise<void>;
  onSignOut: () => Promise<void>;
  headerTitle?: string;
  defaultModel?: string;
  onBack?: () => void;
}

const BaseChatInterface: React.FC<BaseChatInterfaceProps> = ({
  userType,
  chatService,
  user,
  isAuthenticated,
  loading,
  savedPrompts: authSavedPrompts,
  refreshSavedPrompts,
  onSignOut,
  headerTitle,
  defaultModel = "gemma:2b",
  onBack
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [compareMode, setCompareMode] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [promptSearch, setPromptSearch] = useState("");
  const [compactMode, setCompactMode] = useState(false);

  // Load conversations
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;

    const normalizeTitle = (raw: unknown): string => {
      if (typeof raw === "string") return raw.trim() || "New Chat";
      if (raw == null) return "New Chat";
      if (typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (typeof r.title === "string") return r.title || "New Chat";
        if (typeof r.name === "string") return r.name || "New Chat";
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
        const convs = await chatService.listConversations(50);
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

        setThreads(mapped);

        // Restore last active thread for this user type
        try {
          const storageKey = `lastActiveThreadId_${userType}`;
          const justLoggedIn = localStorage.getItem("authJustLoggedIn");
          if (justLoggedIn) {
            localStorage.removeItem("authJustLoggedIn");
          } else {
            const last = localStorage.getItem(storageKey);
            if (last) {
              const exists = mapped.find((m) => m.id === last);
              if (exists) setActiveThreadId(last);
            }
          }
        } catch (_) {}
      } catch (err) {
        console.error(`Error loading ${userType} conversations:`, err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading, isAuthenticated, userType, chatService]);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  const createNewThread = (title?: string) => {
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
      title: typeof title === "string" ? title : "New Chat",
      messages: [],
      updatedAt: new Date(),
      model: selectedModel,
    };
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
    try {
      const storageKey = `lastActiveThreadId_${userType}`;
      localStorage.setItem(storageKey, t.id);
    } catch (_) {}
  };

  // Fetch messages for active thread
  useEffect(() => {
    if (!activeThreadId) return;
    if (String(activeThreadId).startsWith("local-")) return;

    let mounted = true;
    (async () => {
      try {
        const msgs = await chatService.getMessages(activeThreadId, 200);
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
            modelName: obj?.model_name ? String(obj.model_name) : undefined,
          } as Message;
        });
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId ? { ...t, messages: mapped } : t
          )
        );
      } catch (err) {
        console.error(`Error loading ${userType} messages:`, err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeThreadId, chatService, userType]);

  const shareCurrentChat = async () => {
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
      await chatService.createSavedPrompt(title, content);

      toast({
        title: "Prompt Saved",
        description: "Your prompt has been saved successfully!",
      });

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

  const handleSelectPrompt = (prompt: PromptItem) => {
    setMessage(prompt.content);
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

  const handleEditPrompt = async (
    id: string,
    title: string,
    content: string
  ) => {
    try {
      await chatService.updateSavedPrompt(id, { title, prompt: content });
      toast({
        title: "Prompt Updated",
        description: "Your prompt has been updated successfully!",
      });
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

  const handleDeletePrompt = async (id: string) => {
    try {
      await chatService.deleteSavedPrompt(id);
      toast({
        title: "Prompt Deleted",
        description: "Your prompt has been deleted successfully!",
      });
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

  const handleDeleteConversation = async (id: string) => {
    const conversation = threads.find((t) => t.id === id);
    const conversationTitle = conversation?.title || "this chat";

    const confirmed = window.confirm(
      `Are you sure you want to delete "${conversationTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
      }

      if (!id.startsWith("local-")) {
        await chatService.deleteConversation(id);
      }

      toast({
        title: "Chat Deleted",
        description: "Your chat has been deleted successfully!",
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      
      try {
        const convs = await chatService.listConversations(50);
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
        console.error("Failed to revert threads after delete error:", revertError);
      }

      toast({
        title: "Delete Failed",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const modelInfo = getModelSuggestions(selectedModel, userType);
  const filteredSuggestions = modelInfo.suggestions.filter(
    (s) => s.toLowerCase().includes(suggestionSearch.toLowerCase())
  );

  const prompts: PromptItem[] = useMemo(() => {
    if (Array.isArray(authSavedPrompts) && authSavedPrompts.length > 0) {
      const mapped = authSavedPrompts.map((p: any, idx: number) => ({
        id: String(p._id || p.id || `ap-${idx}`),
        title: String(p.title || p.name || "Untitled Prompt"),
        content: String(p.content || p.prompt || ""),
      }));
      return mapped;
    }
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

  // Scroll management
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
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
            title: typeof t.title === "string" ? t.title || "New Chat" : "New Chat",
            updatedAt: t.updatedAt,
            messagesCount: t.messages.length,
          }))}
          activeId={activeThreadId}
          onSelect={(id: string) => {
            setActiveThreadId(id);
            try {
              const storageKey = `lastActiveThreadId_${userType}`;
              localStorage.setItem(storageKey, id);
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
          onSignOut={onSignOut}
          onBack={onBack}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <ChatHeader
            title={headerTitle || String(activeThread?.title || "New Chat")}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            compareMode={compareMode}
            onToggleCompare={() => setCompareMode((c) => !c)}
            onShare={shareCurrentChat}
            onOpenSettings={openSettings}
            onOpenPreferences={() => setIsPreferencesOpen(true)}
          />

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto p-6 relative custom-scrollbar"
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
                  {status === "error" ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <h3 className="text-xl font-semibold text-destructive">
                        Something went wrong
                      </h3>
                      <div className="text-muted-foreground text-sm max-w-md space-y-2">
                        <p>There was an error processing your request.</p>
                        <p>Try selecting a different model or refreshing the page.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          {modelIcon(selectedModel)}
                        </div>
                        <h3 className="text-xl font-semibold">
                          {selectedModel} Ready
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {modelInfo.intro}
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
                    </>
                  )}
                </div>
              ) : (
                <MessagesPane
                  messages={messages.map((m) => ({
                    _id: m.id,
                    id: m.id,
                    text: m.content,
                    sender: m.role === "user" ? "user" : "assistant",
                    createdAt: m.timestamp,
                    modelName: m.modelName,
                    ...((m as any).isSkeleton ? { isSkeleton: (m as any).isSkeleton } : {}),
                    ...((m as any).isStreaming ? { isStreaming: (m as any).isStreaming } : {}),
                  }))}
                  userId={user?.id}
                  onSavePrompt={handleSavePrompt}
                />
              )}
              <div ref={bottomAnchorRef} />
              <ChatGeneratingOverlay
                active={
                  isStreaming ||
                  ["creating-conversation", "streaming-assistant", "finalizing"].includes(status)
                }
                status={status}
              />
            </div>
          </div>

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
      
      <PreferencesDialog
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />
    </SidebarProvider>
  );
};

export default BaseChatInterface;