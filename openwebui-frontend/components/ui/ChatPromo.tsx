"use client"

import { Button } from "@/components/ui/button"
import { useApp } from "@/components/context/AppContext"
import { useModels } from "@/hooks/useModels"
import { useChatStream } from "@/hooks/useChatStream"
import { Bot, ArrowRight, Code, Lightbulb, FileText, MessageCircle } from "lucide-react"

const suggestions = [
  {
    title: "Code Review",
    subtitle: "Get feedback on your code",
    icon: Code,
    prompt: "Please review this code and suggest improvements:",
  },
  {
    title: "Explain Concept",
    subtitle: "Break down complex topics",
    icon: Lightbulb,
    prompt: "Please explain this concept in simple terms:",
  },
  {
    title: "Write Documentation",
    subtitle: "Create clear documentation",
    icon: FileText,
    prompt: "Help me write documentation for:",
  },
  {
    title: "Brainstorm Ideas",
    subtitle: "Generate creative solutions",
    icon: MessageCircle,
    prompt: "Let's brainstorm ideas for:",
  },
]

export function ChatPromo() {
  const { state, dispatch } = useApp()
  const { selectedModels, availableModels } = useModels()
  const { sendMessage } = useChatStream()

  const selectedModel = availableModels.find((model) => model.id === selectedModels[0])

  const handleSuggestionClick = (prompt: string) => {
    if (!state.currentChatId) {
      // Create new chat if none exists
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

    // Send the prompt
    sendMessage(prompt)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 max-w-6xl mx-auto">
      {/* Model Info */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 rounded-full bg-primary/10">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-balance">
              {selectedModel ? selectedModel.name : "OpenWebUI"}
            </h1>
            {selectedModel && (
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground text-pretty">
                {selectedModel.description} • {selectedModel.size}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-balance max-w-2xl px-2 sm:px-4">
          How can I help you today? Choose a suggestion below or start typing your own message.
        </p>
      </div>

      {/* Suggestions Grid */}
      <div className="w-full">
        <h2 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4 text-center">Suggestions</h2>

        {/* Desktop and Tablet Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-start gap-2 sm:gap-3 text-left hover:bg-accent/50 transition-colors group bg-transparent"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
            >
              <div className="flex items-center justify-between w-full">
                <suggestion.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="space-y-1">
                <div className="font-medium text-xs sm:text-sm text-balance">{suggestion.title}</div>
                <div className="text-xs text-muted-foreground text-pretty">{suggestion.subtitle}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Mobile Vertical Stack */}
        <div className="sm:hidden space-y-3">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full h-auto p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors group bg-transparent"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
            >
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <suggestion.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-balance">{suggestion.title}</div>
                <div className="text-xs text-muted-foreground text-pretty">{suggestion.subtitle}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
