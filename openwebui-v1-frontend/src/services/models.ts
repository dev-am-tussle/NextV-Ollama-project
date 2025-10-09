import apiFetch from "@/lib/api";
import { adminApiFetch } from "./adminAuth";

export interface AvailableModel {
  _id: string;
  name: string;
  display_name: string;
  description: string;
  size: string;
  category: string;
  tags: string[];
  performance_tier: "fast" | "balanced" | "powerful";
  min_ram_gb: number;
  use_cases: string[];
  is_active: boolean;
  model_family?: string;
  parameters?: string;
  provider?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PulledModel extends AvailableModel {
  pulled_at: string;
  usage_count: number;
  last_used: string | null;
  is_pulled: true;
}

export interface ModelsResponse {
  success: boolean;
  data: AvailableModel[];
  count: number;
}

export interface PullModelRequest {
  modelName: string;
}

export interface PullModelResponse {
  success: boolean;
  message: string;
  model: string;
}

// Get all available models for users
export async function getAvailableModels(): Promise<ModelsResponse> {
  return apiFetch("available-models");
}

// Admin: Get available models for organization selection
export interface AvailableModelForOrg {
  _id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  tags: string[];
  performance_tier: "fast" | "balanced" | "powerful";
  size: string;
  min_ram_gb: number;
}

export interface AvailableModelsForOrgResponse {
  success: boolean;
  data: AvailableModelForOrg[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getAvailableModelsForOrganization(): Promise<AvailableModelsForOrgResponse> {
  // Use existing admin/models endpoint with is_active=true filter
  const response = await getAllModels({
    is_active: true,
    limit: 100 // Get all active models
  });
  
  return {
    success: response.success,
    data: response.data || [],
    pagination: response.pagination
  };
}

// Admin: Get all models (with pagination and filters)
export async function getAllModels(params?: {
  page?: number;
  limit?: number;
  category?: string;
  is_active?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.category) queryParams.append("category", params.category);
  if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
  
  const query = queryParams.toString();
  return adminApiFetch(`/api/admin/models${query ? `?${query}` : ""}`);
}

// Admin: Create new model
export async function createModel(model: Partial<AvailableModel>) {
  return adminApiFetch("/api/admin/models", {
    method: "POST",
    body: JSON.stringify(model),
  });
}

// Admin: Update existing model
export async function updateModel(id: string, model: Partial<AvailableModel>) {
  return adminApiFetch(`/api/admin/models/${id}`, {
    method: "PUT",
    body: JSON.stringify(model),
  });
}

// Admin: Delete model
export async function deleteModel(id: string) {
  return adminApiFetch(`/api/admin/models/${id}`, {
    method: "DELETE",
  });
}

// Pull model to local system (future implementation)
export async function pullModel(modelName: string): Promise<PullModelResponse> {
  return adminApiFetch("/api/admin/models/pull", {
    method: "POST",
    body: JSON.stringify({ modelName }),
  });
}

// Check locally pulled models status (future implementation)
export async function getLocalModels(): Promise<string[]> {
  try {
    const response = await apiFetch("admin/models/local");
    return response.models || [];
  } catch (error) {
    console.warn("Could not fetch local models:", error);
    return [];
  }
}

// Get model usage statistics (future implementation)
export async function getModelUsage(modelId: string) {
  return apiFetch(`admin/models/${modelId}/usage`);
}

// User: Get pulled models with full details
export async function getUserPulledModels(): Promise<{ success: boolean; data: PulledModel[]; count: number }> {
  return apiFetch("user/pulled-models");
}

// User: Add a model to pulled models
export async function addPulledModel(modelName: string): Promise<{ success: boolean; message: string; model: AvailableModel }> {
  return apiFetch("user/pulled-models", {
    method: "POST",
    body: { model_name: modelName } as any,
  });
}

// User: Remove a model from pulled models
export async function removePulledModel(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`user/pulled-models/${modelName}`, {
    method: "DELETE",
  });
}

// User: Update model usage statistics
export async function updateModelUsage(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`user/pulled-models/${modelName}/usage`, {
    method: "POST",
  });
}

// Progress tracking interfaces for real model pulling
export interface PullProgress {
  type: 'progress' | 'error' | 'complete' | 'heartbeat';
  status?: string;
  completed?: number;
  total?: number;
  digest?: string;
  percentage?: number;
  error?: string;
  code?: string;
  suggestions?: string[];
  success?: boolean;
  modelName?: string;
  message?: string;
}

export interface PullCallbacks {
  onProgress?: (progress: PullProgress) => void;
  onError?: (error: PullProgress) => void;
  onComplete?: (result: PullProgress) => void;
}

// Real model pulling with progress tracking using SSE
export async function pullModelWithProgress(
  modelName: string, 
  callbacks: PullCallbacks
): Promise<void> {
  const { onProgress, onError, onComplete } = callbacks;
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/models/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ modelName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            // Parse SSE data
            const eventData = line.replace(/^data: /, '');
            const progress: PullProgress = JSON.parse(eventData);

            switch (progress.type) {
              case 'progress':
                onProgress && onProgress(progress);
                break;
              case 'error':
                onError && onError(progress);
                return; // Stop processing on error
              case 'complete':
                onComplete && onComplete(progress);
                return; // Stop processing on completion
              case 'heartbeat':
                // Keep connection alive, no action needed
                break;
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in pullModelWithProgress:', error);
    onError && onError({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'CONNECTION_ERROR',
      suggestions: ['Check internet connection', 'Try again later', 'Contact support']
    });
  }
}

// Remove model from system (actual Ollama removal)
export async function removeModelFromSystem(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("models/remove", {
    method: "DELETE",
    body: JSON.stringify({ modelName }),
  });
}