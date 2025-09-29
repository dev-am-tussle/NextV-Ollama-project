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

interface ManagedFile {
  id: string;
  name: string;
  size?: number; // bytes
  createdAt?: string | Date;
}

interface FileManagerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  search: string;
  onSearch: (v: string) => void;
  files?: ManagedFile[] | null;
  totalSizeBytes?: number | null;
}

export const FileManagerDialog: React.FC<FileManagerDialogProps> = ({
  open,
  onOpenChange,
  search,
  onSearch,
  files = null,
  totalSizeBytes = null,
}) => {
  const list = Array.isArray(files) ? files : [];
  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalSize =
    typeof totalSizeBytes === "number"
      ? totalSizeBytes
      : list.reduce((acc, f) => acc + (f.size || 0), 0);
  const fmtSize = (n: number) => {
    if (n <= 0) return "0 Bytes";
    const units = ["Bytes", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = n;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(val < 10 ? 2 : 1)} ${units[i]}`;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>File Manager</DialogTitle>
          <DialogDescription>
            Manage your uploaded files • {list.length} file
            {list.length === 1 ? "" : "s"} • {fmtSize(totalSize)} total
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
          {list.length === 0 ? (
            <div className="border rounded-md p-8 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <Folder className="h-10 w-10 opacity-40" />
              <p className="text-sm">No files uploaded</p>
              <p className="text-xs">Upload some files to get started</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border rounded-md p-8 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <Folder className="h-10 w-10 opacity-40" />
              <p className="text-sm">No results for your search</p>
              <p className="text-xs">Try another term</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent/40 transition text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtSize(f.size || 0)}
                      {f.createdAt && (
                        <span className="ml-2">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
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
