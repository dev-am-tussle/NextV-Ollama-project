"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/context/AppContext"
import { FolderOpen, Search, File, ImageIcon, FileText, Download, Trash2, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

export function FileManager() {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  const filteredFiles = state.uploadedFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return ImageIcon
    if (file.type.startsWith("text/") || file.type.includes("document")) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileTypeColor = (file: File) => {
    if (file.type.startsWith("image/")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (file.type.startsWith("text/")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    if (file.type.includes("pdf")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }

  const toggleFileSelection = (index: number) => {
    setSelectedFiles((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const deleteSelectedFiles = () => {
    // Sort in descending order to avoid index shifting issues
    const sortedIndices = selectedFiles.sort((a, b) => b - a)
    sortedIndices.forEach((index) => {
      dispatch({ type: "REMOVE_FILE", payload: index })
    })
    setSelectedFiles([])
  }

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTotalSize = () => {
    return state.uploadedFiles.reduce((total, file) => total + file.size, 0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          File Manager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>File Manager</DialogTitle>
          <DialogDescription>
            Manage your uploaded files • {state.uploadedFiles.length} files • {formatFileSize(getTotalSize())} total
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedFiles.length} selected</span>
                <Button variant="destructive" size="sm" onClick={deleteSelectedFiles}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* File Grid */}
          <ScrollArea className="h-[50vh] border rounded-lg p-4">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{searchQuery ? "No files found" : "No files uploaded"}</p>
                <p className="text-sm">
                  {searchQuery ? "Try adjusting your search terms" : "Upload some files to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file)
                  const isSelected = selectedFiles.includes(index)

                  return (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md",
                        isSelected ? "border-primary bg-primary/5" : "border-border",
                      )}
                      onClick={() => toggleFileSelection(index)}
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate mb-1">{file.name}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            <Badge className={cn("text-xs", getFileTypeColor(file))}>
                              {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {file.type.startsWith("image/") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewFile(file)
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadFile(file)
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                dispatch({ type: "REMOVE_FILE", payload: index })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>

        {/* Image Preview Modal */}
        {previewFile && previewFile.type.startsWith("image/") && (
          <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{previewFile.name}</DialogTitle>
                <DialogDescription>{formatFileSize(previewFile.size)}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={URL.createObjectURL(previewFile) || "/placeholder.svg"}
                  alt={previewFile.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
