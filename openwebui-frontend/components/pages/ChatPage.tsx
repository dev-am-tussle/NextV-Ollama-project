"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { ChatWindow } from "@/components/layout/ChatWindow"

export function ChatPage() {
  return (
    <div className="h-screen flex bg-background text-foreground">
      <Sidebar />
      <ChatWindow />
    </div>
  )
}
