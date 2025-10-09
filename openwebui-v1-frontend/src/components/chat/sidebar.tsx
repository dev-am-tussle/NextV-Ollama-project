import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getBrandingSettings } from "@/services/adminSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Plus,
  Folder,
  Settings,
  LogOut,
  Search,
  LayoutDashboard,
  PanelLeft,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SidebarThread {
  id: string;
  title: string;
  updatedAt: Date;
  messagesCount: number;
}

interface ChatSidebarProps {
  threads: SidebarThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  chatSearch: string;
  onChatSearch: (v: string) => void;
  onOpenFiles: () => void;
  onOpenPrompts: () => void;
  onOpenSettings: () => void;
  user: { name?: string | null; email?: string | null } | null;
  onSignOut: () => void;
  Logo?: React.ReactNode;
  onBack?: () => void; // For admin dashboard navigation
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  threads,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
  chatSearch,
  onChatSearch,
  onOpenFiles,
  onOpenPrompts,
  onOpenSettings,
  user,
  onSignOut,
  Logo,
  onBack,
}) => {
  const [brandingSettings, setBrandingSettings] = useState({
    logoName: "TussleAI",
    titleName: "Tussle - AI",
    primaryColor: "#61dafbaa",
    buttonTextColor: "#ffffff"
  });

  const { open: sidebarOpen, toggleSidebar } = useSidebar();

  useEffect(() => {
    const settings = getBrandingSettings();
    setBrandingSettings(settings);
  }, []);

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarContent>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {Logo || (
                <span style={{ color: brandingSettings.primaryColor }} onClick={() => toggleSidebar()} className="cursor-pointer">
                  {sidebarOpen ? brandingSettings.logoName : brandingSettings.logoName.slice(0, 2)}
                </span>
              )}
            </div>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {sidebarOpen && (
            <>
              <Button onClick={onNew} className="w-full justify-start btn-brand" size="sm">
                <Plus className="mr-2 h-4 w-4" /> New Chat
              </Button>
              <div className="relative">
                <Input
                  placeholder="Search chats..."
                  value={chatSearch}
                  onChange={(e) => onChatSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </>
          )}

          {!sidebarOpen && (
            <div className="space-y-2">
              <Button onClick={onNew} variant="ghost" size="icon" className="w-full" title="New Chat">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
            <SidebarGroupContent className="custom-scrollbar">
              <SidebarMenu>
                {threads.map((t) => (
                  <SidebarMenuItem key={t.id} className="group">
                    <div className="flex items-center w-full">
                      <SidebarMenuButton
                        onClick={() => onSelect(t.id)}
                        isActive={activeId === t.id}
                        className="flex-1 justify-start text-left"
                      >
                        <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40 bg-popover border border-border"
                        >
                          <DropdownMenuItem
                            onClick={() => onRename(t.id)}
                            className="flex gap-2"
                          >
                            <Edit2 className="h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDuplicate(t.id)}
                            className="flex gap-2"
                          >
                            <Copy className="h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(t.id)}
                            className="flex gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-4 border-t space-y-1 text-sm">
          {/* Dashboard Button (replaces Settings for admin) */}
          {onBack && (
            <Button
              variant="ghost"
              size={sidebarOpen ? "sm" : "icon"}
              className={cn(
                sidebarOpen ? "w-full justify-start" : "w-full justify-center",
              )}
              onClick={onBack}
              title={sidebarOpen ? undefined : "Dashboard"}
            >
              <LayoutDashboard className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
              {sidebarOpen && "Dashboard"}
            </Button>
          )}

          <Button
            variant="ghost"
            size={sidebarOpen ? "sm" : "icon"}
            className={cn(
              sidebarOpen ? "w-full justify-start" : "w-full justify-center",
            )}
            onClick={onOpenFiles}
            title={sidebarOpen ? undefined : "File Manager"}
          >
            <Folder className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
            {sidebarOpen && "File Manager"}
          </Button>

          <Button
            variant="ghost"
            size={sidebarOpen ? "sm" : "icon"}
            className={cn(
              sidebarOpen ? "w-full justify-start" : "w-full justify-center",
            )}
            onClick={onOpenPrompts}
            title={sidebarOpen ? undefined : "Prompts"}
          >
            <MessageSquare className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
            {sidebarOpen && "Prompts"}
          </Button>

          {/* Show Settings only if not admin (no onBack) */}
          {!onBack && (
            <Button
              variant="ghost"
              size={sidebarOpen ? "sm" : "icon"}
              className={cn(
                sidebarOpen ? "w-full justify-start" : "w-full justify-center",
              )}
              onClick={onOpenSettings}
              title={sidebarOpen ? undefined : "Settings"}
            >
              <Settings className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
              {sidebarOpen && "Settings"}
            </Button>
          )}

          <div className={cn(
            "pt-2 border-t mt-2 flex items-center gap-2",
            !sidebarOpen && "flex-col gap-1"
          )}>
            {sidebarOpen ? (
              <>
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    {user?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={onSignOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    {user?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={onSignOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
