import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ModelBadge } from './ModelBadge';
import { AddModelDialog } from './AddModelDialog';
import { CompareAlertModal } from './CompareAlertModal';
import { useCompareStore } from '@/stores/useCompareStore';
import { cn } from '@/lib/utils';

export const CompareBar: React.FC = () => {
  const isComparing = useCompareStore((state) => state.isComparing);
  const selectedModels = useCompareStore((state) => state.selectedModels);
  const limit = useCompareStore((state) => state.limit);
  const removeModel = useCompareStore((state) => state.removeModel);
  const hasShownLimitAlert = useCompareStore((state) => state.hasShownLimitAlert);
  const resetLimitAlert = useCompareStore((state) => state.resetLimitAlert);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Show alert when limit is reached
  useEffect(() => {
    if (hasShownLimitAlert) {
      setShowLimitAlert(true);
      // Reset the flag after showing
      setTimeout(() => resetLimitAlert(), 100);
    }
  }, [hasShownLimitAlert, resetLimitAlert]);

  // Check scroll position to show/hide fade indicators
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [selectedModels]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const handleAddModel = () => {
    if (selectedModels.length >= limit) {
      setShowLimitAlert(true);
    } else {
      setShowAddDialog(true);
    }
  };

  if (!isComparing) return null;

  return (
    <>
      {/* CompareBar Container with slide-in animation */}
      <div 
        className={cn(
          "w-full bg-muted/50 border-b shadow-sm backdrop-blur-sm",
          "animate-in slide-in-from-top duration-300"
        )}
      >
        <div className="container mx-auto">
          <div className="relative flex items-center gap-2 py-2 px-3">
            {/* Left Scroll Button */}
            {showLeftFade && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md"
                onClick={scrollLeft}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Label */}
            <div className="flex-shrink-0 text-sm font-medium text-muted-foreground">
              Compare:
            </div>

            {/* Models Container with horizontal scroll */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide"
              onScroll={checkScroll}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* Model Badges */}
              {selectedModels.map((model, index) => (
                <div
                  key={model.id}
                  className="animate-in fade-in-0 slide-in-from-left-5 duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ModelBadge
                    model={model}
                    onRemove={removeModel}
                  />
                </div>
              ))}

              {/* Add Model Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-shrink-0 rounded-full px-3 py-1.5 h-auto",
                        "hover:bg-primary hover:text-primary-foreground transition-all",
                        selectedModels.length >= limit && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={handleAddModel}
                      disabled={selectedModels.length >= limit}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="text-sm">Add Model</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {selectedModels.length >= limit 
                        ? `Limit reached (${limit} models)` 
                        : 'Compare another model side-by-side'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Right Scroll Button */}
            {showRightFade && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md"
                onClick={scrollRight}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Model Count Info */}
          {selectedModels.length > 0 && (
            <div className="text-xs text-muted-foreground text-center pb-2">
              {selectedModels.length} of {limit} models selected
            </div>
          )}
        </div>
      </div>

      {/* Add Model Dialog */}
      <AddModelDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />

      {/* Limit Alert Modal */}
      <CompareAlertModal
        open={showLimitAlert}
        onOpenChange={setShowLimitAlert}
        limit={limit}
      />
    </>
  );
};
