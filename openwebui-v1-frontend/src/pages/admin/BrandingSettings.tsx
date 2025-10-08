import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const BrandingSettings = () => {
  const [settings, setSettings] = useState({
    siteTitle: "My Organization",
    logoText: "OrgChat",
    primaryColor: "#8B5CF6",
    buttonColor: "#8B5CF6",
    blockColor: "#1F2937",
  });

  const handleSave = () => {
    toast.success("Branding settings saved successfully!");
  };

  const handleChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>
            Customize your organization's branding and appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="siteTitle">Site Title</Label>
            <Input
              id="siteTitle"
              value={settings.siteTitle}
              onChange={(e) => handleChange("siteTitle", e.target.value)}
              placeholder="Enter site title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoText">Logo Text</Label>
            <Input
              id="logoText"
              value={settings.logoText}
              onChange={(e) => handleChange("logoText", e.target.value)}
              placeholder="Enter logo text"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buttonColor">Button Color</Label>
              <div className="flex gap-2">
                <Input
                  id="buttonColor"
                  type="color"
                  value={settings.buttonColor}
                  onChange={(e) => handleChange("buttonColor", e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  value={settings.buttonColor}
                  onChange={(e) => handleChange("buttonColor", e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockColor">Block Color</Label>
              <div className="flex gap-2">
                <Input
                  id="blockColor"
                  type="color"
                  value={settings.blockColor}
                  onChange={(e) => handleChange("blockColor", e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  value={settings.blockColor}
                  onChange={(e) => handleChange("blockColor", e.target.value)}
                  placeholder="#1F2937"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your branding will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-6">
            <div className="flex items-center gap-2">
              <div
                className="rounded px-3 py-2 font-semibold text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.logoText}
              </div>
              <span className="text-sm text-muted-foreground">- {settings.siteTitle}</span>
            </div>

            <div className="flex gap-2">
              <Button
                style={{ backgroundColor: settings.buttonColor }}
                className="text-white"
              >
                Primary Button
              </Button>
              <div
                className="rounded-lg px-4 py-2"
                style={{ backgroundColor: settings.blockColor, color: "white" }}
              >
                Content Block
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};
