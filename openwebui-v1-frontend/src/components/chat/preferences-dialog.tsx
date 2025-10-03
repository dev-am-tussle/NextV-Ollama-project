import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Palette, 
  MessageSquare, 
  Zap, 
  Shield,
  Settings2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("models");

  const handleAdminSettings = () => {
    onOpenChange(false); // Close preferences dialog
    navigate("/admin"); // Navigate to admin settings
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your chat experience and model settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Interface
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 custom-scrollbar max-h-[50vh] overflow-y-auto">
            <TabsContent value="models" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Model Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Customize model behavior and preferences.
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                {/* Model customization options will be added here */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Model customization options will be added here. This includes:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Default model selection</li>
                    <li>Temperature and response settings</li>
                    <li>Context window preferences</li>
                    <li>Model-specific parameters</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="interface" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Interface Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Customize the look and feel of the application.
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Interface customization options will include:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Theme preferences</li>
                    <li>Font size and family</li>
                    <li>Layout options</li>
                    <li>Color schemes</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Chat Behavior</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how conversations work.
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Chat behavior options will include:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Auto-save conversations</li>
                    <li>Message formatting</li>
                    <li>Response streaming</li>
                    <li>Keyboard shortcuts</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Advanced Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced configuration and debugging options.
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Advanced options will include:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>API endpoints configuration</li>
                    <li>Logging and debugging</li>
                    <li>Performance settings</li>
                    <li>Export/Import preferences</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleAdminSettings}
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Admin Settings
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};