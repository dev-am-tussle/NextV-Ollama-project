import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, 
  Gem, 
  Wind, 
  Brain, 
  Atom, 
  Shield,
  Building,
  User,
  HardDrive,
  Crown,
  CheckCircle,
  Info,
  Zap
} from "lucide-react";
import { axiosInstance } from "@/services/axios-instance";
import { useToast } from "@/hooks/use-toast";

// Source type indicators
const getSourceIcon = (source: string) => {
  switch (source) {
    case 'admin':
      return <Crown className="h-3 w-3 text-amber-600" />;
    case 'organization':
      return <Building className="h-3 w-3 text-blue-600" />;
    case 'user':
      return <User className="h-3 w-3 text-green-600" />;
    case 'local':
      return <HardDrive className="h-3 w-3 text-purple-600" />;
    default:
      return <Info className="h-3 w-3 text-gray-600" />;
  }
};

const getSourceBadge = (source: string) => {
  const config = {
    admin: { label: 'Admin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    organization: { label: 'Org', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    user: { label: 'User', color: 'bg-green-100 text-green-800 border-green-300' },
    local: { label: 'Local', color: 'bg-purple-100 text-purple-800 border-purple-300' }
  };
  
  const sourceConfig = config[source as keyof typeof config] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  
  return (
    <Badge variant="outline" className={`text-xs ${sourceConfig.color}`}>
      {sourceConfig.label}
    </Badge>
  );
};

// Category icons
const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'general':
      return <Brain className="h-4 w-4 text-blue-600" />;
    case 'coding':
      return <Atom className="h-4 w-4 text-green-600" />;
    case 'creative':
      return <Gem className="h-4 w-4 text-purple-600" />;
    case 'analytical':
      return <Zap className="h-4 w-4 text-orange-600" />;
    case 'conversational':
      return <Wind className="h-4 w-4 text-cyan-600" />;
    default:
      return <Brain className="h-4 w-4 text-gray-600" />;
  }
};

interface UnifiedModel {
  _id: string;
  id?: string;
  name: string;
  display_name?: string;
  provider: string;
  source: 'admin' | 'organization' | 'user' | 'local';
  category?: string;
  size?: string;
  is_active?: boolean;
  external_model_id?: string;
  external_model_name?: string;
  apiName?: string;
  organizationName?: string;
  pulledAt?: string;
  usageCount?: number;
  lastUsed?: string;
}

interface UnifiedModelsResponse {
  success: boolean;
  data: {
    admin: UnifiedModel[];
    organization: UnifiedModel[];
    user: UnifiedModel[];
    local: UnifiedModel[];
  };
  summary: {
    total: number;
    sources: {
      admin: { count: number; providers: string[] };
      organization: { count: number; providers: string[] };
      user: { count: number; providers: string[] };
      local: { count: number; models: string[] };
    };
    user: {
      id: string;
      name: string;
      organizationId?: string;
    };
  };
}

interface UnifiedModelSelectorProps {
  selected: string;
  onSelect: (modelId: string, model: UnifiedModel) => void;
  compareMode?: boolean;
  onToggleCompare?: () => void;
  multiSelect?: boolean;
  selectedModels?: string[];
}

export const UnifiedModelSelector: React.FC<UnifiedModelSelectorProps> = ({
  selected,
  onSelect,
  compareMode = false,
  onToggleCompare,
  multiSelect = false,
  selectedModels = []
}) => {
  const { toast } = useToast();
  const [unifiedModels, setUnifiedModels] = useState<UnifiedModelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten all models for easy access
  const allModels = unifiedModels ? [
    ...unifiedModels.data.admin,
    ...unifiedModels.data.organization,
    ...unifiedModels.data.user,
    ...unifiedModels.data.local
  ] : [];

  // Find selected model details
  const selectedModelDetails = allModels.find(
    model => model._id === selected || model.id === selected || model.name === selected
  );

  // Get model display name
  const getModelDisplayName = (model: UnifiedModel) => {
    return model.display_name || model.external_model_name || model.name || model.id || 'Unknown Model';
  };

  // Fetch unified models with comprehensive error handling
  const fetchUnifiedModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get('/api/v1/models/unified', {
        timeout: 15000, // 15 second timeout
      });
      
      if (response.data.success) {
        setUnifiedModels(response.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch unified models');
      }
    } catch (err: any) {
      console.error('Error fetching unified models:', err);
      
      let errorMessage = 'Failed to load models';
      let errorDescription = 'An unexpected error occurred';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request Timeout';
        errorDescription = 'The request took too long to complete. Please try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication Error';
        errorDescription = 'Please log in again to access models.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access Denied';
        errorDescription = 'You do not have permission to access models.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Service Not Found';
        errorDescription = 'The models service is not available.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server Error';
        errorDescription = 'The server is experiencing issues. Please try again later.';
      } else if (err.message?.includes('Network Error') || !navigator.onLine) {
        errorMessage = 'Network Error';
        errorDescription = 'Please check your internet connection and try again.';
      } else {
        errorDescription = err.response?.data?.error || err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: errorMessage,
        description: errorDescription,
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnifiedModels();
  }, []);

  const handleModelSelect = (model: UnifiedModel) => {
    try {
      // Use the appropriate identifier for selection
      const modelId = model.external_model_id || model.id || model._id || model.name;
      
      if (!modelId) {
        toast({
          variant: 'destructive',
          title: 'Selection Error',
          description: 'Unable to identify the selected model. Please try again.',
        });
        return;
      }

      onSelect(modelId, model);
      
      // Show success feedback for external models
      if (model.source !== 'local') {
        toast({
          title: 'Model Selected',
          description: `Selected ${getModelDisplayName(model)} from ${model.source} source`,
          duration: 2000,
        });
      }
    } catch (err: any) {
      console.error('Error selecting model:', err);
      toast({
        variant: 'destructive',
        title: 'Selection Error',
        description: 'Failed to select the model. Please try again.',
      });
    }
  };

  const isModelSelected = (model: UnifiedModel) => {
    const modelId = model.external_model_id || model.id || model._id || model.name;
    return multiSelect 
      ? selectedModels.includes(modelId)
      : selected === modelId;
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Brain className="h-4 w-4 mr-2 animate-pulse" />
        Loading unified models...
      </Button>
    );
  }

  if (error || !unifiedModels) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={fetchUnifiedModels}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        <Info className="h-4 w-4 mr-2" />
        Retry loading models
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 pr-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedModelDetails ? (
              <>
                {getSourceIcon(selectedModelDetails.source)}
                {getCategoryIcon(selectedModelDetails.category)}
                <span className="font-medium truncate">
                  {getModelDisplayName(selectedModelDetails)}
                </span>
                {getSourceBadge(selectedModelDetails.source)}
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                <span className="font-medium">Select Unified Model</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-70 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="start"
        className="w-[400px] max-h-[500px] overflow-y-auto bg-popover border border-border p-2"
      >
        {/* Summary Header */}
        <div className="px-2 py-2 text-xs text-muted-foreground border-b mb-2">
          <div className="flex items-center justify-between">
            <span>
              Total Models: <span className="font-medium">{unifiedModels.summary.total}</span>
            </span>
            {unifiedModels.summary.user.organizationId && (
              <span>
                Organization: <span className="font-medium">{unifiedModels.summary.user.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Admin Models Section */}
        {unifiedModels.data.admin.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Crown className="h-3 w-3 text-amber-600" />
              Admin External APIs ({unifiedModels.data.admin.length})
            </div>
            {unifiedModels.data.admin.map((model) => (
              <DropdownMenuItem
                key={model._id}
                onClick={() => handleModelSelect(model)}
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  isModelSelected(model) ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getCategoryIcon(model.category)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getModelDisplayName(model)}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.provider} • {model.apiName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getSourceBadge(model.source)}
                  {isModelSelected(model) && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
            <Separator className="my-2" />
          </>
        )}

        {/* Organization Models Section */}
        {unifiedModels.data.organization.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Building className="h-3 w-3 text-blue-600" />
              Organization Models ({unifiedModels.data.organization.length})
            </div>
            {unifiedModels.data.organization.map((model) => (
              <DropdownMenuItem
                key={model._id}
                onClick={() => handleModelSelect(model)}
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  isModelSelected(model) ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getCategoryIcon(model.category)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getModelDisplayName(model)}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.size} • {model.organizationName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getSourceBadge(model.source)}
                  {isModelSelected(model) && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
            <Separator className="my-2" />
          </>
        )}

        {/* User External APIs Section */}
        {unifiedModels.data.user.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-3 w-3 text-green-600" />
              Personal External APIs ({unifiedModels.data.user.length})
            </div>
            {unifiedModels.data.user.map((model) => (
              <DropdownMenuItem
                key={model._id}
                onClick={() => handleModelSelect(model)}
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  isModelSelected(model) ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getCategoryIcon(model.category)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getModelDisplayName(model)}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.provider} • {model.apiName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getSourceBadge(model.source)}
                  {isModelSelected(model) && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
            <Separator className="my-2" />
          </>
        )}

        {/* Local Downloaded Models Section */}
        {unifiedModels.data.local.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <HardDrive className="h-3 w-3 text-purple-600" />
              Downloaded Models ({unifiedModels.data.local.length})
            </div>
            {unifiedModels.data.local.map((model) => (
              <DropdownMenuItem
                key={model._id}
                onClick={() => handleModelSelect(model)}
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  isModelSelected(model) ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getCategoryIcon(model.category)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getModelDisplayName(model)}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.size} • Used {model.usageCount || 0} times
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getSourceBadge(model.source)}
                  {isModelSelected(model) && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
            <Separator className="my-2" />
          </>
        )}

        {/* No Models Available */}
        {unifiedModels.summary.total === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No models available</p>
            <p className="text-xs">Configure external APIs or download models to get started</p>
          </div>
        )}

        {/* Compare Mode Toggle */}
        {onToggleCompare && unifiedModels.summary.total > 1 && (
          <>
            <Separator className="my-2" />
            <DropdownMenuItem
              onClick={onToggleCompare}
              className="flex items-center gap-2 text-center justify-center"
            >
              <Shield className="h-4 w-4" />
              <span>{compareMode ? "Disable" : "Enable"} Multi-Model Compare</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Refresh Button */}
        <Separator className="my-2" />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            fetchUnifiedModels();
          }}
          className="flex items-center gap-2 text-center justify-center text-blue-600"
        >
          <Info className="h-4 w-4" />
          <span>Refresh Models</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UnifiedModelSelector;