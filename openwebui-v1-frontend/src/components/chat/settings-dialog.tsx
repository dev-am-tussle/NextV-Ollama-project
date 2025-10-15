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
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleAdminSettings = () => {
    onOpenChange(false); // Close settings dialog
    navigate("/admin"); // Navigate to admin settings
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust your chat preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 custom-scrollbar">
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
          
          <Separator />
          
          {/* Admin Settings Section */}
          {/* <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Administration</p>
              <p className="text-xs text-muted-foreground">
                Manage system settings and configuration
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAdminSettings}
              className="w-full justify-start"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin Settings
            </Button>
          </div> */}
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
