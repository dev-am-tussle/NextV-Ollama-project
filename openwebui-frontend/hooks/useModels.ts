import { useApp } from "@/components/context/AppContext"

export function useModels() {
  const { state, dispatch } = useApp()

  const selectModels = (modelIds: string[]) => {
    dispatch({ type: "SELECT_MODELS", payload: modelIds })
  }

  const toggleCompareMode = () => {
    dispatch({ type: "TOGGLE_COMPARE_MODE" })
  }

  return {
    availableModels: state.availableModels,
    selectedModels: state.selectedModels,
    compareMode: state.compareMode,
    selectModels,
    toggleCompareMode,
  }
}
