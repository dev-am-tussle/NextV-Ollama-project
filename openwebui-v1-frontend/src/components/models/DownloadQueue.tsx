import React from 'react';
import { X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DownloadProgress } from '@/services/categorizedModels';

interface DownloadItem {
  modelName: string;
  displayName?: string;
  isDownloading: boolean;
  progress: DownloadProgress | null;
}

interface DownloadQueueProps {
  downloads: Map<string, { isDownloading: boolean; progress: DownloadProgress | null }>;
  onCancel?: (modelName: string) => void;
  onClear?: (modelName: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  downloads,
  onCancel,
  onClear,
  onClearAll,
  className
}) => {
  const downloadArray = Array.from(downloads.entries()).map(([modelName, state]) => ({
    modelName,
    ...state
  }));

  const activeDownloads = downloadArray.filter(d => d.isDownloading);
  const completedDownloads = downloadArray.filter(d => 
    !d.isDownloading && d.progress?.type === 'complete'
  );
  const failedDownloads = downloadArray.filter(d => 
    !d.isDownloading && d.progress?.type === 'error'
  );

  if (downloadArray.length === 0) {
    return null;
  }

  const getStatusIcon = (item: DownloadItem) => {
    if (item.isDownloading) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (item.progress?.type === 'complete') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (item.progress?.type === 'error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <Download className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (item: DownloadItem) => {
    if (item.isDownloading) return 'border-l-blue-500';
    if (item.progress?.type === 'complete') return 'border-l-green-500';
    if (item.progress?.type === 'error') return 'border-l-red-500';
    return 'border-l-muted';
  };

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Downloads</h3>
          {activeDownloads.length > 0 && (
            <Badge variant="default" className="text-xs">
              {activeDownloads.length} active
            </Badge>
          )}
        </div>
        
        {downloadArray.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Download List */}
      <ScrollArea className="max-h-[400px]">
        <div className="p-2 space-y-2">
          {/* Active Downloads */}
          {activeDownloads.map((item) => (
            <div
              key={item.modelName}
              className={cn(
                "p-3 rounded-md border-l-2 bg-muted/30",
                getStatusColor(item)
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(item)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.modelName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.progress?.status || 'Downloading...'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {item.progress?.percentage || 0}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onCancel?.(item.modelName)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Progress value={item.progress?.percentage || 0} className="h-1.5" />

                {item.progress?.completed && item.progress?.total && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatBytes(item.progress.completed)} / {formatBytes(item.progress.total)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {activeDownloads.length > 0 && (completedDownloads.length > 0 || failedDownloads.length > 0) && (
            <Separator className="my-2" />
          )}

          {/* Completed Downloads */}
          {completedDownloads.map((item) => (
            <div
              key={item.modelName}
              className={cn(
                "p-3 rounded-md border-l-2 bg-green-500/5",
                getStatusColor(item)
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(item)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.modelName}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Download complete
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onClear?.(item.modelName)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Failed Downloads */}
          {failedDownloads.map((item) => (
            <div
              key={item.modelName}
              className={cn(
                "p-3 rounded-md border-l-2 bg-destructive/5",
                getStatusColor(item)
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(item)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.modelName}</p>
                      <p className="text-xs text-destructive">
                        {item.progress?.error || 'Download failed'}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onClear?.(item.modelName)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {item.progress?.suggestions && item.progress.suggestions.length > 0 && (
                  <ul className="ml-6 space-y-1">
                    {item.progress.suggestions.slice(0, 2).map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground list-disc">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {downloadArray.length > 0 && (
        <div className="p-2 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {activeDownloads.length} downloading • {completedDownloads.length} completed • {failedDownloads.length} failed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
