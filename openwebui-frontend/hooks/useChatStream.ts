"use client"

import { useApp } from "@/components/context/AppContext"
import { useCallback } from "react"

export function useChatStream() {
  const { state, dispatch } = useApp()

  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.currentChatId) return

      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content,
        timestamp: new Date(),
      }

      dispatch({
        type: "ADD_MESSAGE",
        payload: { chatId: state.currentChatId, message: userMessage },
      })

      // Start streaming
      dispatch({ type: "SET_STREAMING", payload: true })

      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: `I received your message: "${content}". This is a simulated response from the ${state.selectedModels[0]} model.`,
          timestamp: new Date(),
        }

        dispatch({
          type: "ADD_MESSAGE",
          payload: { chatId: state.currentChatId!, message: aiMessage },
        })

        dispatch({ type: "SET_STREAMING", payload: false })
      }, 1500)
    },
    [state.currentChatId, state.selectedModels, dispatch],
  )

  return {
    sendMessage,
    isStreaming: state.isStreaming,
  }
}
