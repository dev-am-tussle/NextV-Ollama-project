// API Configuration
export const API_CONFIG = {
    baseURL: import.meta.env.VITE_API_URL,
    endpoints: {
        adminModels: '/api/admin/models',
        availableModels: '/api/v1/available-models',
        auth: '/api/v1/auth',
        conversations: '/api/v1/conversations',
        files: '/api/v1/files',
        savedPrompts: '/api/v1/saved-prompts'
    }
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.baseURL}${endpoint}`;
};