import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Model {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
}

interface LazyModelListProps {
  models: Model[];
  maxInitial?: number;
  loadIncrement?: number;
}

export function LazyModelList({ models, maxInitial = 5, loadIncrement = 5 }: LazyModelListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(maxInitial);
  const [loading, setLoading] = useState(false);

  const visibleModels = isExpanded ? models.slice(0, visibleCount) : models.slice(0, maxInitial);
  const hasMore = visibleCount < models.length;
  const totalRemaining = models.length - visibleCount;

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
      setVisibleCount(maxInitial);
    }
  };

  const loadMore = async () => {
    setLoading(true);
    // Simulate loading delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));
    setVisibleCount(prev => Math.min(prev + loadIncrement, models.length));
    setLoading(false);
  };

  // Handle scroll-based loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 5;
    
    if (isNearBottom && hasMore && !loading && isExpanded) {
      loadMore();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {models.length} selected model{models.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-8 px-2"
        >
          <span className="text-xs mr-1">
            {isExpanded ? 'Hide' : 'Show'} models
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <Card className="">
          <CardContent className="p-3">
            <div 
              className="max-h-48 overflow-y-auto space-y-2"
              onScroll={handleScroll}
            >
              {visibleModels.map((model, index) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-2 border rounded-md transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {model.name}
                    </p>
                    {model.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {model.description}
                      </p>
                    )}
                  </div>
                  {model.context_length && (
                    <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {model.context_length.toLocaleString()} tokens
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex items-center justify-center py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                </div>
              )}
              
              {!loading && hasMore && isExpanded && (
                <div className="text-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    className="text-xs"
                  >
                    Load {Math.min(loadIncrement, totalRemaining)} more models
                  </Button>
                </div>
              )}
            </div>
            
            {!hasMore && isExpanded && models.length > maxInitial && (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  All {models.length} models loaded
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}