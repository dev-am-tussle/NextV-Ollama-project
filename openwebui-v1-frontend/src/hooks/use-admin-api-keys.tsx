import { useState, useCallback } from 'react';
import { adminApiKeysService, AdminExternalApi } from '../services/adminApiKeys.service';
import { useToast } from './use-toast';

export function useAdminApiKeys() {
  const [adminApiKeys, setAdminApiKeys] = useState<AdminExternalApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all admin API keys
  const fetchAdminApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApiKeysService.getAllAdminApiKeys();
      if (response.success && Array.isArray(response.data)) {
        setAdminApiKeys(response.data);
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

  // Validate admin API key
  const validateAdminApiKey = useCallback(async (data: { provider?: string; api_key: string; name?: string }) => {
    setIsLoading(true);
    try {
      const response = await adminApiKeysService.validateAdminApiKey(data);
      if (response.success) {
        const modelCount = (response.data as any)?.modelCount ?? 0;
        console.log('Hook validation response:', response);
        toast({
          title: 'Validation Successful',
          description: `API key validated with ${(response.data as any)?.provider}. Found ${modelCount} models.`,
        });
      }
      return response;
    } catch (error: any) {
      console.error('Hook validation error:', error);
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

  // Save admin API key
  const saveAdminApiKey = useCallback(async (data: { 
    name: string; 
    provider: string; 
    api_key: string; 
    models?: any[];
    modelCount?: number;
    selectedModels?: any[];
  }) => {
    setIsLoading(true);
    try {
      console.log('Hook save data:', { 
        name: data.name, 
        provider: data.provider, 
        selectedModels: data.selectedModels?.length || 0,
        models: data.models?.length || 0
      });
      const response = await adminApiKeysService.saveAdminApiKey(data);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Admin API key saved successfully',
        });
        await fetchAdminApiKeys(); // Refresh the list
      }
      return response;
    } catch (error: any) {
      console.error('Hook save error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAdminApiKeys, toast]);

  // Toggle admin API key status
  const toggleAdminApiStatus = useCallback(async (apiId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const response = await adminApiKeysService.toggleAdminApiStatus(apiId, isActive);
      if (response.success) {
        toast({
          title: 'Success',
          description: `Admin API key ${isActive ? 'activated' : 'deactivated'} successfully`,
        });
        await fetchAdminApiKeys(); // Refresh the list
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
  }, [fetchAdminApiKeys, toast]);

  // Delete admin API key
  const deleteAdminApiKey = useCallback(async (apiId: string) => {
    setIsLoading(true);
    try {
      const response = await adminApiKeysService.deleteAdminApiKey(apiId);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Admin API key deleted successfully',
        });
        await fetchAdminApiKeys(); // Refresh the list
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
  }, [fetchAdminApiKeys, toast]);

  return {
    adminApiKeys,
    isLoading,
    fetchAdminApiKeys,
    validateAdminApiKey,
    saveAdminApiKey,
    toggleAdminApiStatus,
    deleteAdminApiKey,
  };
}