"use client"

import type React from "react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/context/AppContext"
import { Upload, ImageIcon, FileText, Eye, Download, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadModalProps {
  trigger?: React.ReactNode
  onFilesSelected?: (files: File[]) => void
}

export function FileUploadModal({ trigger, onFilesSelected }: FileUploadModalProps) {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} is too large (max 10MB)`)
        return false
      }
      return true
    })

    validFiles.forEach((file) => {
      dispatch({ type: "ADD_FILE", payload: file })
    })

    if (onFilesSelected) {
      onFilesSelected(validFiles)
    }
  }

  const removeFile = (index: number) => {
    dispatch({ type: "REMOVE_FILE", payload: index })
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return ImageIcon
    if (file.type.startsWith("text/") || file.type.includes("document")) return FileText
    return ImageIcon
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 bg-transparent">
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>File Upload & Manager</DialogTitle>
          <DialogDescription>Upload files to use in your conversations or manage existing files</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Upload New Files</h3>

            {/* Drag & Drop Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Drop files here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <input
                type="file"
                multiple
                accept="image/*,text/*,.pdf,.doc,.docx,.json,.csv"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose Files
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Max file size: 10MB</p>
            </div>

            {/* Supported Formats */}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Supported formats:</p>
              <div className="flex flex-wrap gap-1">
                {["Images", "Text", "PDF", "Word", "JSON", "CSV"].map((format) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* File Manager */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Uploaded Files ({state.uploadedFiles.length})</h3>
              {state.uploadedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear all files
                    state.uploadedFiles.forEach((_, index) => {
                      dispatch({ type: "REMOVE_FILE", payload: 0 })
                    })
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {state.uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.uploadedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file)
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <Badge className={cn("text-xs", getFileTypeColor(file))}>
                              {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {file.type.startsWith("image/") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPreviewFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const url = URL.createObjectURL(file)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = file.name
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>Done</Button>
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
