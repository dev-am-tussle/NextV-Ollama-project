import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Key, 
  Server, 
  Shield, 
  Database, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
  Info
} from 'lucide-react';
import { AdminExternalApiManager } from '@/components/admin/AdminExternalApiManager';
import { AdminApiErrorBoundary } from '@/components/admin/AdminApiErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiKeys.service';

interface ExternalApiConfig {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  model_count?: number;
  last_sync?: string;
  status?: 'active' | 'inactive' | 'error';
}

interface AdminSettingsData {
  external_apis: ExternalApiConfig[];
  system_settings: {
    auto_sync_enabled: boolean;
    sync_interval_hours: number;
    max_concurrent_requests: number;
    request_timeout_seconds: number;
  };
  security_settings: {
    api_key_encryption_enabled: boolean;
    audit_logging_enabled: boolean;
    rate_limiting_enabled: boolean;
  };
}

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('external-apis');
  const [settings, setSettings] = useState<AdminSettingsData>({
    external_apis: [],
    system_settings: {
      auto_sync_enabled: true,
      sync_interval_hours: 24,
      max_concurrent_requests: 10,
      request_timeout_seconds: 30,
    },
    security_settings: {
      api_key_encryption_enabled: true,
      audit_logging_enabled: true,
      rate_limiting_enabled: true,
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showApiManager, setShowApiManager] = useState(false);
  const [editingApi, setEditingApi] = useState<ExternalApiConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApiService.getAdminExternalApis();
      setSettings(prev => ({
        ...prev,
        external_apis: response.apis || []
      }));
    } catch (error) {
      console.error('Failed to load admin settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllApis = async () => {
    try {
      setSyncing(true);
      await adminApiService.syncAdminExternalModels();
      await loadSettings(); // Refresh the data
      toast({
        title: 'Success',
        description: 'All external APIs have been synced successfully',
      });
    } catch (error) {
      console.error('Failed to sync APIs:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync external APIs',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleApiStatus = async (apiId: string, isActive: boolean) => {
    try {
      await adminApiService.toggleAdminApiStatus(apiId, isActive);
      setSettings(prev => ({
        ...prev,
        external_apis: prev.external_apis.map(api => 
          api.id === apiId ? { ...api, is_active: isActive } : api
        )
      }));
      toast({
        title: 'Success',
        description: `API ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Failed to toggle API status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update API status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteApi = async (apiId: string) => {
    if (!confirm('Are you sure you want to delete this API configuration?')) {
      return;
    }

    try {
      await adminApiService.deleteAdminExternalApi(apiId);
      setSettings(prev => ({
        ...prev,
        external_apis: prev.external_apis.filter(api => api.id !== apiId)
      }));
      toast({
        title: 'Success',
        description: 'API configuration deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete API:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete API configuration',
        variant: 'destructive'
      });
    }
  };

  const handleSystemSettingChange = (key: keyof AdminSettingsData['system_settings'], value: any) => {
    setSettings(prev => ({
      ...prev,
      system_settings: {
        ...prev.system_settings,
        [key]: value
      }
    }));
  };

  const handleSecuritySettingChange = (key: keyof AdminSettingsData['security_settings'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      security_settings: {
        ...prev.security_settings,
        [key]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // TODO: Implement API call to save system and security settings
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (api: ExternalApiConfig) => {
    if (!api.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <AdminApiErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">
              Configure external API integrations and system settings
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="external-apis" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              External APIs
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* External APIs Tab */}
          <TabsContent value="external-apis" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    External API Configurations
                  </CardTitle>
                  <CardDescription>
                    Manage external API providers and their configurations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleSyncAllApis}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync All
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowApiManager(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add API
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settings.external_apis.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No external APIs configured. Add your first API configuration to get started.
                      <Button 
                        variant="link" 
                        className="p-0 ml-1 h-auto"
                        onClick={() => setShowApiManager(true)}
                      >
                        Add API
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {settings.external_apis.map((api) => (
                      <Card key={api.id} className="border border-border">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  {api.name}
                                  {getStatusBadge(api)}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Provider: {api.provider}
                                  {api.model_count && ` • ${api.model_count} models`}
                                  {api.last_sync && ` • Last sync: ${new Date(api.last_sync).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={api.is_active}
                                onCheckedChange={(checked) => handleToggleApiStatus(api.id, checked)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingApi(api);
                                  setShowApiManager(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteApi(api.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings for external API management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-sync External Models</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync models from external APIs
                      </p>
                    </div>
                    <Switch
                      checked={settings.system_settings.auto_sync_enabled}
                      onCheckedChange={(checked) => handleSystemSettingChange('auto_sync_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-2">
                    <Label htmlFor="sync-interval">Sync Interval (hours)</Label>
                    <Input
                      id="sync-interval"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.system_settings.sync_interval_hours}
                      onChange={(e) => handleSystemSettingChange('sync_interval_hours', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      How often to sync models from external APIs (1-168 hours)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="max-requests">Max Concurrent Requests</Label>
                    <Input
                      id="max-requests"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.system_settings.max_concurrent_requests}
                      onChange={(e) => handleSystemSettingChange('max_concurrent_requests', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum number of concurrent API requests (1-50)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="5"
                      max="300"
                      value={settings.system_settings.request_timeout_seconds}
                      onChange={(e) => handleSystemSettingChange('request_timeout_seconds', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Timeout for external API requests (5-300 seconds)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Configuration
                </CardTitle>
                <CardDescription>
                  Configure security settings for external API management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>API Key Encryption</Label>
                      <p className="text-sm text-muted-foreground">
                        Encrypt API keys in the database
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_settings.api_key_encryption_enabled}
                      onCheckedChange={(checked) => handleSecuritySettingChange('api_key_encryption_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Log all API configuration changes
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_settings.audit_logging_enabled}
                      onCheckedChange={(checked) => handleSecuritySettingChange('audit_logging_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Rate Limiting</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable rate limiting for external API requests
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_settings.rate_limiting_enabled}
                      onCheckedChange={(checked) => handleSecuritySettingChange('rate_limiting_enabled', checked)}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Security settings changes require a system restart to take full effect.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* External API Manager Dialog */}
        {showApiManager && (
          <AdminExternalApiManager
            isOpen={showApiManager}
            onClose={() => {
              setShowApiManager(false);
              setEditingApi(null);
            }}
            onSuccess={() => {
              setShowApiManager(false);
              setEditingApi(null);
              loadSettings();
            }}
            editingApi={editingApi}
          />
        )}
      </div>
    </AdminApiErrorBoundary>
  );
};

export default AdminSettingsPage;