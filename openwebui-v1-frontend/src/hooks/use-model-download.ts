import { useState, useCallback, useRef } from 'react';
import { downloadModelWithProgress, type DownloadProgress } from '@/services/categorizedModels';
import { useToast } from './use-toast';

interface DownloadState {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  error: string | null;
}

interface UseModelDownloadOptions {
  onSuccess?: (modelName: string) => void;
  onError?: (modelName: string, error: string) => void;
  autoCleanupDelay?: number; // ms to wait before clearing completed download
}

export function useModelDownload(options: UseModelDownloadOptions = {}) {
  const { onSuccess, onError, autoCleanupDelay = 3000 } = options;
  const { toast } = useToast();
  
  const [downloads, setDownloads] = useState<Map<string, DownloadState>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startDownload = useCallback(async (modelName: string) => {
    // Cancel any existing download for this model
    cancelDownload(modelName);
    
    // Clear any existing cleanup timer
    const existingTimer = cleanupTimersRef.current.get(modelName);
    if (existingTimer) {
      clearTimeout(existingTimer);
      cleanupTimersRef.current.delete(modelName);
    }

    // Initialize download state
    setDownloads(prev => new Map(prev).set(modelName, {
      isDownloading: true,
      progress: {
        type: 'starting',
        status: 'Initializing download...',
        percentage: 0
      },
      error: null
    }));

    // Create abort controller for this download
    const abortController = new AbortController();
    abortControllersRef.current.set(modelName, abortController);

    try {
      await downloadModelWithProgress(modelName, {
        onProgress: (progress) => {
          if (abortController.signal.aborted) return;
          
          setDownloads(prev => new Map(prev).set(modelName, {
            isDownloading: true,
            progress,
            error: null
          }));
        },
        
        onError: (errorProgress) => {
          if (abortController.signal.aborted) return;
          
          const errorMessage = errorProgress.error || 'Download failed';
          
          setDownloads(prev => new Map(prev).set(modelName, {
            isDownloading: false,
            progress: errorProgress,
            error: errorMessage
          }));

          toast({
            title: 'Download Failed',
            description: errorMessage,
            variant: 'destructive'
          });

          onError?.(modelName, errorMessage);
          abortControllersRef.current.delete(modelName);
        },
        
        onComplete: (result) => {
          if (abortController.signal.aborted) return;
          
          setDownloads(prev => new Map(prev).set(modelName, {
            isDownloading: false,
            progress: result,
            error: null
          }));

          if (result.success) {
            toast({
              title: 'Download Complete',
              description: `${modelName} is now ready to use`,
            });

            onSuccess?.(modelName);

            // Auto-cleanup after delay
            const timer = setTimeout(() => {
              setDownloads(prev => {
                const newMap = new Map(prev);
                newMap.delete(modelName);
                return newMap;
              });
              cleanupTimersRef.current.delete(modelName);
            }, autoCleanupDelay);

            cleanupTimersRef.current.set(modelName, timer);
          }

          abortControllersRef.current.delete(modelName);
        }
      });
    } catch (error) {
      if (abortController.signal.aborted) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setDownloads(prev => new Map(prev).set(modelName, {
        isDownloading: false,
        progress: {
          type: 'error',
          error: errorMessage
        },
        error: errorMessage
      }));

      toast({
        title: 'Download Error',
        description: errorMessage,
        variant: 'destructive'
      });

      onError?.(modelName, errorMessage);
      abortControllersRef.current.delete(modelName);
    }
  }, [toast, onSuccess, onError, autoCleanupDelay]);

  const cancelDownload = useCallback((modelName: string) => {
    const controller = abortControllersRef.current.get(modelName);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(modelName);
      
      setDownloads(prev => {
        const newMap = new Map(prev);
        newMap.delete(modelName);
        return newMap;
      });

      toast({
        title: 'Download Cancelled',
        description: `Download of ${modelName} was cancelled`,
      });
    }
  }, [toast]);

  const clearDownload = useCallback((modelName: string) => {
    // Clear any cleanup timer
    const timer = cleanupTimersRef.current.get(modelName);
    if (timer) {
      clearTimeout(timer);
      cleanupTimersRef.current.delete(modelName);
    }

    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(modelName);
      return newMap;
    });
  }, []);

  const clearAllDownloads = useCallback(() => {
    // Clear all timers
    cleanupTimersRef.current.forEach(timer => clearTimeout(timer));
    cleanupTimersRef.current.clear();
    
    setDownloads(new Map());
  }, []);

  const getDownloadState = useCallback((modelName: string): DownloadState | null => {
    return downloads.get(modelName) || null;
  }, [downloads]);

  const isDownloading = useCallback((modelName: string): boolean => {
    return downloads.get(modelName)?.isDownloading || false;
  }, [downloads]);

  const hasError = useCallback((modelName: string): boolean => {
    return downloads.get(modelName)?.error !== null;
  }, [downloads]);

  const getProgress = useCallback((modelName: string): DownloadProgress | null => {
    return downloads.get(modelName)?.progress || null;
  }, [downloads]);

  return {
    // Actions
    startDownload,
    cancelDownload,
    clearDownload,
    clearAllDownloads,
    
    // State queries
    getDownloadState,
    isDownloading,
    hasError,
    getProgress,
    
    // All downloads map
    downloads
  };
}
