"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApp } from "@/components/context/AppContext"
import { useSidebar } from "@/hooks/useSidebar"
import {
  Menu,
  Plus,
  Search,
  MessageSquare,
  MoreHorizontal,
  Edit3,
  Trash2,
  Download,
  Settings,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FileManager } from "@/components/ui/FileManager"
import { PromptManager } from "@/components/ui/PromptManager"
import { SettingsPanel } from "@/components/ui/SettingsPanel"

export function Sidebar() {
  const { state, dispatch } = useApp()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = state.chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    dispatch({ type: "ADD_CHAT", payload: newChat })
    dispatch({ type: "SET_CURRENT_CHAT", payload: newChat.id })
  }

  const selectChat = (chatId: string) => {
    dispatch({ type: "SET_CURRENT_CHAT", payload: chatId })
  }

  const deleteChat = (chatId: string) => {
    dispatch({ type: "DELETE_CHAT", payload: chatId })
  }

  const renameChat = (chatId: string, newTitle: string) => {
    dispatch({ type: "UPDATE_CHAT", payload: { id: chatId, updates: { title: newTitle } } })
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          !isCollapsed && "opacity-100" && "block",
          isCollapsed && "opacity-0 pointer-events-none",
        )}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 lg:relative lg:z-auto",
          // Desktop behavior
          "lg:block",
          isCollapsed ? "lg:w-16" : "lg:w-80",
          // Mobile behavior - enhanced responsive widths
          "lg:translate-x-0",
          isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
          "w-72 sm:w-80 md:w-80",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-sidebar-border">
            <div className={cn("flex items-center gap-2 sm:gap-3", isCollapsed && "lg:justify-center")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 sm:h-9 sm:w-9"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              {!isCollapsed && (
                <h1 className="text-base sm:text-lg font-semibold text-sidebar-foreground">OpenWebUI</h1>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-3 sm:p-4">
            <Button
              onClick={createNewChat}
              className={cn(
                "w-full justify-start gap-2 sm:gap-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 h-9 sm:h-10 text-sm sm:text-base",
                isCollapsed && "lg:w-auto lg:px-2",
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>New Chat</span>}
            </Button>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 h-8 sm:h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Chat List */}
          <ScrollArea className="flex-1 px-1 sm:px-2">
            <div className="space-y-1 pb-4">
              {filteredChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={state.currentChatId === chat.id}
                  isCollapsed={isCollapsed}
                  onSelect={() => selectChat(chat.id)}
                  onDelete={() => deleteChat(chat.id)}
                  onRename={(newTitle) => renameChat(chat.id, newTitle)}
                />
              ))}
            </div>
          </ScrollArea>

          {/* User Profile */}
          <div className="border-t border-sidebar-border p-3 sm:p-4">
            {!isCollapsed && (
              <div className="space-y-2 mb-3 sm:mb-4">
                <FileManager />
                <PromptManager />
                <SettingsPanel />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 sm:gap-3 h-auto p-2 sm:p-3 text-sidebar-foreground hover:bg-sidebar-accent",
                    isCollapsed && "lg:w-auto lg:px-3",
                  )}
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage src="/diverse-user-avatars.png" />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">U</AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">User</div>
                      <div className="text-xs text-sidebar-foreground/70">user@example.com</div>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  )
}

interface ChatItemProps {
  chat: any
  isActive: boolean
  isCollapsed: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}

function ChatItem({ chat, isActive, isCollapsed, onSelect, onDelete, onRename }: ChatItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chat.title)

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== chat.title) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename()
    } else if (e.key === "Escape") {
      setEditTitle(chat.title)
      setIsEditing(false)
    }
  }

  if (isCollapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onSelect}
        className={cn("w-full h-10 text-sidebar-foreground hover:bg-sidebar-accent", isActive && "bg-sidebar-accent")}
        title={chat.title}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
        "text-sidebar-foreground hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent",
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0" />

      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="flex-1 h-6 px-1 py-0 text-sm bg-transparent border-none focus:ring-1 focus:ring-sidebar-ring"
          autoFocus
        />
      ) : (
        <span className="flex-1 truncate">{chat.title}</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download className="mr-2 h-4 w-4" />
            Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
