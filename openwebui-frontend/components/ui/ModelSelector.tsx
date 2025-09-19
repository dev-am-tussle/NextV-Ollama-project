"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useModels } from "@/hooks/useModels"
import { Check, Settings, Star, Download, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ModelSelector() {
  const { availableModels, selectedModels, selectModels } = useModels()
  const [open, setOpen] = useState(false)

  const handleModelToggle = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      selectModels(selectedModels.filter((id) => id !== modelId))
    } else {
      selectModels([...selectedModels, modelId])
    }
  }

  const setAsDefault = (modelId: string) => {
    // TODO: Implement default model setting
    console.log("Setting default model:", modelId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
          Manage Models
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Model Management</DialogTitle>
          <DialogDescription>Select and configure your AI models</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {availableModels.map((model) => (
              <div
                key={model.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors",
                  selectedModels.includes(model.id) ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      selectedModels.includes(model.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground",
                    )}
                    onClick={() => handleModelToggle(model.id)}
                  >
                    {selectedModels.includes(model.id) && <Check className="h-3 w-3" />}
                  </Button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{model.name}</h3>
                      {model.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {model.size}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAsDefault(model.id)}>
                    Set Default
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">{selectedModels.length} models selected</p>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
