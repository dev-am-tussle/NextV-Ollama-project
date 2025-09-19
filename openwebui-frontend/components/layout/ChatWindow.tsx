"use client"

import { useApp } from "@/components/context/AppContext"
import { ChatHeader } from "./ChatHeader"
import { ChatPromo } from "@/components/ui/ChatPromo"
import { ChattingWindow } from "@/components/ui/ChattingWindow"
import { ChatInputBox } from "@/components/ui/ChatInputBox"

export function ChatWindow() {
  const { state } = useApp()

  const currentChat = state.chats.find((chat) => chat.id === state.currentChatId)

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader />

      <div className="flex-1 min-h-0 flex flex-col">
        {currentChat && currentChat.messages.length > 0 ? <ChattingWindow chat={currentChat} /> : <ChatPromo />}
      </div>

      <ChatInputBox />
    </div>
  )
}
