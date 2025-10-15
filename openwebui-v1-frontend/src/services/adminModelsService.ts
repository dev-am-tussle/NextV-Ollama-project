import { buildApiUrl } from "@/lib/config";
import { getAdminToken } from "./adminAuth";

export interface AdminModel {
    _id: string;
    name: string;
    display_name: string;
    description: string;
    size: string;
    category: "general" | "coding" | "creative" | "analytical" | "conversational";
    tags: string[];
    is_active: boolean;
    org_enabled: boolean; // Organization-specific enabled status
    provider: string;
    model_family?: string;
    parameters?: string;
    use_cases: string[];
    performance_tier: "fast" | "balanced" | "powerful";
    min_ram_gb?: number;
    created_at: string;
    updated_at: string;
    pulled_by_users: number;
    set_as_default_by_users: number;
}

export interface AdminModelAnalytics {
    total_models: number;
    models_by_category: Record<string, number>;
    models_by_tier: Record<string, number>;
}

export interface AdminModelsPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface AdminModelsResponse {
    success: boolean;
    data: AdminModel[];
    pagination: AdminModelsPagination;
    analytics: AdminModelAnalytics;
}

export interface DetailedAnalytics {
    total_users: number;
    total_allowed_models: number;
    total_pulled_models: number;
    users_with_default_model: number;
    model_usage: AdminModel[];
    top_models: AdminModel[];
}

export interface DetailedAnalyticsResponse {
    success: boolean;
    data: DetailedAnalytics;
}

export interface GetOrganizationModelsParams {
    page?: number;
    limit?: number;
    category?: string;
    performance_tier?: string;
    search?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
}

export interface ToggleModelResponse {
    success: boolean;
    message: string;
    data: {
        modelId: string;
        enabled: boolean;
        organization_id: string;
    };
}

export interface DeleteModelResponse {
    success: boolean;
    message: string;
    data: {
        modelId: string;
        organization_id: string;
        removed: boolean;
    };
}

class AdminModelsService {
    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = getAdminToken();
        
        const response = await fetch(buildApiUrl(endpoint), {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Get organization models with filtering, sorting, and pagination
     */
    async getOrganizationModels(params: GetOrganizationModelsParams = {}): Promise<AdminModelsResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                searchParams.append(key, String(value));
            }
        });

        const queryString = searchParams.toString();
        const endpoint = `/api/admin/models/organization${queryString ? `?${queryString}` : ""}`;
        
        return this.makeRequest<AdminModelsResponse>(endpoint);
    }

    /**
     * Toggle model availability for the organization
     */
    async toggleOrganizationModel(modelId: string, enabled: boolean): Promise<ToggleModelResponse> {
        return this.makeRequest<ToggleModelResponse>(
            `/api/admin/models/organization/${modelId}/toggle`,
            {
                method: "PUT",
                body: JSON.stringify({ enabled }),
            }
        );
    }

    /**
     * Delete model from organization permanently
     */
    async deleteOrganizationModel(modelId: string): Promise<DeleteModelResponse> {
        return this.makeRequest<DeleteModelResponse>(
            `/api/admin/models/organization/${modelId}`,
            {
                method: "DELETE",
            }
        );
    }

    /**
     * Get detailed analytics for organization models
     */
    async getOrganizationAnalytics(): Promise<DetailedAnalyticsResponse> {
        return this.makeRequest<DetailedAnalyticsResponse>(
            "/api/admin/models/organization/analytics"
        );
    }
}

export const adminModelsService = new AdminModelsService();