import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DownloadProgress } from '@/services/categorizedModels';

interface ModelDownloadCardProps {
  modelName: string;
  displayName: string;
  size: string;
  description?: string;
  category?: string;
  isDownloading: boolean;
  progress: DownloadProgress | null;
  onDownload: () => void;
  onCancel?: () => void;
  className?: string;
}

export const ModelDownloadCard: React.FC<ModelDownloadCardProps> = ({
  modelName,
  displayName,
  size,
  description,
  category,
  isDownloading,
  progress,
  onDownload,
  onCancel,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    if (!progress) return null;
    
    switch (progress.type) {
      case 'starting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!progress) return '';
    
    switch (progress.type) {
      case 'starting':
        return 'Initializing download...';
      case 'progress':
        return progress.status || 'Downloading...';
      case 'complete':
        return 'Download complete!';
      case 'error':
        return progress.error || 'Download failed';
      default:
        return '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const percentage = progress?.percentage || 0;
  const isComplete = progress?.type === 'complete';
  const hasError = progress?.type === 'error';

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Progress indicator background */}
      {isDownloading && !hasError && (
        <div 
          className="absolute top-0 left-0 h-1 bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      )}
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                {category && (
                  <Badge variant="outline" className="text-xs">
                    {category}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{modelName}</p>
              {description && isExpanded && (
                <p className="text-xs text-muted-foreground mt-2">{description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {size}
              </Badge>
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="text-muted-foreground">{getStatusText()}</span>
                </div>
                <span className="font-medium">{percentage}%</span>
              </div>
              
              <Progress value={percentage} className="h-2" />
              
              {progress?.completed && progress?.total && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(progress.completed)} / {formatBytes(progress.total)}</span>
                  <span>
                    {progress.total > 0 && 
                      `${((progress.completed / progress.total) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {hasError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {progress?.error}
                {progress?.suggestions && progress.suggestions.length > 0 && (
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    {progress.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {isComplete && (
            <Alert className="py-2 border-green-500 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-xs text-green-600 dark:text-green-400">
                Model downloaded successfully and ready to use!
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isDownloading && !isComplete && (
              <Button 
                size="sm" 
                onClick={onDownload}
                className="w-full"
                disabled={hasError}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Model
              </Button>
            )}
            
            {isDownloading && onCancel && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onCancel}
                className="w-full"
              >
                Cancel Download
              </Button>
            )}
            
            {hasError && (
              <Button 
                size="sm" 
                onClick={onDownload}
                className="w-full"
              >
                Retry Download
              </Button>
            )}
          </div>

          {/* Expand/Collapse */}
          {description && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:underline"
            >
              {isExpanded ? 'Show less' : 'Show details'}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
