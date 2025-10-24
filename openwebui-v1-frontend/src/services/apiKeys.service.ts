import { axiosInstance } from './axios-instance';

export interface ExternalApi {
  _id: string;
  name: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    models?: any[];
    modelCount?: number;
    selectedModels?: any[];
    lastRefreshed?: string;
  };
}

export interface ApiKeyResponse {
  success: boolean;
  data?: ExternalApi | ExternalApi[];
  message?: string;
  error?: string;
}

class ApiKeysService {
  private readonly baseUrl = '/api/v1/user/external-apis';

  // Get all API keys
  async getAllApiKeys(): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.get(this.baseUrl);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Validate user API key
  async validateApiKey(data: { provider?: string; api_key: string; name?: string }): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/validate`, {
        apiKey: data.api_key,
        provider: data.provider,
        name: data.name
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Save validated user API key with selected models
  async saveApiKey(data: { 
    name: string; 
    provider: string; 
    api_key: string; 
    models?: any[];
    modelCount?: number;
    selectedModels?: any[];
  }): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/save`, {
        name: data.name,
        provider: data.provider,
        apiKey: data.api_key,
        models: data.models,
        modelCount: data.modelCount,
        selectedModels: data.selectedModels
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Add new API key (legacy method)
  async addApiKey(data: { name: string; provider: string; api_key: string }): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.post(this.baseUrl, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Update API key
  async updateApiKey(apiId: string, updates: Partial<ExternalApi>): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.patch(`${this.baseUrl}/${apiId}`, updates);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Delete API key
  async deleteApiKey(apiId: string): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.delete(`${this.baseUrl}/${apiId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Toggle API key status
  async toggleApiStatus(apiId: string, isActive: boolean): Promise<ApiKeyResponse> {
    try {
      const response = await axiosInstance.patch(`${this.baseUrl}/${apiId}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Verify API key with provider before saving (alias for validateApiKey)
  async verifyApiKey(data: { provider: string; api_key: string; name?: string }): Promise<ApiKeyResponse> {
    return this.validateApiKey(data);
  }

  private handleError(error: any): Error {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      config: error.config
    });
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return new Error(message);
  }
}

export const apiKeysService = new ApiKeysService();