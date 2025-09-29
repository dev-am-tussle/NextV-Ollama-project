import React from "react";
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
import { Search } from "lucide-react";

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
  onSelect: (p: PromptItem) => void;
}

export const PromptsDialog: React.FC<PromptsDialogProps> = ({
  open,
  onOpenChange,
  search,
  onSearch,
  prompts,
  onSelect,
}) => {
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
            Reuse and manage your frequently used prompts.
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
          <div className="space-y-2 max-h-60 overflow-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No prompts found.
              </p>
            )}
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="hover:bg-accent cursor-pointer transition"
                onClick={() => {
                  onSelect(p);
                  onOpenChange(false);
                }}
              >
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {p.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.content}
                  </p>
                </CardContent>
              </Card>
            ))}
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
