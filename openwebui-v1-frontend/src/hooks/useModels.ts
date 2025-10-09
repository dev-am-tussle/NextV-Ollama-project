import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/config";

export interface Model {
    id: string; // Will be mapped from MongoDB _id
    _id?: string; // MongoDB ObjectId
    name: string; // exact ollama model name (e.g. "llama2:13b")
    display_name: string; // user-friendly name
    description: string; // model capabilities/description
    size: string; // model size (e.g. "1.4GB", "2.8GB")
    category: "general" | "coding" | "creative" | "analytical" | "conversational";
    tags: string[]; // ["lightweight", "fast", "coding", "reasoning"]
    is_active: boolean; // admin can enable/disable model
    provider: string; // ollama, openai, etc
    model_family?: string; // "gemma", "phi", "llama", etc.
    parameters?: string; // "2B", "7B", "13B" parameter count
    use_cases: string[]; // ["chat", "coding", "creative-writing", "analysis"]
    performance_tier: "fast" | "balanced" | "powerful";
    min_ram_gb?: number; // minimum RAM requirement
    created_at: string;
    updated_at: string;
    
    // Legacy fields for compatibility
    exact_name?: string;
    is_pulled?: boolean;
    pull_status?: string;
    family?: string;
    usage_24h?: number;
}

// Transform backend model data to frontend format
const transformModelData = (backendModel: any): Model => {
    return {
        id: backendModel._id || backendModel.id,
        _id: backendModel._id,
        name: backendModel.name,
        display_name: backendModel.display_name,
        description: backendModel.description,
        size: backendModel.size,
        category: backendModel.category || "general",
        tags: backendModel.tags || [],
        is_active: backendModel.is_active ?? true,
        provider: backendModel.provider || "ollama",
        model_family: backendModel.model_family,
        parameters: backendModel.parameters,
        use_cases: backendModel.use_cases || [],
        performance_tier: backendModel.performance_tier || "balanced",
        min_ram_gb: backendModel.min_ram_gb,
        created_at: backendModel.created_at,
        updated_at: backendModel.updated_at,
        
        // Legacy compatibility
        exact_name: backendModel.name, // Map name to exact_name for compatibility
        is_pulled: true, // Default to true for display
        pull_status: "completed",
        family: backendModel.model_family,
        usage_24h: Math.floor(Math.random() * 500), // Mock usage data
    };
};

// Mock data for demonstration - will be replaced with real API calls
const mockModels: Model[] = [
    {
        id: "1",
        name: "gemini-2.5-flash",
        display_name: "Gemini 2.5 Flash",
        description: "Fast and efficient model for general tasks with great reasoning",
        size: "1.4GB",
        parameters: "2B",
        category: "general",
        performance_tier: "fast",
        min_ram_gb: 4,
        is_active: true,
        provider: "Google",
        model_family: "Gemini",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["popular", "recommended"],
        use_cases: ["Chat", "Content Generation"],
        // Legacy compatibility
        exact_name: "gemini-2.5-flash",
        is_pulled: true,
        pull_status: "completed",
        family: "Gemini",
        usage_24h: 342,
    },
    {
        id: "2",
        name: "gpt-5-mini",
        display_name: "GPT-5 Mini",
        description: "Balanced performance with excellent reasoning capabilities",
        size: "3.8GB",
        parameters: "7B",
        category: "general",
        performance_tier: "balanced",
        min_ram_gb: 8,
        is_active: true,
        provider: "OpenAI",
        model_family: "GPT",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["popular", "recommended"],
        use_cases: ["Chat", "Summarization"],
        // Legacy compatibility
        exact_name: "gpt-5-mini",
        is_pulled: true,
        pull_status: "completed",
        family: "GPT",
        usage_24h: 289,
    },
    {
        id: "3",
        name: "codellama:7b",
        display_name: "Code Llama 7B",
        description: "Specialized model for code generation and analysis",
        size: "3.8GB",
        parameters: "7B",
        category: "coding",
        performance_tier: "balanced",
        min_ram_gb: 8,
        is_active: true,
        provider: "Meta",
        model_family: "Llama",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["code", "developer"],
        use_cases: ["Code Completion", "Code Review"],
        // Legacy compatibility
        exact_name: "codellama:7b",
        is_pulled: false,
        pull_status: "not_pulled",
        family: "Llama",
        usage_24h: 156,
    },
    {
        id: "4",
        name: "mistral:7b",
        display_name: "Mistral 7B",
        description: "Powerful open-source model for various tasks",
        size: "4.1GB",
        parameters: "7B",
        category: "general",
        performance_tier: "powerful",
        min_ram_gb: 8,
        is_active: true,
        provider: "Mistral AI",
        model_family: "Mistral",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["opensource"],
        use_cases: ["Chat", "Content Generation"],
        // Legacy compatibility
        exact_name: "mistral:7b",
        is_pulled: true,
        pull_status: "completed",
        family: "Mistral",
        usage_24h: 198,
    },
    {
        id: "5",
        name: "phi-2",
        display_name: "Phi 2",
        description: "Lightweight but capable model for quick responses",
        size: "1.7GB",
        parameters: "2.7B",
        category: "conversational",
        performance_tier: "fast",
        min_ram_gb: 4,
        is_active: true,
        provider: "Microsoft",
        model_family: "Phi",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["lightweight"],
        use_cases: ["Chat"],
        // Legacy compatibility
        exact_name: "phi-2",
        is_pulled: true,
        pull_status: "completed",
        family: "Phi",
        usage_24h: 127,
    },
    {
        id: "6",
        name: "llama3:70b",
        display_name: "Llama 3 70B",
        description: "High-performance model for complex reasoning",
        size: "40GB",
        parameters: "70B",
        category: "analytical",
        performance_tier: "powerful",
        min_ram_gb: 64,
        is_active: false,
        provider: "Meta",
        model_family: "Llama",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ["large", "advanced"],
        use_cases: ["Complex Reasoning", "Research"],
        // Legacy compatibility
        exact_name: "llama3:70b",
        is_pulled: false,
        pull_status: "not_pulled",
        family: "Llama",
        usage_24h: 23,
    },
];

export const useModels = () => {
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [backendOnline, setBackendOnline] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);

    // Check if backend is reachable
    const checkBackendHealth = async (): Promise<boolean> => {
        try {
            const response = await fetch(buildApiUrl('/health'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            return data.status === 'ok';
        } catch (error) {
            console.warn('Backend health check failed:', error);
            return false;
        }
    };

    const fetchModels = async () => {
        setIsLoading(true);
        setLastError(null);
        
        try {
            // First check if backend is online
            const isHealthy = await checkBackendHealth();
            setBackendOnline(isHealthy);
            
            if (!isHealthy) {
                throw new Error('Backend server is not responding. Please start the backend server.');
            }

            // Use the real admin models API
            const response = await fetch(buildApiUrl('/api/admin/models'), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid - redirect to login
                    localStorage.removeItem('superAdminToken');
                    localStorage.removeItem('isSuperAdmin');
                    localStorage.removeItem('userProfile');
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(`HTTP ${response.status}: Failed to fetch models`);
            }
            
            const result = await response.json();
            
            // Backend returns { success: true, data: models, pagination: {...} }
            if (result.success && Array.isArray(result.data)) {
                // Transform backend data to frontend format
                const transformedModels = result.data.map(transformModelData);
                setModels(transformedModels);
                console.log(`✅ Fetched ${transformedModels.length} models from database`);
                setBackendOnline(true);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
            setLastError(error instanceof Error ? error.message : 'Unknown error');
            
            // Check if this is an HTML response (common when hitting wrong server)
            if (error instanceof Error && error.message.includes('Unexpected token')) {
                setLastError('Backend server not found. Check if backend is running on correct port.');
                setBackendOnline(false);
            }
            
            // Don't fallback to mock data - show empty state
            setModels([]);
        } finally {
            setIsLoading(false);
        }
    };

    const updateModel = async (id: string, updates: Partial<Model>) => {
        try {
            const response = await fetch(buildApiUrl(`/api/admin/models/${id}`), {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update model');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Automatically refresh the models list to show updated data
                await fetchModels();
                return true;
            } else {
                throw new Error(result.error || 'Failed to update model');
            }
        } catch (error) {
            console.error('Failed to update model:', error);
            return false;
        }
    };

    const createModel = async (modelData: Omit<Model, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            // Transform frontend data to backend format
            const backendData = {
                name: modelData.name,
                display_name: modelData.display_name,
                description: modelData.description,
                size: modelData.size,
                category: modelData.category,
                tags: modelData.tags || [],
                is_active: modelData.is_active ?? true,
                provider: modelData.provider || "ollama",
                model_family: modelData.model_family,
                parameters: modelData.parameters,
                use_cases: modelData.use_cases || [],
                performance_tier: modelData.performance_tier || "balanced",
                min_ram_gb: modelData.min_ram_gb
            };

            const response = await fetch(buildApiUrl('/api/admin/models'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backendData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create model');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Automatically refresh the models list to show the new model
                await fetchModels();
                return true;
            } else {
                throw new Error(result.error || 'Failed to create model');
            }
        } catch (error) {
            console.error('Failed to create model:', error);
            return false;
        }
    };

    const deleteModel = async (id: string) => {
        try {
            const response = await fetch(buildApiUrl(`/api/admin/models/${id}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete model');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Automatically refresh the models list to remove deleted model
                await fetchModels();
                return true;
            } else {
                throw new Error(result.error || 'Failed to delete model');
            }
        } catch (error) {
            console.error('Failed to delete model:', error);
            return false;
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    return {
        models,
        isLoading,
        backendOnline,
        lastError,
        refetch: fetchModels,
        updateModel,
        createModel,
        deleteModel
    };
};