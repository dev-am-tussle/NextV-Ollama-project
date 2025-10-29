import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysService, ExternalApi } from '../services/apiKeys.service';
import { useToast } from './use-toast';

export function useApiKeys() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all API keys with React Query
  const {
    data: apiKeys = [],
    isLoading: isQueryLoading,
    refetch: fetchApiKeys
  } = useQuery<ExternalApi[]>({
    queryKey: ['user-api-keys'],
    queryFn: async () => {
      const response = await apiKeysService.getAllApiKeys();
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      throw new Error('Failed to fetch API keys');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Function to invalidate related queries (including model lists)
  const invalidateRelatedQueries = useCallback(async () => {
    console.log('🔄 Invalidating related queries after API key change...');
    await queryClient.invalidateQueries({ queryKey: ['user-api-keys'] });
    await queryClient.invalidateQueries({ queryKey: ['categorized-models'] });
    await queryClient.invalidateQueries({ queryKey: ['available-models'] });
    console.log('✅ Related queries invalidated');
  }, [queryClient]);

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
        await invalidateRelatedQueries(); // Trigger real-time updates
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
  }, [invalidateRelatedQueries, toast]);

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
        await invalidateRelatedQueries(); // Trigger real-time updates
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
  }, [invalidateRelatedQueries, toast]);

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
        await invalidateRelatedQueries(); // Trigger real-time updates
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
  }, [invalidateRelatedQueries, toast]);

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
        await invalidateRelatedQueries(); // Trigger real-time updates
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
    isLoading: isLoading || isQueryLoading,
    fetchApiKeys,
    addApiKey,
    saveApiKey,
    updateApiKey,
    deleteApiKey,
    toggleApiStatus,
    verifyApiKey,
    invalidateRelatedQueries, // Add this for manual triggers
  };
}