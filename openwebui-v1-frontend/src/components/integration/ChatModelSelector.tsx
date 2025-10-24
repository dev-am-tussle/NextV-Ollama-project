import { useEffect, useState } from 'react';
import { Bot, ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  const { availableModels, fetchAvailableModels, isLoadingModels } = useIntegrationStore();

  useEffect(() => {
    // Fetch available models when component mounts
    fetchAvailableModels();
  }, [fetchAvailableModels]);

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
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
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No models found.</CommandEmpty>
          
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <CommandGroup key={provider} heading={provider.toUpperCase()}>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleModelSelect(model.id)}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="flex items-center">
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
                    <Zap className="h-4 w-4 text-blue-600" />
                  )}
                </CommandItem>
              ))}
              
              {Object.keys(modelsByProvider).indexOf(provider) < Object.keys(modelsByProvider).length - 1 && (
                <Separator className="my-2" />
              )}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  );
}