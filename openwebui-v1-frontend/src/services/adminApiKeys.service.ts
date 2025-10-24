import { adminApiFetch, getAdminToken } from './adminAuth';

export interface AdminExternalApi {
  _id: string;
  name: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_validated?: string;
  metadata?: {
    models?: any[];
    modelCount?: number;
    selectedModels?: any[];
    lastRefreshed?: string;
  };
}

export interface AdminApiKeyResponse {
  success: boolean;
  data?: AdminExternalApi | AdminExternalApi[];
  message?: string;
  error?: string;
  // Validation response fields
  valid?: boolean;
  provider?: string;
  models?: any[];
  modelCount?: number;
  detectedAutomatically?: boolean;
  validatedAt?: string;
}

class AdminApiKeysService {
  private readonly baseUrl = '/api/admin/models/external-apis';

  // Get all admin API keys
  async getAllAdminApiKeys(): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(this.baseUrl);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch API keys');
    }
  }

  // Validate admin API key
  async validateAdminApiKey(data: { provider?: string; api_key: string; name?: string }): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        body: JSON.stringify({
          apiKey: data.api_key,
          provider: data.provider,
          name: data.name
        })
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to validate API key');
    }
  }

  // Save validated admin API key
  async saveAdminApiKey(data: { 
    name: string; 
    provider: string; 
    api_key: string; 
    models?: any[];
    modelCount?: number;
    selectedModels?: any[];
  }): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(`${this.baseUrl}/save`, {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          provider: data.provider,
          apiKey: data.api_key,
          models: data.models,
          modelCount: data.modelCount,
          selectedModels: data.selectedModels
        })
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save API key');
    }
  }

  // Toggle admin API key status
  async toggleAdminApiStatus(apiId: string, isActive: boolean): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(`${this.baseUrl}/${apiId}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: isActive
        })
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to toggle API status');
    }
  }

  // Delete admin API key
  async deleteAdminApiKey(apiId: string): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(`${this.baseUrl}/${apiId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete API key');
    }
  }

  // Get admin external APIs (alias for getAllAdminApiKeys)
  async getAdminExternalApis(): Promise<{ apis: AdminExternalApi[] }> {
    try {
      const response = await adminApiFetch(this.baseUrl);
      return { apis: response.data || [] };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch external APIs');
    }
  }

  // Sync admin external models
  async syncAdminExternalModels(): Promise<AdminApiKeyResponse> {
    try {
      const response = await adminApiFetch(`${this.baseUrl}/sync`, {
        method: 'POST'
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sync external models');
    }
  }

  // Delete admin external API (alias for deleteAdminApiKey)
  async deleteAdminExternalApi(apiId: string): Promise<AdminApiKeyResponse> {
    return this.deleteAdminApiKey(apiId);
  }

  // Toggle admin API status (duplicate method - kept for backward compatibility)
  // async toggleAdminApiStatus(apiId: string, isActive: boolean): Promise<AdminApiKeyResponse> {
  //   return this.toggleAdminApiStatus(apiId, isActive);
  // }
}

export const adminApiKeysService = new AdminApiKeysService();

// Export as adminApiService for backward compatibility
export const adminApiService = adminApiKeysService;