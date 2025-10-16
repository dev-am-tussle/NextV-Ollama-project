import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface BrandingSettingsProps {
  orgSlug?: string;
}

/**
 * BrandingSettings
 * Organization-scoped branding controls. (Future: persist via backend API.)
 */
export const BrandingSettings = ({ orgSlug }: BrandingSettingsProps) => {
  const [settings, setSettings] = useState({
    siteTitle: 'My Department',
    logoText: 'OrgChat',
    primaryColor: '#8B5CF6',
    buttonColor: '#8B5CF6',
    blockColor: '#1F2937',
  });

  const handleSave = () => {
    // TODO: integrate with organization branding save endpoint
    toast.success('Branding settings saved successfully!');
  };

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>
            Customize your department's branding and appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="siteTitle">Site Title</Label>
            <Input
              id="siteTitle"
              value={settings.siteTitle}
              onChange={e => handleChange('siteTitle', e.target.value)}
              placeholder="Enter site title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoText">Logo Text</Label>
            <Input
              id="logoText"
              value={settings.logoText}
              onChange={e => handleChange('logoText', e.target.value)}
              placeholder="Enter logo text"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ColorInput
              id="primaryColor"
              label="Primary Color"
              value={settings.primaryColor}
              onChange={val => handleChange('primaryColor', val)}
              placeholder="#8B5CF6"
            />
            <ColorInput
              id="buttonColor"
              label="Button Color"
              value={settings.buttonColor}
              onChange={val => handleChange('buttonColor', val)}
              placeholder="#8B5CF6"
            />
            <ColorInput
              id="blockColor"
              label="Block Color"
              value={settings.blockColor}
              onChange={val => handleChange('blockColor', val)}
              placeholder="#1F2937"
            />
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
                style={{ backgroundColor: settings.blockColor, color: 'white' }}
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

interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}

const ColorInput = ({ id, label, value, onChange, placeholder }: ColorInputProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex gap-2">
      <Input
        id={id}
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-20 cursor-pointer"
      />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  </div>
);

export default BrandingSettings;
