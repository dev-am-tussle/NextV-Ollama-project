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
import { Folder, Search } from "lucide-react";

interface FileManagerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  search: string;
  onSearch: (v: string) => void;
}

export const FileManagerDialog: React.FC<FileManagerDialogProps> = ({
  open,
  onOpenChange,
  search,
  onSearch,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>File Manager</DialogTitle>
          <DialogDescription>
            Manage your uploaded files • 0 files • 0 Bytes total (mock)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="border rounded-md p-8 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <Folder className="h-10 w-10 opacity-40" />
            <p className="text-sm">No files uploaded</p>
            <p className="text-xs">Upload some files to get started</p>
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
