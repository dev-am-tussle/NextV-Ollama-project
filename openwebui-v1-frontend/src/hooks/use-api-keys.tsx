import { useState, useCallback } from 'react';
import { apiKeysService, ExternalApi } from '../services/apiKeys.service';
import { useToast } from './use-toast';

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ExternalApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all API keys
  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.getAllApiKeys();
      if (response.success && Array.isArray(response.data)) {
        setApiKeys(response.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Add new API key
  const addApiKey = useCallback(async (data: { name: string; provider: string; api_key: string; models?: any[]; modelCount?: number; selectedModels?: any[] }) => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.saveApiKey(data);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'API key added successfully',
        });
        await fetchApiKeys(); // Refresh the list
      }
      return response;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Save API key (alias for addApiKey)
  const saveApiKey = useCallback(async (data: { name: string; provider: string; api_key: string; models?: any[]; modelCount?: number; selectedModels?: any[] }) => {
    return addApiKey(data);
  }, [addApiKey]);

  // Update API key
  const updateApiKey = useCallback(async (apiId: string, updates: Partial<ExternalApi>) => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.updateApiKey(apiId, updates);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'API key updated successfully',
        });
        await fetchApiKeys(); // Refresh the list
      }
      return response;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Delete API key
  const deleteApiKey = useCallback(async (apiId: string) => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.deleteApiKey(apiId);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'API key deleted successfully',
        });
        await fetchApiKeys(); // Refresh the list
      }
      return response;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Toggle API key status
  const toggleApiStatus = useCallback(async (apiId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.toggleApiStatus(apiId, isActive);
      if (response.success) {
        toast({
          title: 'Success',
          description: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
        });
        await fetchApiKeys(); // Refresh the list
      }
      return response;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Verify API key with provider
  const verifyApiKey = useCallback(async (data: { provider: string; api_key: string; name?: string }) => {
    setIsLoading(true);
    try {
      const response = await apiKeysService.verifyApiKey(data);
      if (response.success) {
        const modelCount = (response.data as any)?.modelCount ?? 0;
        toast({
          title: 'Validation Successful',
          description: `API key validated with ${data.provider}. Found ${modelCount} models.`,
        });
      }
      return response;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    apiKeys,
    isLoading,
    fetchApiKeys,
    addApiKey,
    saveApiKey,
    updateApiKey,
    deleteApiKey,
    toggleApiStatus,
    verifyApiKey,
  };
}