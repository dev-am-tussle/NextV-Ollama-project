import apiFetch from "@/lib/api";

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
  return apiFetch(`admin/models${query ? `?${query}` : ""}`);
}

// Admin: Create new model
export async function createModel(model: Partial<AvailableModel>) {
  return apiFetch("admin/models", {
    method: "POST",
    body: model as any,
  });
}

// Admin: Update existing model
export async function updateModel(id: string, model: Partial<AvailableModel>) {
  return apiFetch(`admin/models/${id}`, {
    method: "PUT",
    body: model as any,
  });
}

// Admin: Delete model
export async function deleteModel(id: string) {
  return apiFetch(`admin/models/${id}`, {
    method: "DELETE",
  });
}

// Pull model to local system (future implementation)
export async function pullModel(modelName: string): Promise<PullModelResponse> {
  return apiFetch("admin/models/pull", {
    method: "POST",
    body: { modelName } as PullModelRequest as any,
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