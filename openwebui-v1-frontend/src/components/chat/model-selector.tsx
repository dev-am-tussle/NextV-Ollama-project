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
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  GitCompare, 
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
  Trash2
} from "lucide-react";
import { getAvailableModels, getUserPulledModels, addPulledModel, removePulledModel, pullModelWithProgress, removeModelFromSystem, type AvailableModel, type PulledModel, type PullProgress } from "@/services/models";

// Extend the AvailableModel interface for frontend usage
interface ModelWithPullStatus extends AvailableModel {
  is_pulled?: boolean; // Will be determined by checking against user's pulled models
}

interface ModelSelectorProps {
  selected: string; // Now using backend model names directly (e.g., "gemma:2b", "phi:2.7b")
  onSelect: (modelName: string) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  // optional list of models user is allowed to use (backend-provided)
  availableModels?: string[] | null;
}

const iconFor = (modelName: string) => {
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

// Helper function to get display name from model name
const getDisplayName = (modelName: string): string => {
  // Use the display_name from backend, fallback to model name
  return modelName;
};

const ModelDetailPanel: React.FC<{ 
  model: ModelWithPullStatus; 
  onPull: (modelName: string) => void;
  isPulling: boolean;
  progress?: PullProgress;
}> = ({ model, onPull, isPulling, progress }) => {
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
      {isPulling && progress && (
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

      {/* Success Display */}
      {progress && progress.type === 'complete' && progress.success && (
        <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Download Complete!
            </span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            {progress.message || `Successfully downloaded ${model.display_name}`}
          </p>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-4 border-t">
        {model.is_pulled ? (
          <Button className="w-full" variant="outline" disabled>
            <Check className="h-4 w-4 mr-2" />
            Already Downloaded
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={() => onPull(model.name)}
            disabled={isPulling}
          >
            <Download className="h-4 w-4 mr-2" />
            {isPulling ? "Downloading..." : `Download ${model.size}`}
          </Button>
        )}
      </div>
    </div>
  );
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selected,
  onSelect,
  compareMode,
  onToggleCompare,
  availableModels,
}) => {
  const [allModels, setAllModels] = useState<ModelWithPullStatus[]>([]);
  const [userPulledModels, setUserPulledModels] = useState<PulledModel[]>([]);
  const [selectedModelDetail, setSelectedModelDetail] = useState<ModelWithPullStatus | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pullingModels, setPullingModels] = useState<Set<string>>(new Set());
  const [pullProgress, setPullProgress] = useState<Map<string, PullProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  // Fetch available models and user's pulled models from backend
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        
        // Fetch both available models and user's pulled models
        const [availableResponse, pulledResponse] = await Promise.all([
          getAvailableModels(),
          getUserPulledModels().catch(err => {
            console.warn('Failed to fetch user pulled models:', err);
            return { success: false, data: [], count: 0 };
          })
        ]);
        
        if (availableResponse.success) {
          // Create a Set of pulled model names for quick lookup
          const pulledModelNames = new Set(
            pulledResponse.success ? pulledResponse.data.map(model => model.name) : []
          );
          
          // Mark models as pulled based on user's pulled models
          const modelsWithPullStatus: ModelWithPullStatus[] = availableResponse.data.map(model => ({
            ...model,
            is_pulled: pulledModelNames.has(model.name)
          }));
          
          setAllModels(modelsWithPullStatus);
          
          if (pulledResponse.success) {
            setUserPulledModels(pulledResponse.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Separate pulled and unpulled models
  const pulledModels = allModels.filter(model => model.is_pulled && model.is_active);
  const unpulledModels = allModels.filter(model => !model.is_pulled && model.is_active);

  // Get currently selected model details for display
  const selectedModelDetails = allModels.find(model => model.name === selected) || 
    (pulledModels.length > 0 ? pulledModels[0] : allModels[0]);

  // Helper to get model display name
  const getModelDisplayName = (model: ModelWithPullStatus) => {
    return model.display_name || model.name;
  };

  const handleModelClick = (model: ModelWithPullStatus) => {
    setSelectedModelDetail(model);
    setIsDetailOpen(true);
  };

  const handlePullModel = async (modelName: string) => {
    try {
      setPullingModels(prev => new Set(prev).add(modelName));
      
      // Initialize progress
      setPullProgress(prev => new Map(prev).set(modelName, {
        type: 'progress',
        status: 'Starting download...',
        percentage: 0
      }));

      // Use real model pulling with progress tracking
      await pullModelWithProgress(modelName, {
        onProgress: (progress) => {
          console.log(`[ModelSelector] Progress for ${modelName}:`, progress);
          setPullProgress(prev => new Map(prev).set(modelName, progress));
        },
        onError: (error) => {
          console.error(`[ModelSelector] Error pulling ${modelName}:`, error);
          setPullProgress(prev => new Map(prev).set(modelName, error));
          
          // Remove from pulling set on error
          setPullingModels(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelName);
            return newSet;
          });
        },
        onComplete: async (result) => {
          console.log(`[ModelSelector] Completed pulling ${modelName}:`, result);
          
          if (result.success) {
            // Update model status to pulled
            setAllModels(prev => prev.map(model => 
              model.name === modelName 
                ? { ...model, is_pulled: true }
                : model
            ));
            
            // Add to user's pulled models via API
            try {
              await addPulledModel(modelName);
              
              // Refresh user pulled models
              const pulledResponse = await getUserPulledModels();
              if (pulledResponse.success) {
                setUserPulledModels(pulledResponse.data);
              }
            } catch (dbError) {
              console.warn('Failed to update DB after successful pull:', dbError);
            }
          }
          
          // Update progress with completion status
          setPullProgress(prev => new Map(prev).set(modelName, result));
          
          // Remove from pulling set
          setPullingModels(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelName);
            return newSet;
          });
          
          // Clear progress after a delay
          setTimeout(() => {
            setPullProgress(prev => {
              const newMap = new Map(prev);
              newMap.delete(modelName);
              return newMap;
            });
          }, 3000);
        }
      });

    } catch (error) {
      console.error('Failed to start model pull:', error);
      
      // Remove from pulling set on error
      setPullingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
      
      // Set error in progress
      setPullProgress(prev => new Map(prev).set(modelName, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to start download',
        suggestions: ['Try again later', 'Check internet connection']
      }));
    }
  };

  const handleRemoveModel = async (modelName: string) => {
    try {
      const response = await removePulledModel(modelName);

      if (response.success) {
        // Update model status to not pulled
        setAllModels(prev => prev.map(model => 
          model.name === modelName 
            ? { ...model, is_pulled: false }
            : model
        ));
        
        // Refresh user pulled models
        const pulledResponse = await getUserPulledModels();
        if (pulledResponse.success) {
          setUserPulledModels(pulledResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to remove model:', error);
    }
  };

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
                <span className="font-medium">{getModelDisplayName(selectedModelDetails)}</span>
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
          {/* Pulled Models Section */}
          {pulledModels.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Downloaded Models
              </div>
              {pulledModels.map((model) => (
                <DropdownMenuItem
                  key={model._id}
                  onClick={() => {
                    // Use model.name directly for backend communication
                    onSelect(model.name);
                  }}
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveModel(model.name);
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      title="Remove model"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModelClick(model);
                      }}
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
              <Separator className="my-2" />
            </>
          )}

          {/* Available Models Section */}
          {unpulledModels.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Available to Download
              </div>
              {unpulledModels.map((model) => (
                <DropdownMenuItem
                  key={model._id}
                  onClick={() => handleModelClick(model)}
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

          {/* Compare Mode Toggle */}
          <DropdownMenuItem
            onClick={onToggleCompare}
            className="flex items-center gap-2"
          >
            <GitCompare className="h-4 w-4" />
            <span>{compareMode ? "Disable" : "Enable"} Compare</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Model Detail Side Panel */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Model Details</SheetTitle>
            <SheetDescription>
              View model specifications and download options
            </SheetDescription>
          </SheetHeader>
          
          {selectedModelDetail && (
            <div className="mt-6">
              <ModelDetailPanel
                model={selectedModelDetail}
                onPull={handlePullModel}
                isPulling={pullingModels.has(selectedModelDetail.name)}
                progress={pullProgress.get(selectedModelDetail.name)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export { iconFor as modelIcon, getDisplayName };
