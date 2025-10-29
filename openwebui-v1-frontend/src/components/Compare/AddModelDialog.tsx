import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { getCategorizedModelsForUser } from '@/services/categorizedModels';
import { Button } from '@/components/ui/button';
import { useCompareStore, CompareModel } from '@/stores/useCompareStore';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddModelDialog: React.FC<AddModelDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { addModel, selectedModels } = useCompareStore();
  const { toast } = useToast();

  // Fetch available models
  const {
    data: modelsData,
    isLoading
  } = useQuery({
    queryKey: ['categorized-models'],
    queryFn: getCategorizedModelsForUser,
    enabled: open, // Only fetch when dialog is open
  });

  // Get all models combined
  const allModels = modelsData ? [
    ...modelsData.data.downloaded,
    ...modelsData.data.availableApi || [],
    ...modelsData.data.availableToDownload,
  ] : [];

  // Filter models based on search
  const filteredModels = allModels.filter(model => {
    const query = searchQuery.toLowerCase();
    return (
      model.name.toLowerCase().includes(query) ||
      model.display_name.toLowerCase().includes(query) ||
      model.category?.toLowerCase().includes(query) ||
      model.provider?.toLowerCase().includes(query)
    );
  });

  const handleSelectModel = (model: any) => {
    const compareModel: CompareModel = {
      id: model._id,
      name: model.name,
      display_name: model.display_name,
      category: model.category,
      provider: model.provider,
      performance_tier: model.performance_tier,
      size: model.size,
    };

    const result = addModel(compareModel);
    
    if (result.success) {
      toast({
        title: "Model Added",
        description: `${model.display_name} added to comparison`,
      });
      onOpenChange(false);
      setSearchQuery(''); // Reset search
    } else {
      toast({
        title: "Cannot Add Model",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // Check if model is already selected
  const isModelSelected = (modelId: string) => {
    return selectedModels.some(m => m.id === modelId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Model to Comparison</DialogTitle>
          <DialogDescription>
            Select a model to add to your comparison. You can compare up to {useCompareStore.getState().limit} models at once.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No models found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search query</p>
              )}
            </div>
          ) : (
            filteredModels.map((model) => {
              const isSelected = isModelSelected(model._id);
              
              return (
                <div
                  key={model._id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                    isSelected 
                      ? "bg-accent border-primary opacity-60 cursor-not-allowed" 
                      : "hover:bg-accent/50 border-border"
                  )}
                  onClick={() => !isSelected && handleSelectModel(model)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {model.display_name}
                      </h4>
                      {model.performance_tier && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            model.performance_tier === 'fast' && "bg-emerald-50 text-emerald-700 border-emerald-300",
                            model.performance_tier === 'balanced' && "bg-indigo-50 text-indigo-700 border-indigo-300",
                            model.performance_tier === 'powerful' && "bg-rose-50 text-rose-700 border-rose-300"
                          )}
                        >
                          {model.performance_tier}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {model.provider && <span>{model.provider}</span>}
                      {model.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{model.category}</span>
                        </>
                      )}
                      {model.size && (
                        <>
                          <span>•</span>
                          <span>{model.size}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <Badge variant="secondary" className="ml-2">
                      Selected
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectModel(model);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
