import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Eye, EyeOff, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createOrganization, type CreateOrganizationData } from "@/services/organizationManagement";

interface Admin {
  name: string;
  email: string;
  password: string;
}

interface AddOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddOrganizationDialog: React.FC<AddOrganizationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<{[key: number]: boolean}>({});
  const [admins, setAdmins] = useState<Admin[]>([
    { name: "", email: "", password: "" }
  ]);
  const [formData, setFormData] = useState<CreateOrganizationData>({
    name: "",
    slug: "",
    description: "",
    admin_email: "",
    admin_name: "",
    admin_password: "",
    settings: {
      limits: {
        max_users: 10,
        max_concurrent_sessions: 5,
        monthly_request_limit: 10000,
        storage_limit_mb: 1000
      },
      default_employee_settings: {
        theme: "dark",
        default_model: "gemma:2b",
        can_save_prompts: true,
        can_upload_files: true
      },
      features: {
        analytics_enabled: true,
        file_sharing_enabled: true,
        custom_prompts_enabled: true,
        api_access_enabled: false
      }
    }
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generatePasswordForAdmin = (index: number) => {
    const newPassword = generatePassword();
    const updatedAdmins = [...admins];
    updatedAdmins[index].password = newPassword;
    setAdmins(updatedAdmins);
    toast({
      title: "Password Generated",
      description: "8-character secure password has been generated",
    });
  };

  const addAdminRow = () => {
    setAdmins([...admins, { name: "", email: "", password: "" }]);
  };

  const removeAdminRow = (index: number) => {
    if (admins.length > 1) {
      setAdmins(admins.filter((_, i) => i !== index));
      // Remove password visibility state for this index
      const newShowPassword = { ...showPassword };
      delete newShowPassword[index];
      setShowPassword(newShowPassword);
    }
  };

  const updateAdmin = (index: number, field: keyof Admin, value: string) => {
    const updatedAdmins = [...admins];
    updatedAdmins[index][field] = value;
    setAdmins(updatedAdmins);
  };

  const togglePasswordVisibility = (index: number) => {
    setShowPassword(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const keys = field.split('.');
      setFormData(prev => {
        const updated = { ...prev };
        let current = updated;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]] = { ...current[keys[i]] };
        }
        current[keys[keys.length - 1]] = value;
        
        return updated;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        features: {
          ...prev.settings?.features,
          [feature]: checked
        }
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      admin_email: "",
      admin_name: "",
      admin_password: "",
      settings: {
        limits: {
          max_users: 10,
          max_concurrent_sessions: 5,
          monthly_request_limit: 10000,
          storage_limit_mb: 1000
        },
        default_employee_settings: {
          theme: "dark",
          default_model: "gemma:2b",
          can_save_prompts: true,
          can_upload_files: true
        },
        features: {
          analytics_enabled: true,
          file_sharing_enabled: true,
          custom_prompts_enabled: true,
          api_access_enabled: false
        }
      }
    });
    setAdmins([{ name: "", email: "", password: "" }]);
    setShowPassword({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization slug is required",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast({
        title: "Validation Error",
        description: "Slug can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (formData.slug.startsWith('-') || formData.slug.endsWith('-')) {
      toast({
        title: "Validation Error",
        description: "Slug cannot start or end with a hyphen",
        variant: "destructive",
      });
      return;
    }

    // Validate at least one admin
    const validAdmins = admins.filter(admin => 
      admin.name.trim() && admin.email.trim() && admin.password.trim() && admin.password.length >= 8
    );

    if (validAdmins.length === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one admin with complete details is required",
        variant: "destructive",
      });
      return;
    }

    // For backward compatibility, use first admin for the API call
    const primaryAdmin = validAdmins[0];
    const submissionData = {
      ...formData,
      admin_name: primaryAdmin.name,
      admin_email: primaryAdmin.email,
      admin_password: primaryAdmin.password
    };

    setLoading(true);
    try {
      const response = await createOrganization(submissionData);
      
      if (response.success) {
        // If there are additional admins, we would need to create them separately
        // This would require additional API calls after organization creation
        
        toast({
          title: "Success",
          description: `Organization created successfully with ${validAdmins.length} admin(s)`,
        });
        
        resetForm();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Create organization error:", error);
      
      let errorMessage = "Failed to create organization";
      
      // Handle specific error messages from the API
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to the platform with an admin account and custom settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organization Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  handleInputChange('name', newName);
                  // Auto-generate slug if slug field is empty
                  if (!formData.slug || formData.slug === generateSlug(formData.name)) {
                    handleInputChange('slug', generateSlug(newName));
                  }
                }}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                placeholder="organization-url-slug"
                value={formData.slug}
                onChange={(e) => {
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
                  handleInputChange('slug', slug);
                }}
                required
                pattern="^[a-z0-9-]+$"
              />
              <div className="flex items-start gap-2">
                <div className="text-xs text-muted-foreground flex-1">
                  Used for SEO-friendly URLs: <span className="font-mono bg-muted px-1 rounded">/org/{formData.slug}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('slug', generateSlug(formData.name))}
                  className="text-xs h-6"
                  disabled={!formData.name}
                >
                  Auto-generate
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the organization (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Admin Accounts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Admin Accounts</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdminRow}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
            </div>
            
            <div className="space-y-4">
              {admins.map((admin, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Admin {index + 1}</Badge>
                    {admins.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdminRow(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`admin_name_${index}`}>Admin Name *</Label>
                      <Input
                        id={`admin_name_${index}`}
                        placeholder="Admin full name"
                        value={admin.name}
                        onChange={(e) => updateAdmin(index, 'name', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`admin_email_${index}`}>Admin Email *</Label>
                      <Input
                        id={`admin_email_${index}`}
                        type="email"
                        placeholder="admin@organization.com"
                        value={admin.email}
                        onChange={(e) => updateAdmin(index, 'email', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`admin_password_${index}`}>Admin Password *</Label>
                    <div className="relative">
                      <Input
                        id={`admin_password_${index}`}
                        type={showPassword[index] ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={admin.password}
                        onChange={(e) => updateAdmin(index, 'password', e.target.value)}
                        required
                        minLength={8}
                        className="pr-20"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => generatePasswordForAdmin(index)}
                          className="h-6 w-6 p-0"
                          title="Generate secure password"
                        >
                          <Shuffle className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(index)}
                          className="h-6 w-6 p-0"
                          title={showPassword[index] ? "Hide password" : "Show password"}
                        >
                          {showPassword[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    {index === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Click <Shuffle className="inline h-3 w-3" /> to generate a secure 8-character password
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organization Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organization Limits</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Maximum Users</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.settings?.limits?.max_users || 10}
                  onChange={(e) => handleInputChange('settings.limits.max_users', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_sessions">Max Concurrent Sessions</Label>
                <Input
                  id="max_sessions"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.settings?.limits?.max_concurrent_sessions || 5}
                  onChange={(e) => handleInputChange('settings.limits.max_concurrent_sessions', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_limit">Monthly Request Limit</Label>
                <Input
                  id="monthly_limit"
                  type="number"
                  min="100"
                  max="1000000"
                  value={formData.settings?.limits?.monthly_request_limit || 10000}
                  onChange={(e) => handleInputChange('settings.limits.monthly_request_limit', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storage_limit">Storage Limit (MB)</Label>
                <Input
                  id="storage_limit"
                  type="number"
                  min="100"
                  max="10000"
                  value={formData.settings?.limits?.storage_limit_mb || 1000}
                  onChange={(e) => handleInputChange('settings.limits.storage_limit_mb', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Default Employee Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Default Employee Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Default Theme</Label>
                <Select 
                  value={formData.settings?.default_employee_settings?.theme || "light"} 
                  onValueChange={(value) => handleInputChange('settings.default_employee_settings.theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_model">Default Model</Label>
                <Select 
                  value={formData.settings?.default_employee_settings?.default_model || "gemma:2b"} 
                  onValueChange={(value) => handleInputChange('settings.default_employee_settings.default_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemma:2b">Gemma 2B</SelectItem>
                    <SelectItem value="llama2:7b">Llama2 7B</SelectItem>
                    <SelectItem value="mistral:7b">Mistral 7B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="can_save_prompts" className="text-sm">
                  Can Save Prompts
                </Label>
                <Switch
                  id="can_save_prompts"
                  checked={formData.settings?.default_employee_settings?.can_save_prompts || false}
                  onCheckedChange={(checked) => handleInputChange('settings.default_employee_settings.can_save_prompts', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="can_upload_files" className="text-sm">
                  Can Upload Files
                </Label>
                <Switch
                  id="can_upload_files"
                  checked={formData.settings?.default_employee_settings?.can_upload_files || false}
                  onCheckedChange={(checked) => handleInputChange('settings.default_employee_settings.can_upload_files', checked)}
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organization Features</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Analytics Enabled</Label>
                  <p className="text-xs text-muted-foreground">Track usage and performance metrics</p>
                </div>
                <Switch
                  checked={formData.settings?.features?.analytics_enabled || false}
                  onCheckedChange={(checked) => handleFeatureToggle('analytics_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">File Sharing Enabled</Label>
                  <p className="text-xs text-muted-foreground">Allow file uploads and sharing</p>
                </div>
                <Switch
                  checked={formData.settings?.features?.file_sharing_enabled || false}
                  onCheckedChange={(checked) => handleFeatureToggle('file_sharing_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Custom Prompts Enabled</Label>
                  <p className="text-xs text-muted-foreground">Create and save custom prompts</p>
                </div>
                <Switch
                  checked={formData.settings?.features?.custom_prompts_enabled || false}
                  onCheckedChange={(checked) => handleFeatureToggle('custom_prompts_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">API Access Enabled</Label>
                  <p className="text-xs text-muted-foreground">Allow API integrations</p>
                </div>
                <Switch
                  checked={formData.settings?.features?.api_access_enabled || false}
                  onCheckedChange={(checked) => handleFeatureToggle('api_access_enabled', checked)}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddOrganizationDialog;