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

  const handleApiConfig = () => {
    onOpenChange(false); // Close settings dialog
    const currentPath = window.location.pathname;
    const orgSlug = currentPath.split('/')[1];
    navigate(`/${orgSlug}/api-config`); // Navigate to API configuration page
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">External API Integration</p>
                <p className="text-xs text-muted-foreground">
                  Configure external AI model APIs
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApiConfig}
                className="flex items-center gap-2 hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 12v5h16a2 2 0 0 1 0 4H3v-4" />
                </svg>
                Configure APIs
              </Button>
            </div>
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
