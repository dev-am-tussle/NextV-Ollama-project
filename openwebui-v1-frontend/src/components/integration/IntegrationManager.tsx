import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useIntegrationStore } from '@/stores/useIntegrationStore';
import { ProviderSelector } from './ProviderSelector';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelList } from './ModelList';
import { AddProviderModal } from './AddProviderModal';
import { toast } from 'sonner';

export function IntegrationManager() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    apiName,
    setApiName,
    saveKey,
    reset,
    fetchAvailableModels,
    refreshModels,
    availableModels,
    isLoadingModels,
    isValidated,
    validationResult
  } = useIntegrationStore();

  useEffect(() => {
    // Fetch available models on component mount
    fetchAvailableModels();
  }, [fetchAvailableModels]);

  const handleSave = async () => {
    if (!apiName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }
    
    if (!isValidated) {
      toast.error('Please validate your API key first');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const success = await saveKey();
      
      if (success) {
        toast.success('API key saved successfully!');
        // Optionally navigate somewhere or keep on the same page
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    reset();
    toast.info('Form reset');
  };

  const handleRefreshModels = async () => {
    try {
      await refreshModels();
      toast.success('Models refreshed successfully');
    } catch (error: any) {
      toast.error('Failed to refresh models');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center mb-8 gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">API Integration</h1>
          <p className="text-muted-foreground">
            Connect your external AI provider APIs to access more models
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Integration Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Name */}
              <div className="space-y-2">
                <Label htmlFor="api-name">API Name</Label>
                <Input
                  id="api-name"
                  placeholder="e.g., My OpenAI Key"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                />
              </div>

              {/* Provider Selector */}
              <ProviderSelector />

              {/* API Key Input */}
              <ApiKeyInput />
            </CardContent>
            
            <CardFooter className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!isValidated || isSaving || !apiName.trim()}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save API Key'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset
              </Button>
            </CardFooter>
          </Card>

          {/* Validation Results */}
          {isValidated && validationResult?.models && (
            <ModelList 
              models={validationResult.models} 
              showDetails={false}
            />
          )}
        </div>

        {/* Right Column - Connected Models */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Connected Models</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Models from all your connected providers
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshModels}
                disabled={isLoadingModels}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingModels ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading models...</span>
                </div>
              ) : availableModels.length > 0 ? (
                <ModelList 
                  models={availableModels} 
                  showDetails={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">No models connected</h3>
                  <p className="text-sm">
                    Add your first API key to see available models
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal />
    </div>
  );
}