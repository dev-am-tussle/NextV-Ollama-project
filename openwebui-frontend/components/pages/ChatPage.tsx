"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { ChatWindow } from "@/components/layout/ChatWindow"

export function ChatPage() {
  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  )
}
