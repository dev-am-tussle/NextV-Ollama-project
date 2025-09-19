"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/context/AppContext"
import { useModels } from "@/hooks/useModels"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { ChevronDown, Check, GitCompare } from "lucide-react"

export function ChatHeader() {
  const { state } = useApp()
  const { availableModels, selectedModels, compareMode, selectModels, toggleCompareMode } = useModels()

  const selectedModelNames = selectedModels
    .map((id) => availableModels.find((model) => model.id === id)?.name)
    .filter(Boolean)

  const handleModelSelect = (modelId: string) => {
    if (compareMode) {
      // In compare mode, allow multiple selections
      if (selectedModels.includes(modelId)) {
        selectModels(selectedModels.filter((id) => id !== modelId))
      } else {
        selectModels([...selectedModels, modelId])
      }
    } else {
      // In normal mode, only one model
      selectModels([modelId])
    }
  }

  return (
    <div className="flex-shrink-0 border-b border-border bg-background">
      <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-1 min-w-0">
          {/* Model Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm md:text-base min-w-0 h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4"
              >
                <span className="font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                  {selectedModelNames.length === 1
                    ? selectedModelNames[0]
                    : selectedModelNames.length > 1
                      ? `${selectedModelNames.length} models`
                      : "Select Model"}
                </span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 sm:w-64 md:w-72">
              {availableModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className="flex items-center justify-between p-2 sm:p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{model.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{model.description}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {model.size}
                    </Badge>
                    {selectedModels.includes(model.id) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleCompareMode} className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                <span>Compare Mode</span>
                {compareMode && <Check className="h-4 w-4 text-primary ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Compare Mode Indicator */}
          {compareMode && (
            <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
              <GitCompare className="h-3 w-3" />
              <span className="hidden md:inline">Compare Mode</span>
              <span className="md:hidden">Compare</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Set Default Button */}
          {selectedModels.length === 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hidden lg:flex text-xs sm:text-sm px-2 sm:px-3"
            >
              Set as default
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
