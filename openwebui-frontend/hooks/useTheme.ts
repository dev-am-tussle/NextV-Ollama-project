"use client"

import { useApp } from "@/components/context/AppContext"

export function useTheme() {
  const { state, dispatch } = useApp()

  const setTheme = (theme: "light" | "dark" | "system") => {
    dispatch({ type: "SET_THEME", payload: theme })
  }

  return {
    theme: state.theme,
    setTheme,
  }
}
