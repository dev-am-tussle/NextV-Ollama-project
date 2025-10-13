import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CategorizedModelSelector } from "./categorized-model-selector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Share2, HelpCircle, Sliders, LogOut, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenPreferences: () => void;
}

export const ChatHeader: React.FC<Props> = ({
  title,
  selectedModel,
  onSelectModel,
  compareMode,
  onToggleCompare,
  onShare,
  onOpenSettings,
  onOpenPreferences,
}) => {
  const { user, logout } = useAuth();
  const { availableModels } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <header className="border-b p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* <SidebarTrigger /> */}
        <div className="flex items-center gap-3">
          <CategorizedModelSelector
            selected={selectedModel}
            onSelect={onSelectModel}
            compareMode={compareMode}
            onToggleCompare={onToggleCompare}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={onShare} title="Share chat">
          <Share2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm"
              aria-label="Open profile menu"
            >
              {user?.name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex gap-2"
              onClick={() => {
                try {
                  const opened = window.open("/help", "_blank");
                  if (!opened) throw new Error("Popup blocked");
                } catch (e) {
                  toast({
                    title: "Help",
                    description: "Open /help for documentation.",
                  });
                }
              }}
            >
              <HelpCircle className="h-4 w-4" /> Help
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex gap-2"
              onClick={() => {
                onOpenSettings();
              }}
            >
              <Sliders className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex gap-2"
              onClick={() => {
                onOpenPreferences();
              }}
            >
              <Settings2 className="h-4 w-4" /> Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex gap-2 text-destructive"
              onClick={async () => {
                try {
                  await logout();
                  toast({
                    title: "Signed out",
                    description: "You have been signed out.",
                  });
                } catch (err) {
                  toast({
                    title: "Sign out",
                    description: "There was a problem signing out.",
                  });
                }
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
