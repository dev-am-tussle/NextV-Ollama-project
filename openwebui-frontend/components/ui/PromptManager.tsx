"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useApp } from "@/components/context/AppContext"
import { MessageSquare, Plus, Edit3, Trash2, Keyboard } from "lucide-react"

export function PromptManager() {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<any>(null)
  const [newPrompt, setNewPrompt] = useState({
    title: "",
    content: "",
    shortcut: "",
  })

  const handleAddPrompt = () => {
    if (newPrompt.title && newPrompt.content && newPrompt.shortcut) {
      dispatch({
        type: "ADD_PROMPT",
        payload: {
          id: Date.now().toString(),
          ...newPrompt,
        },
      })
      setNewPrompt({ title: "", content: "", shortcut: "" })
    }
  }

  const handleUpdatePrompt = () => {
    if (editingPrompt) {
      dispatch({
        type: "UPDATE_PROMPT",
        payload: {
          id: editingPrompt.id,
          updates: editingPrompt,
        },
      })
      setEditingPrompt(null)
    }
  }

  const handleDeletePrompt = (id: string) => {
    dispatch({ type: "DELETE_PROMPT", payload: id })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Prompts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Prompt Manager</DialogTitle>
          <DialogDescription>Create and manage your saved prompts with keyboard shortcuts</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Prompt</CardTitle>
              <CardDescription>Create a new prompt with a keyboard shortcut</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Code Review"
                    value={newPrompt.title}
                    onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortcut">Shortcut</Label>
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="shortcut"
                      placeholder="e.g., /cr"
                      value={newPrompt.shortcut}
                      onChange={(e) => setNewPrompt({ ...newPrompt, shortcut: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your prompt content..."
                  value={newPrompt.content}
                  onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddPrompt} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Prompt
              </Button>
            </CardContent>
          </Card>

          {/* Existing Prompts */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Saved Prompts ({state.savedPrompts.length})</h3>
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-3">
                {state.savedPrompts.map((prompt) => (
                  <Card key={prompt.id}>
                    <CardContent className="p-4">
                      {editingPrompt?.id === prompt.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={editingPrompt.title}
                              onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                              placeholder="Title"
                            />
                            <Input
                              value={editingPrompt.shortcut}
                              onChange={(e) => setEditingPrompt({ ...editingPrompt, shortcut: e.target.value })}
                              placeholder="Shortcut"
                            />
                          </div>
                          <Textarea
                            value={editingPrompt.content}
                            onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdatePrompt}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingPrompt(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{prompt.title}</h4>
                              <code className="px-2 py-1 bg-muted rounded text-xs">{prompt.shortcut}</code>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{prompt.content}</p>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingPrompt(prompt)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeletePrompt(prompt.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
