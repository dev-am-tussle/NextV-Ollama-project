"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useApp } from "@/components/context/AppContext"
import { useChatStream } from "@/hooks/useChatStream"
import { Send, Paperclip, Mic, Square, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { FileUploadModal } from "./FileUploadModal"

export function ChatInputBox() {
  const { state, dispatch } = useApp()
  const { sendMessage, isStreaming } = useChatStream()
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return

    // Create new chat if none exists
    if (!state.currentChatId) {
      const newChat = {
        id: Date.now().toString(),
        title: input.slice(0, 50) + (input.length > 50 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      dispatch({ type: "ADD_CHAT", payload: newChat })
      dispatch({ type: "SET_CURRENT_CHAT", payload: newChat.id })
    }

    const message = input.trim()
    setInput("")

    // Process shortcuts
    const processedMessage = processShortcuts(message, state.savedPrompts)
    await sendMessage(processedMessage)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const stopGeneration = () => {
    dispatch({ type: "SET_STREAMING", payload: false })
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording
  }

  return (
    <div className="flex-shrink-0 border-t border-border bg-background">
      <div className="max-w-5xl mx-auto p-2 sm:p-3 md:p-4 lg:p-6">
        {/* Uploaded Files */}
        {state.uploadedFiles.length > 0 && (
          <div className="mb-2 sm:mb-3 flex flex-wrap gap-1 sm:gap-2">
            {state.uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 sm:gap-2 bg-muted rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
              >
                <span className="truncate max-w-20 sm:max-w-24 md:max-w-32">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3 w-3 sm:h-4 sm:w-4"
                  onClick={() => dispatch({ type: "REMOVE_FILE", payload: index })}
                >
                  <Plus className="h-2 w-2 sm:h-3 sm:w-3 rotate-45" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="relative">
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 bg-muted/50 rounded-lg border border-border p-2 sm:p-3">
            {/* File Upload Button */}
            <FileUploadModal
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10"
                >
                  <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              }
            />

            {/* Text Input */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 min-h-[28px] sm:min-h-[32px] md:min-h-[40px] max-h-20 sm:max-h-24 md:max-h-32 resize-none border-none bg-transparent p-0 text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />

            {/* Voice Recording Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex-shrink-0 text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10",
                isRecording && "text-red-500 hover:text-red-600",
              )}
              onClick={toggleRecording}
            >
              <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Send/Stop Button */}
            {isStreaming ? (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10"
                onClick={stopGeneration}
              >
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10",
                  input.trim() ? "text-primary hover:text-primary/80" : "text-muted-foreground cursor-not-allowed",
                )}
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>

          {/* Shortcut Hints */}
          <div className="mt-1 sm:mt-2 text-xs text-muted-foreground text-center">
            <span className="hidden sm:inline">
              Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/1</kbd>,{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/2</kbd> for saved prompts •{" "}
            </span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> for new line
          </div>
        </div>
      </div>
    </div>
  )
}

function processShortcuts(message: string, savedPrompts: any[]) {
  let processed = message

  savedPrompts.forEach((prompt) => {
    if (processed.includes(prompt.shortcut)) {
      processed = processed.replace(prompt.shortcut, prompt.content)
    }
  })

  return processed
}
