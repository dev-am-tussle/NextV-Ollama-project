import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { CompareModel } from '@/stores/useCompareStore';
import { cn } from '@/lib/utils';

interface ModelBadgeProps {
  model: CompareModel;
  onRemove: (modelId: string) => void;
  className?: string;
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({ 
  model, 
  onRemove,
  className 
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-2 rounded-full bg-secondary text-sm px-3 py-1.5",
              "hover:bg-secondary/80 transition-all duration-200",
              "border border-border shadow-sm",
              className
            )}
          >
            {/* Model Name */}
            <span className="font-medium text-foreground truncate max-w-[150px]">
              {model.display_name || model.name}
            </span>

            {/* Performance Badge (if available) */}
            {model.performance_tier && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs px-1.5 py-0",
                  model.performance_tier === 'fast' && "bg-emerald-50 text-emerald-700 border-emerald-300",
                  model.performance_tier === 'balanced' && "bg-indigo-50 text-indigo-700 border-indigo-300",
                  model.performance_tier === 'powerful' && "bg-rose-50 text-rose-700 border-rose-300"
                )}
              >
                {model.performance_tier}
              </Badge>
            )}

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(model.id);
              }}
              aria-label={`Remove ${model.display_name || model.name} from comparison`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </TooltipTrigger>
        
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{model.display_name || model.name}</p>
            {model.provider && (
              <p className="text-xs text-muted-foreground">
                Provider: <span className="font-medium">{model.provider}</span>
              </p>
            )}
            {model.category && (
              <p className="text-xs text-muted-foreground">
                Category: <span className="font-medium capitalize">{model.category}</span>
              </p>
            )}
            {model.size && (
              <p className="text-xs text-muted-foreground">
                Size: <span className="font-medium">{model.size}</span>
              </p>
            )}
            {model.performance_tier && (
              <p className="text-xs text-muted-foreground">
                Performance: <span className="font-medium capitalize">{model.performance_tier}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
