import { useApp } from "@/components/context/AppContext"

export function useSidebar() {
  const { state, dispatch } = useApp()

  const toggleSidebar = () => {
    dispatch({ type: "TOGGLE_SIDEBAR" })
  }

  return {
    isCollapsed: state.sidebarCollapsed,
    toggleSidebar,
  }
}
