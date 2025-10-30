import { useEffect, useState } from 'react';
import { Bot, ChevronDown, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntegrationStore } from '@/stores/useIntegrationStore';
import { cn } from '@/lib/utils';

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface ChatModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ChatModelSelector({ 
  selectedModel, 
  onModelSelect, 
  disabled = false 
}: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { availableModels, fetchAvailableModels, isLoadingModels } = useIntegrationStore();

  useEffect(() => {
    // Fetch available models when component mounts
    fetchAvailableModels();
  }, [fetchAvailableModels]);

  // Filter models based on search query
  const filteredModels = availableModels.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered models by provider
  const modelsByProvider = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const selectedModelInfo = availableModels.find(model => model.id === selectedModel);

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    setOpen(false);
    setSearchQuery('');
  };

  if (availableModels.length === 0 && !isLoadingModels) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bot className="h-4 w-4" />
        <span className="text-sm">No external models connected</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoadingModels}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 flex-shrink-0" />
            {selectedModelInfo ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{selectedModelInfo.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedModelInfo.provider}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {isLoadingModels ? 'Loading models...' : 'Select model'}
              </span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Models List */}
          <ScrollArea className="h-[300px]">
            {filteredModels.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No models found.
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(modelsByProvider).map(([provider, models], providerIndex) => (
                  <div key={provider}>
                    {/* Provider Header */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {provider}
                    </div>
                    
                    {/* Models in this provider */}
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-2 py-3 rounded-md hover:bg-accent transition-colors text-left",
                          selectedModel === model.id && "bg-accent"
                        )}
                      >
                        <div className="flex items-center pt-0.5">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            selectedModel === model.id ? "bg-blue-600" : "bg-gray-300"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {model.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                          
                          {model.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {model.description}
                            </p>
                          )}
                        </div>
                        
                        {selectedModel === model.id && (
                          <Zap className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    
                    {/* Separator between providers */}
                    {providerIndex < Object.keys(modelsByProvider).length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}