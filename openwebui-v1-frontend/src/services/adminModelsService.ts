import { buildApiUrl } from "@/lib/config";
import { getAdminToken } from "./adminAuth";

export interface AdminModel {
    _id: string;
    name: string;
    display_name: string;
    description: string;
    size: string;
    category: "general" | "coding" | "creative" | "analytical" | "conversational" | "external";
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
    // External API specific fields
    external_source?: {
        api_name: string;
        api_id: string;
        provider: string;
        model_id: string;
        context_length?: number;
    };
    source_type?: "organization" | "external_api";
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

export interface CombinedModelsData {
    models: {
        organization: AdminModel[];
        external_apis: AdminModel[];
        combined: AdminModel[];
    };
    statistics: {
        total_models: number;
        organization_models: number;
        external_models: number;
        models_by_tier: Record<string, number>;
        models_by_category: Record<string, number>;
    };
    external_apis: {
        active_count: number;
        total_count: number;
        apis: Array<{
            id: string;
            name: string;
            provider: string;
            models_count: number;
            last_validated: string;
            is_active: boolean;
        }>;
    };
    admin_info: {
        id: string;
        name: string;
        email: string;
        organization: {
            id: string;
            name: string;
            allowed_models_count: number;
        };
    };
}

export interface CombinedModelsResponse {
    success: boolean;
    message: string;
    data: CombinedModelsData;
    timestamp: string;
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

    /**
     * Get combined models (organization + external APIs) for admin dashboard
     */
    async getCombinedModels(): Promise<CombinedModelsResponse> {
        return this.makeRequest<CombinedModelsResponse>(
            "/api/admin/models/combined"
        );
    }

    /**
     * Transform external API models to AdminModel format for UI compatibility
     */
    private transformExternalApiModelsToAdminModels(externalModels: any[]): AdminModel[] {
        return externalModels.map(model => ({
            _id: model._id || `external_${model.external_source?.api_id}_${model.external_source?.model_id}`,
            name: model.name || model.display_name,
            display_name: model.display_name || model.name,
            description: model.description || `External model from ${model.provider}`,
            size: model.size || 'Unknown',
            category: model.category === 'external' ? 'general' : (model.category as any) || 'general',
            tags: model.tags || ['external', model.provider],
            is_active: true,
            org_enabled: true, // External models are considered enabled if they're in the response
            provider: model.provider || 'external',
            model_family: model.model_family || 'external',
            parameters: model.parameters || model.external_source?.context_length?.toString() || 'Unknown',
            use_cases: model.use_cases || ['general'],
            performance_tier: model.performance_tier || 'balanced',
            min_ram_gb: model.min_ram_gb || 4,
            created_at: new Date().toISOString(), // Default for external models
            updated_at: new Date().toISOString(), // Default for external models
            pulled_by_users: 0, // External models don't have pull stats
            set_as_default_by_users: 0, // External models don't have default stats
            external_source: model.external_source,
            source_type: 'external_api' as const
        }));
    }

    /**
     * Get combined models with proper data transformation for UI
     */
    async getCombinedModelsForUI(): Promise<{
        success: boolean;
        data: AdminModel[];
        statistics: CombinedModelsData['statistics'];
        external_apis: CombinedModelsData['external_apis'];
        pagination?: AdminModelsPagination;
        analytics?: AdminModelAnalytics;
    }> {
        try {
            const response = await this.getCombinedModels();
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch combined models');
            }

            const { models, statistics, external_apis } = response.data;
            
            // Transform external API models to match AdminModel interface
            const transformedExternalModels = this.transformExternalApiModelsToAdminModels(models.external_apis);
            
            // Combine organization and external models
            const combinedModels = [
                ...models.organization.map(model => ({ ...model, source_type: 'organization' as const })),
                ...transformedExternalModels
            ];

            // Create mock pagination for compatibility
            const mockPagination: AdminModelsPagination = {
                page: 1,
                limit: combinedModels.length,
                total: combinedModels.length,
                pages: 1
            };

            // Transform statistics to match existing analytics format
            const mockAnalytics: AdminModelAnalytics = {
                total_models: statistics.total_models,
                models_by_category: statistics.models_by_category,
                models_by_tier: statistics.models_by_tier
            };

            return {
                success: true,
                data: combinedModels,
                statistics,
                external_apis,
                pagination: mockPagination,
                analytics: mockAnalytics
            };
        } catch (error) {
            console.error('Error fetching combined models:', error);
            throw error;
        }
    }
}

export const adminModelsService = new AdminModelsService();