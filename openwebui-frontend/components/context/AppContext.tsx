"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"

// Types
interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Model {
  id: string
  name: string
  description: string
  size: string
  isDefault?: boolean
}

interface AppState {
  // UI State
  sidebarCollapsed: boolean
  theme: "light" | "dark" | "system"

  // Chat State
  currentChatId: string | null
  chats: Chat[]
  isStreaming: boolean

  // Model State
  availableModels: Model[]
  selectedModels: string[]
  compareMode: boolean

  // Settings
  temperature: number
  maxTokens: number

  // Files
  uploadedFiles: File[]

  // Prompts
  savedPrompts: SavedPrompt[]
}

interface SavedPrompt {
  id: string
  title: string
  content: string
  shortcut: string
}

type AppAction =
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_THEME"; payload: "light" | "dark" | "system" }
  | { type: "SET_CURRENT_CHAT"; payload: string | null }
  | { type: "ADD_CHAT"; payload: Chat }
  | { type: "UPDATE_CHAT"; payload: { id: string; updates: Partial<Chat> } }
  | { type: "DELETE_CHAT"; payload: string }
  | { type: "ADD_MESSAGE"; payload: { chatId: string; message: Message } }
  | { type: "SET_STREAMING"; payload: boolean }
  | { type: "SET_MODELS"; payload: Model[] }
  | { type: "SELECT_MODELS"; payload: string[] }
  | { type: "TOGGLE_COMPARE_MODE" }
  | { type: "UPDATE_SETTINGS"; payload: { temperature?: number; maxTokens?: number } }
  | { type: "ADD_FILE"; payload: File }
  | { type: "REMOVE_FILE"; payload: number }
  | { type: "ADD_PROMPT"; payload: SavedPrompt }
  | { type: "UPDATE_PROMPT"; payload: { id: string; updates: Partial<SavedPrompt> } }
  | { type: "DELETE_PROMPT"; payload: string }

const initialState: AppState = {
  sidebarCollapsed: false,
  theme: "dark",
  currentChatId: null,
  chats: [
    {
      id: "1",
      title: "Welcome Chat",
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  isStreaming: false,
  availableModels: [
    { id: "llama3.2", name: "Llama 3.2", description: "Latest Llama model", size: "3B" },
    { id: "codellama", name: "Code Llama", description: "Specialized for coding", size: "7B" },
    { id: "mistral", name: "Mistral 7B", description: "Fast and efficient", size: "7B", isDefault: true },
  ],
  selectedModels: ["mistral"],
  compareMode: false,
  temperature: 0.7,
  maxTokens: 2048,
  uploadedFiles: [],
  savedPrompts: [
    { id: "1", title: "Code Review", content: "Please review this code and suggest improvements:", shortcut: "/1" },
    { id: "2", title: "Explain Concept", content: "Please explain this concept in simple terms:", shortcut: "/2" },
  ],
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }

    case "SET_THEME":
      return { ...state, theme: action.payload }

    case "SET_CURRENT_CHAT":
      return { ...state, currentChatId: action.payload }

    case "ADD_CHAT":
      return { ...state, chats: [...state.chats, action.payload] }

    case "UPDATE_CHAT":
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.id ? { ...chat, ...action.payload.updates } : chat,
        ),
      }

    case "DELETE_CHAT":
      return {
        ...state,
        chats: state.chats.filter((chat) => chat.id !== action.payload),
        currentChatId: state.currentChatId === action.payload ? null : state.currentChatId,
      }

    case "ADD_MESSAGE":
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                messages: [...chat.messages, action.payload.message],
                updatedAt: new Date(),
              }
            : chat,
        ),
      }

    case "SET_STREAMING":
      return { ...state, isStreaming: action.payload }

    case "SET_MODELS":
      return { ...state, availableModels: action.payload }

    case "SELECT_MODELS":
      return { ...state, selectedModels: action.payload }

    case "TOGGLE_COMPARE_MODE":
      return { ...state, compareMode: !state.compareMode }

    case "UPDATE_SETTINGS":
      return { ...state, ...action.payload }

    case "ADD_FILE":
      return { ...state, uploadedFiles: [...state.uploadedFiles, action.payload] }

    case "REMOVE_FILE":
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter((_, index) => index !== action.payload),
      }

    case "ADD_PROMPT":
      return { ...state, savedPrompts: [...state.savedPrompts, action.payload] }

    case "UPDATE_PROMPT":
      return {
        ...state,
        savedPrompts: state.savedPrompts.map((prompt) =>
          prompt.id === action.payload.id ? { ...prompt, ...action.payload.updates } : prompt,
        ),
      }

    case "DELETE_PROMPT":
      return {
        ...state,
        savedPrompts: state.savedPrompts.filter((prompt) => prompt.id !== action.payload),
      }

    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Theme persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null
    if (savedTheme) {
      dispatch({ type: "SET_THEME", payload: savedTheme })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("theme", state.theme)

    // Apply theme to document
    const root = document.documentElement
    if (state.theme === "dark") {
      root.classList.add("dark")
    } else if (state.theme === "light") {
      root.classList.remove("dark")
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }, [state.theme])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

// Export types for use in other components
export type { Chat, Message, Model, SavedPrompt, AppState, AppAction }
