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
import { getAvailableModels, getUserPulledModels, addPulledModel, removePulledModel, type AvailableModel, type PulledModel } from "@/services/models";

export type ModelKey = "Gemma" | "Phi";

// Extend the AvailableModel interface for frontend usage
interface ModelWithPullStatus extends AvailableModel {
  is_pulled?: boolean; // Will be determined by checking against user's pulled models
}

interface ModelSelectorProps {
  selected: ModelKey;
  onSelect: (m: ModelKey) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  // optional list of models user is allowed to use (backend-provided)
  availableModels?: string[] | null;
}

const iconFor = (model: ModelKey) => {
  switch (model) {
    case "Gemma":
      return <Gem className="h-4 w-4" />;
    case "Phi":
      return <Atom className="h-4 w-4" />;
    default:
      return <Wind className="h-4 w-4" />;
  }
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

// Single source of truth mapping from UI key to backend model id.
export const keyToBackend: Record<ModelKey, string> = {
  Gemma: "gemma:2b",
  Phi: "phi:2.7b",
};

const ModelDetailPanel: React.FC<{ 
  model: ModelWithPullStatus; 
  onPull: (modelName: string) => void;
  isPulling: boolean;
}> = ({ model, onPull, isPulling }) => {
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

  // Legacy ModelKey support for existing dropdown
  const allowedBackendIds = new Set<string>();
  if (availableModels && availableModels.length > 0) {
    for (const m of availableModels) {
      if (typeof m === "string" && m.trim()) allowedBackendIds.add(m);
    }
  } else {
    allowedBackendIds.add("gemma:2b");
    allowedBackendIds.add("phi:2.7b");
  }

  const backendToKey = Object.entries(keyToBackend).reduce(
    (acc, [uiKey, backendId]) => {
      if (!acc[backendId]) acc[backendId] = uiKey as ModelKey;
      return acc;
    },
    {} as Record<string, ModelKey>
  );

  let models: ModelKey[] = Array.from(allowedBackendIds)
    .map((id) => backendToKey[id])
    .filter(Boolean) as ModelKey[];

  if (models.length === 0) models = ["Gemma", "Phi"];

  const handleModelClick = (model: ModelWithPullStatus) => {
    setSelectedModelDetail(model);
    setIsDetailOpen(true);
  };

  const handlePullModel = async (modelName: string) => {
    try {
      setPullingModels(prev => new Set(prev).add(modelName));
      
      // Use the new addPulledModel API service
      const response = await addPulledModel(modelName);

      if (response.success) {
        // Update model status to pulled
        setAllModels(prev => prev.map(model => 
          model.name === modelName 
            ? { ...model, is_pulled: true }
            : model
        ));
        
        // Refresh user pulled models
        const pulledResponse = await getUserPulledModels();
        if (pulledResponse.success) {
          setUserPulledModels(pulledResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
    } finally {
      setPullingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
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
            {iconFor(selected)}
            <span className="font-medium">{selected}</span>
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
                    // Convert to ModelKey if possible, otherwise use first available
                    const modelKey = backendToKey[model.name] || models[0];
                    onSelect(modelKey);
                  }}
                  className="flex items-center justify-between p-3 cursor-pointer"
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
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export { iconFor as modelIcon };
