import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Search, Copy, Edit2, Trash2, Check, X } from "lucide-react";

export interface PromptItem {
  id: string;
  title: string;
  content: string;
}

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  search: string;
  onSearch: (v: string) => void;
  prompts: PromptItem[];
  savedCount?: number | null;
  onSelect: (p: PromptItem) => void;
  onCopy?: (content: string) => void;
  onEdit?: (id: string, title: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const PromptsDialog: React.FC<PromptsDialogProps> = ({
  open,
  onOpenChange,
  search,
  onSearch,
  prompts,
  savedCount,
  onSelect,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopy = async (content: string, promptId: string) => {
    try {
      if (onCopy) {
        onCopy(content);
      } else {
        await navigator.clipboard.writeText(content);
      }
      setCopiedId(promptId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleEdit = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
  };

  const handleSaveEdit = async () => {
    if (editingId && onEdit) {
      try {
        await onEdit(editingId, editTitle, editContent);
        setEditingId(null);
        setEditTitle("");
        setEditContent("");
      } catch (error) {
        console.error("Failed to edit prompt:", error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleDelete = async (promptId: string) => {
    if (onDelete) {
      setDeletingId(promptId);
      try {
        await onDelete(promptId);
      } catch (error) {
        console.error("Failed to delete prompt:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  const filtered = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Saved Prompts</DialogTitle>
          <DialogDescription>
            Manage your personal saved prompts.
            <span className="text-xs text-muted-foreground block">
              Saved Prompts:{" "}
              <span className="font-medium">{prompts.length}</span>
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-h-60 overflow-auto pr-1 thin-scrollbar">
            {prompts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No saved prompts yet.
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No results for your search.
              </p>
            ) : (
              filtered.map((p) => (
                <Card key={p.id} className="hover:bg-accent transition group">
                  {editingId === p.id ? (
                    <CardContent className="p-3 space-y-3">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Prompt title..."
                        className="text-sm"
                      />
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Prompt content..."
                        className="text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-7 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-7 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            onSelect(p);
                            onOpenChange(false);
                          }}
                        >
                          <p className="text-sm font-medium leading-none truncate">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {p.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(p.content, p.id);
                            }}
                            className="h-6 w-6 p-0"
                            title="Copy content"
                          >
                            {copiedId === p.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(p);
                            }}
                            className="h-6 w-6 p-0"
                            title="Edit prompt"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(p.id);
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Delete prompt"
                            disabled={deletingId === p.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
