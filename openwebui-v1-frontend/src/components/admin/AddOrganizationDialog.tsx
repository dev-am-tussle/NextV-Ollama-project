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
import { Shuffle, Eye, EyeOff, Plus, X, Check, Search, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createOrganization, updateOrganization, type CreateOrganizationData, type OrganizationWithStats, assignModelsToOrganization } from "@/services/organizationManagement";
import { getAvailableModelsForOrganization, type AvailableModelForOrg } from "@/services/models";
import { CircleLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Admin {
  name: string;
  email: string;
  password: string;
}

interface AddOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  organization?: OrganizationWithStats | null;
}

const AddOrganizationDialog: React.FC<AddOrganizationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  mode = 'create',
  organization,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModelForOrg[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelSearchOpen, setModelSearchOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});
  const [admins, setAdmins] = useState<Admin[]>([
    { name: "", email: "", password: "" }
  ]);
  const [formData, setFormData] = useState<CreateOrganizationData>(() => {
    if (mode === 'edit' && organization) {
      return {
        name: organization.name,
        slug: organization.slug || '',
        description: organization.description || '',
        admin_email: '', // not editable in edit mode
        admin_name: '',
        admin_password: '',
        settings: {
          limits: {
            max_users: organization.settings.limits.max_users,
            max_concurrent_sessions: organization.settings.limits.max_concurrent_sessions,
            monthly_request_limit: organization.settings.limits.monthly_request_limit,
            storage_limit_mb: organization.settings.limits.storage_limit_mb,
          },
          default_employee_settings: {
            theme: organization.settings.default_employee_settings.theme,
            default_model: organization.settings.default_employee_settings.default_model,
            can_save_prompts: organization.settings.default_employee_settings.can_save_prompts,
            can_upload_files: organization.settings.default_employee_settings.can_upload_files,
          },
          features: {
            analytics_enabled: organization.settings.features.analytics_enabled,
            file_sharing_enabled: organization.settings.features.file_sharing_enabled,
            custom_prompts_enabled: organization.settings.features.custom_prompts_enabled,
            api_access_enabled: organization.settings.features.api_access_enabled,
          },
        },
      };
    }
    return {
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
          storage_limit_mb: 1000,
        },
        default_employee_settings: {
          theme: "dark",
          default_model: "gemma:2b",
          can_save_prompts: true,
          can_upload_files: true,
        },
        features: {
          analytics_enabled: true,
          file_sharing_enabled: true,
          custom_prompts_enabled: true,
          api_access_enabled: false,
        },
      },
    };
  });

  // When switching to edit mode or organization changes, update form
  React.useEffect(() => {
    if (mode === 'edit' && organization) {
      setFormData(prev => ({
        ...prev,
        name: organization.name,
        slug: organization.slug || '',
        description: organization.description || '',
        settings: {
          limits: { ...organization.settings.limits },
          default_employee_settings: { ...organization.settings.default_employee_settings },
          features: { ...organization.settings.features },
        },
      }));
      // Pre-select existing allowed models in edit mode
      const existing = organization.settings.allowed_models?.map(m => m.model_id) || [];
      setSelectedModelIds(existing);
    } else if (mode === 'create' && open) {
      // reset when opening create dialog
      resetForm();
    }
    // Load models when dialog opens
    if (open) {
      loadAvailableModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, organization, open]);

  const loadAvailableModels = async () => {
    try {
      setModelsLoading(true);
      console.log('🔄 Loading available models...');
      const res = await getAvailableModelsForOrganization();
      console.log('📦 Models response:', res);
      if (res.success) {
        const models = res.data || [];
        console.log('✅ Loaded models:', models);
        setAvailableModels(models);
      } else {
        console.error('❌ Failed to load models:', res);
        toast({
          title: "Error",
          description: "Failed to load available models",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error('❌ Failed to load models (exception):', e);
      toast({
        title: "Error",
        description: "Failed to load available models",
        variant: "destructive",
      });
    } finally {
      setModelsLoading(false);
    }
  };

  const toggleModelSelection = (id: string) => {
    setSelectedModelIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

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

    let submissionData: any = { ...formData };
    let validAdmins: Admin[] = [];

    if (mode === 'create') {
      // Validate at least one admin only in create mode
      validAdmins = admins.filter(admin =>
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
      const primaryAdmin = validAdmins[0];
      submissionData = {
        ...formData,
        admin_name: primaryAdmin.name,
        admin_email: primaryAdmin.email,
        admin_password: primaryAdmin.password,
      };
    } else if (mode === 'edit') {
      // Remove admin creation fields
      delete submissionData.admin_email;
      delete submissionData.admin_name;
      delete submissionData.admin_password;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        // include model ids in initial creation
        const response = await createOrganization({ ...submissionData, model_ids: selectedModelIds } as any);
        if (response.success) {
          toast({
            title: "Success",
            description: `Organization created successfully with ${validAdmins.length} admin(s)`,
          });
          // Optionally assign models endpoint if backend expects separate call
          if (selectedModelIds.length && !response.data?.settings?.allowed_models?.length) {
            try { await assignModelsToOrganization(response.data._id, selectedModelIds); } catch { }
          }
          resetForm();
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }
      } else if (mode === 'edit' && organization) {
        const updatePayload = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          settings: formData.settings,
        };
        const response = await updateOrganization(organization._id, updatePayload as any);
        if (response.success) {
          // Assign / update models after edit
          if (selectedModelIds) {
            try { await assignModelsToOrganization(organization._id, selectedModelIds); } catch (e) { console.warn('Model assign failed', e); }
          }
          toast({
            title: "Success",
            description: `Organization updated successfully`,
          });
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }
      }
    } catch (error: any) {
      console.error("Organization submit error:\n", error);
      let errorMessage = mode === 'edit' ? 'Failed to update organization' : 'Failed to create organization';

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

          {/* Enhanced Model Assignment Section */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Assign Models</h3>
              <Button type="button" variant="outline" size="sm" onClick={loadAvailableModels} disabled={modelsLoading}>
                {modelsLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Select which models this organization can access. These appear as allowed models in org settings.</p>

            {modelsLoading ? (
              <CircleLoader label="Loading models" />
            ) : (
              <div className="space-y-3">
                {/* Multi-Select Dropdown */}
                <Popover open={modelSearchOpen} onOpenChange={setModelSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelSearchOpen}
                      className="w-full justify-between text-left font-normal"
                    >
                      {selectedModelIds.length === 0 ? (
                        <span className="text-muted-foreground">Search and select models...</span>
                      ) : (
                        <span>{selectedModelIds.length} model(s) selected</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-auto border-t">
                      {availableModels.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">No models available</p>
                        </div>
                      ) : (
                        availableModels
                          .filter(m =>
                            !modelSearchQuery ||
                            (m.display_name || m.name).toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
                            (m.description || '').toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
                            (m.size || '').toLowerCase().includes(modelSearchQuery.toLowerCase())
                          )
                          .map((model) => {
                            const isSelected = selectedModelIds.includes(model._id);
                            return (
                              <div
                                key={model._id}
                                className="flex items-center space-x-2 p-2 hover:bg-muted cursor-pointer"
                                onClick={() => toggleModelSelection(model._id)}
                              >
                                <div className="flex h-4 w-4 items-center justify-center border rounded">
                                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{model.display_name || model.name}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {model.size}
                                    </Badge>
                                  </div>
                                  {model.description && (
                                    <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                                  )}
                                  {model.performance_tier && (
                                    <div className="flex gap-1">
                                      <Badge variant="secondary" className="text-xs px-1 py-0">
                                        {model.performance_tier}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Selected Models Display */}
                {selectedModelIds.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Models ({selectedModelIds.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedModelIds.map((modelId) => {
                        const model = availableModels.find(m => m._id === modelId);
                        return (
                          <Badge
                            key={modelId}
                            variant="secondary"
                            className="px-2 py-1 text-xs flex items-center gap-1"
                          >
                            <span>{model?.display_name || model?.name || modelId}</span>
                            {model?.size && (
                              <span className="text-muted-foreground">({model.size})</span>
                            )}
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => toggleModelSelection(modelId)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Organization')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddOrganizationDialog;