import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, 
  Gem, 
  Wind, 
  Brain, 
  Atom, 
  Download,
  Check,
  Cpu,
  HardDrive,
  Zap,
  Info,
  Tag,
  Settings,
  Trash2,
  ShoppingCart,
  Star,
  DollarSign,
  X,
  CheckCircle
} from "lucide-react";
import { 
  getCategorizedModelsForUser, 
  downloadModelWithProgress,
  removeDownloadedModel,
  requestModelPurchase,
  updateModelUsage,
  type DownloadedModel,
  type AvailableToDownloadModel,
  type AvailableForPurchaseModel,
  type DownloadProgress,
  type CategorizedModelsResponse
} from "@/services/categorizedModels";
import { useToast } from "@/hooks/use-toast";

interface CategorizedModelSelectorProps {
  selected: string;
  onSelect: (modelName: string) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "coding":
      return <Brain className="h-4 w-4" />;
    case "general":
      return <Wind className="h-4 w-4" />;
    case "creative":
      return <Zap className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

// Model icon function for backward compatibility
const modelIcon = (modelName: string) => {
  const lowerName = modelName.toLowerCase();
  if (lowerName.includes('gemma')) {
    return <Gem className="h-4 w-4" />;
  } else if (lowerName.includes('phi')) {
    return <Atom className="h-4 w-4" />;
  } else if (lowerName.includes('llama')) {
    return <Brain className="h-4 w-4" />;
  }
  return <Wind className="h-4 w-4" />;
};

const getPerformanceTierColor = (tier: string) => {
  switch (tier) {
    case "fast":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "balanced":
      return "bg-indigo-100 text-indigo-700 border-indigo-300";
    case "powerful":
      return "bg-rose-100 text-rose-700 border-rose-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
};

const ModelDetailPanel: React.FC<{ 
  model: DownloadedModel | AvailableToDownloadModel | AvailableForPurchaseModel;
  type: 'downloaded' | 'available' | 'purchase';
  onDownload?: (modelName: string) => void;
  onRemove?: (modelName: string) => void;
  onRequestPurchase?: (modelId: string) => void;
  isDownloading?: boolean;
  progress?: DownloadProgress;
}> = ({ model, type, onDownload, onRemove, onRequestPurchase, isDownloading, progress }) => {
  const { toast } = useToast();

  const handleAction = () => {
    switch (type) {
      case 'available':
        if (onDownload) {
          onDownload(model.name);
        }
        break;
      case 'purchase':
        if (onRequestPurchase) {
          onRequestPurchase(model._id);
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getCategoryIcon(model.category)}
          <h3 className="text-lg font-semibold">{model.display_name}</h3>
          <Badge className={getPerformanceTierColor(model.performance_tier)}>
            {model.performance_tier}
          </Badge>
          {type === 'purchase' && (model as AvailableForPurchaseModel).popular && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
              <Star className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>
        <p className="text-sm font-mono text-muted-foreground">{model.name}</p>
        <p className="text-sm text-muted-foreground">{model.description}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{model.size}</p>
            <p className="text-xs text-muted-foreground">Download Size</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{model.min_ram_gb}GB</p>
            <p className="text-xs text-muted-foreground">Min RAM</p>
          </div>
        </div>
      </div>

      {/* Type-specific information */}
      {type === 'downloaded' && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Downloaded</span>
          </div>
          <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
            <p>Downloaded: {new Date((model as DownloadedModel).pulled_at).toLocaleDateString()}</p>
            <p>Usage: {(model as DownloadedModel).usage_count} times</p>
            {(model as DownloadedModel).last_used && (
              <p>Last used: {new Date((model as DownloadedModel).last_used!).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}

      {type === 'available' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Available to Download</span>
          </div>
          <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
            <p>Purchased: {new Date((model as AvailableToDownloadModel).purchased_at).toLocaleDateString()}</p>
            <p>Cost: {formatPrice((model as AvailableToDownloadModel).org_purchase_details.cost)} ({(model as AvailableToDownloadModel).org_purchase_details.billing_cycle})</p>
          </div>
        </div>
      )}

      {type === 'purchase' && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Pricing Options</span>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium">{formatPrice((model as AvailableForPurchaseModel).pricing.monthly)}</p>
                <p className="text-muted-foreground">Monthly</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium">{formatPrice((model as AvailableForPurchaseModel).pricing.yearly)}</p>
                <p className="text-muted-foreground">Yearly</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium">{formatPrice((model as AvailableForPurchaseModel).pricing.one_time)}</p>
                <p className="text-muted-foreground">One-time</p>
              </div>
            </div>
            {(model as AvailableForPurchaseModel).recommended && (
              <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300">
                <Star className="h-3 w-3" />
                <span>Recommended for your organization</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category & Tags */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium mb-2">Category</p>
          <Badge variant="outline" className="capitalize">
            {model.category}
          </Badge>
        </div>
        
        {model.tags && model.tags.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {model.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Use Cases */}
      {model.use_cases && model.use_cases.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Best For</p>
          <div className="space-y-1">
            {model.use_cases.map((useCase, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-3 w-3 text-green-600" />
                <span className="capitalize">{useCase.replace("-", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Display */}
      {isDownloading && progress && (
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {progress.status || 'Downloading...'}
            </span>
          </div>
          
          {progress.percentage !== undefined && progress.percentage > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                <span>{progress.percentage}%</span>
                {progress.completed && progress.total && (
                  <span>
                    {(progress.completed / (1024 * 1024)).toFixed(1)}MB / {(progress.total / (1024 * 1024)).toFixed(1)}MB
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {progress && progress.type === 'error' && (
        <div className="space-y-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">
              Download Failed
            </span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            {progress.error}
          </p>
          {progress.suggestions && progress.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-800 dark:text-red-200">Suggestions:</p>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                {progress.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t space-y-2">
        {type === 'downloaded' && (
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" disabled>
              <Check className="h-4 w-4 mr-2" />
              Downloaded
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onRemove && onRemove(model.name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {type === 'available' && (
          <Button 
            className="w-full" 
            onClick={handleAction}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : `Download ${model.size}`}
          </Button>
        )}

        {type === 'purchase' && (
          <Button 
            className="w-full" 
            onClick={handleAction}
            variant="outline"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Request Purchase
          </Button>
        )}
      </div>
    </div>
  );
};

const CategorizedModelSelector: React.FC<CategorizedModelSelectorProps> = ({
  selected,
  onSelect,
  compareMode,
  onToggleCompare,
}) => {
  const { toast } = useToast();
  const [modelsData, setModelsData] = useState<CategorizedModelsResponse | null>(null);
  const [selectedModelDetail, setSelectedModelDetail] = useState<any>(null);
  const [selectedModelType, setSelectedModelType] = useState<'downloaded' | 'available' | 'purchase'>('downloaded');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  // Fetch categorized models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await getCategorizedModelsForUser();
        if (response.success) {
          setModelsData(response);
        }
      } catch (error) {
        console.error('Failed to fetch categorized models:', error);
        toast({
          title: "Error",
          description: "Failed to load models. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [toast]);

  // Get currently selected model details
  const getSelectedModelDetails = () => {
    if (!modelsData) return null;
    
    // Look for selected model in all categories
    const allModels = [
      ...modelsData.data.downloaded,
      ...modelsData.data.available_to_download,
      ...modelsData.data.available_for_purchase
    ];
    
    return allModels.find(model => model.name === selected) || 
           (modelsData.data.downloaded.length > 0 ? modelsData.data.downloaded[0] : allModels[0]);
  };

  const selectedModelDetails = getSelectedModelDetails();

  const handleModelClick = (model: any, type: 'downloaded' | 'available' | 'purchase') => {
    setSelectedModelDetail(model);
    setSelectedModelType(type);
    setIsDetailOpen(true);
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      setDownloadingModels(prev => new Set(prev).add(modelName));
      
      // Initialize progress
      setDownloadProgress(prev => new Map(prev).set(modelName, {
        type: 'starting',
        status: 'Starting download...',
        percentage: 0
      }));

      await downloadModelWithProgress(modelName, {
        onProgress: (progress) => {
          setDownloadProgress(prev => new Map(prev).set(modelName, progress));
        },
        onError: (error) => {
          setDownloadProgress(prev => new Map(prev).set(modelName, error));
          setDownloadingModels(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelName);
            return newSet;
          });
          toast({
            title: "Download Failed",
            description: error.error || "Failed to download model",
            variant: "destructive",
          });
        },
        onComplete: async (result) => {
          if (result.success) {
            // Refresh models data
            const response = await getCategorizedModelsForUser();
            if (response.success) {
              setModelsData(response);
            }
            
            toast({
              title: "Download Complete",
              description: `Successfully downloaded ${modelName}`,
            });
          }
          
          setDownloadProgress(prev => new Map(prev).set(modelName, result));
          setDownloadingModels(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelName);
            return newSet;
          });
          
          // Clear progress after delay
          setTimeout(() => {
            setDownloadProgress(prev => {
              const newMap = new Map(prev);
              newMap.delete(modelName);
              return newMap;
            });
          }, 3000);
        }
      });

    } catch (error) {
      console.error('Failed to download model:', error);
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
      toast({
        title: "Download Failed",
        description: "Failed to start download",
        variant: "destructive",
      });
    }
  };

  const handleRemoveModel = async (modelName: string) => {
    try {
      const response = await removeDownloadedModel(modelName);
      if (response.success) {
        // Refresh models data
        const newData = await getCategorizedModelsForUser();
        if (newData.success) {
          setModelsData(newData);
        }
        
        toast({
          title: "Model Removed",
          description: "Model has been removed successfully",
        });
      }
    } catch (error) {
      console.error('Failed to remove model:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove model",
        variant: "destructive",
      });
    }
  };

  const handleRequestPurchase = async (modelId: string) => {
    try {
      const response = await requestModelPurchase(modelId, "User requested this model through the model selector.");
      if (response.success) {
        toast({
          title: "Purchase Request Sent",
          description: "Your admin has been notified about this model request",
        });
      }
    } catch (error) {
      console.error('Failed to request purchase:', error);
      toast({
        title: "Request Failed",
        description: "Failed to send purchase request",
        variant: "destructive",
      });
    }
  };

  const handleModelSelect = async (modelName: string) => {
    onSelect(modelName);
    // Update usage statistics
    try {
      await updateModelUsage(modelName);
    } catch (error) {
      console.warn('Failed to update model usage:', error);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Settings className="h-4 w-4 mr-2 animate-spin" />
        Loading models...
      </Button>
    );
  }

  if (!modelsData) {
    return (
      <Button variant="outline" size="sm" disabled>
        <X className="h-4 w-4 mr-2" />
        Failed to load models
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 pr-2"
          >
            {selectedModelDetails ? (
              <>
                {getCategoryIcon(selectedModelDetails.category)}
                <span className="font-medium">{selectedModelDetails.display_name}</span>
              </>
            ) : (
              <>
                <Wind className="h-4 w-4" />
                <span className="font-medium">Select Model</span>
              </>
            )}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-80 bg-popover border border-border p-2"
        >
          {/* Organization Info */}
          <div className="px-2 py-2 text-xs text-muted-foreground border-b mb-2">
            Organization: <span className="font-medium">{modelsData.organization.name}</span>
          </div>

          {/* Downloaded Models Section */}
          {modelsData.data.downloaded.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Downloaded Models ({modelsData.data.downloaded.length})
              </div>
              {modelsData.data.downloaded.map((model) => (
                <DropdownMenuItem
                  key={model._id}
                  onClick={() => handleModelSelect(model.name)}
                  className={`flex items-center justify-between p-3 cursor-pointer ${
                    selected === model.name ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(model.category)}
                    <div>
                      <p className="font-medium">{model.display_name}</p>
                      <p className="text-xs text-muted-foreground">{model.size}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModelClick(model, 'downloaded');
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <Separator className="my-2" />
            </>
          )}

          {/* Available to Download Section */}
          {modelsData.data.available_to_download.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Available to Download ({modelsData.data.available_to_download.length})
              </div>
              {modelsData.data.available_to_download.map((model) => (
                <DropdownMenuItem
                  key={model._id}
                  onClick={() => handleModelClick(model, 'available')}
                  className="flex items-center justify-between p-3 cursor-pointer opacity-75 hover:opacity-100"
                >
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(model.category)}
                    <div>
                      <p className="font-medium">{model.display_name}</p>
                      <p className="text-xs text-muted-foreground">{model.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPerformanceTierColor(model.performance_tier)} text-xs`}>
                      {model.performance_tier}
                    </Badge>
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </div>
                </DropdownMenuItem>
              ))}
              <Separator className="my-2" />
            </>
          )}

          {/* Available for Purchase Section */}
          {modelsData.data.available_for_purchase.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Available (For Purchase) ({modelsData.data.available_for_purchase.length})
              </div>
              {modelsData.data.available_for_purchase.slice(0, 5).map((model) => (
                <DropdownMenuItem
                  key={model._id}
                  onClick={() => handleModelClick(model, 'purchase')}
                  className="flex items-center justify-between p-3 cursor-pointer opacity-60 hover:opacity-100"
                >
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(model.category)}
                    <div>
                      <p className="font-medium">{model.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        From {formatPrice(model.pricing.monthly)}/mo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {model.popular && <Star className="h-3 w-3 text-amber-500" />}
                    {model.recommended && <Badge variant="secondary" className="text-xs">Rec</Badge>}
                    <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                  </div>
                </DropdownMenuItem>
              ))}
              {modelsData.data.available_for_purchase.length > 5 && (
                <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                  +{modelsData.data.available_for_purchase.length - 5} more models available
                </div>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Model Detail Side Panel */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Model Details</SheetTitle>
            <SheetDescription>
              View model specifications and options
            </SheetDescription>
          </SheetHeader>
          
          {selectedModelDetail && (
            <div className="mt-6">
              <ModelDetailPanel
                model={selectedModelDetail}
                type={selectedModelType}
                onDownload={handleDownloadModel}
                onRemove={handleRemoveModel}
                onRequestPurchase={handleRequestPurchase}
                isDownloading={downloadingModels.has(selectedModelDetail.name)}
                progress={downloadProgress.get(selectedModelDetail.name)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export { CategorizedModelSelector, modelIcon };