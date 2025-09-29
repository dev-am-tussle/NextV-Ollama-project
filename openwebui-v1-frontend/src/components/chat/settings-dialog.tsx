import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  compact: boolean;
  onToggleCompact: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  compact,
  onToggleCompact,
  compareMode,
  onToggleCompare,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust your chat preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compact Mode</p>
              <p className="text-xs text-muted-foreground">
                Reduce spacing in messages
              </p>
            </div>
            <Switch checked={compact} onCheckedChange={onToggleCompact} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compare Mode</p>
              <p className="text-xs text-muted-foreground">
                Show parallel model outputs
              </p>
            </div>
            <Switch checked={compareMode} onCheckedChange={onToggleCompare} />
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
