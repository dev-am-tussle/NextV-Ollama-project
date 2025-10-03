import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, RotateCcw } from "lucide-react";
import { 
  getBrandingSettings, 
  saveBrandingSettings, 
  resetBrandingToDefaults,
  BrandingSettings as BrandingSettingsType 
} from "@/services/adminSettings";

export const BrandingSettings: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BrandingSettingsType>({
    logoName: "TussleAI",
    titleName: "Tussle - AI",
    primaryColor: "#61dafbaa",
    buttonTextColor: "#ffffff",
  });
  const [loading, setLoading] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const currentSettings = getBrandingSettings();
    setSettings(currentSettings);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveBrandingSettings(settings);
      
      toast({
        title: "Settings saved",
        description: "Branding settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await resetBrandingToDefaults();
      const defaultSettings = getBrandingSettings();
      setSettings(defaultSettings);
      
      toast({
        title: "Settings reset",
        description: "Branding settings have been reset to defaults.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 custom-scrollbar">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branding Settings</h2>
        <p className="text-muted-foreground">
          Customize the appearance and branding of your application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>
            Configure your project name and primary color scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titleName">Title Name</Label>
            <Input
              id="titleName"
              placeholder="Enter title name"
              value={settings.titleName}
              onChange={(e) =>
                setSettings({ ...settings, titleName: e.target.value })
              }
            />
            <p className="text-sm text-muted-foreground">
              This will be displayed as the document title (colorless).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoName">Logo Name</Label>
            <Input
              id="logoName"
              placeholder="Enter logo name"
              value={settings.logoName}
              onChange={(e) =>
                setSettings({ ...settings, logoName: e.target.value })
              }
            />
            <p className="text-sm text-muted-foreground">
              This will be displayed as the logo text in the sidebar (with color).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color (Button Background & Logo)</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={settings.primaryColor}
                onChange={(e) =>
                  setSettings({ ...settings, primaryColor: e.target.value })
                }
                className="w-16 h-10 p-1 border rounded cursor-pointer"
              />
              <Input
                placeholder="#61dafbaa"
                value={settings.primaryColor}
                onChange={(e) =>
                  setSettings({ ...settings, primaryColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Choose your brand's primary color for button backgrounds and logo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonTextColor">Button Text Color</Label>
            <div className="flex gap-2">
              <Input
                id="buttonTextColor"
                type="color"
                value={settings.buttonTextColor}
                onChange={(e) =>
                  setSettings({ ...settings, buttonTextColor: e.target.value })
                }
                className="w-16 h-10 p-1 border rounded cursor-pointer"
              />
              <Input
                placeholder="#ffffff"
                value={settings.buttonTextColor}
                onChange={(e) =>
                  setSettings({ ...settings, buttonTextColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Choose the text color for buttons (ensure good contrast with button background).
            </p>
          </div>

          <div className="pt-4 border-t flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 btn-brand">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button 
              onClick={handleReset} 
              disabled={loading} 
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your branding changes will look.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Document Title:</p>
              <p className="font-medium">{settings.titleName || "Title Name"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Logo in Sidebar:</p>
              <span 
                className="font-semibold text-sm" 
                style={{ color: settings.primaryColor }}
              >
                {settings.logoName || "Logo Name"}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Sample Button:</p>
              <Button
                size="sm"
                className="btn-brand"
                style={{ 
                  backgroundColor: settings.primaryColor,
                  color: settings.buttonTextColor 
                }}
              >
                Sample Button
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Button Hover Effect:</p>
              <Button
                size="sm"
                className="btn-brand opacity-90"
                style={{ 
                  backgroundColor: settings.primaryColor,
                  color: settings.buttonTextColor,
                  opacity: 0.9
                }}
              >
                Hovered Button
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};