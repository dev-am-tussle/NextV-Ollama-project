import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosInstance } from '../services/axios-instance';

interface Provider {
  value: string;
  label: string;
  keyPattern?: string;
  baseUrl?: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  created?: number;
  owned_by?: string;
}

interface ValidationResult {
  valid: boolean;
  provider?: string;
  models?: Model[];
  modelCount?: number;
  error?: string;
  detectedAutomatically?: boolean;
}

interface IntegrationState {
  // Current form state
  provider: string;
  apiKey: string;
  apiName: string;
  
  // Available providers
  providers: Provider[];
  
  // Validation state
  isValidating: boolean;
  validationResult: ValidationResult | null;
  isValidated: boolean;
  
  // Connected models
  connectedModels: Model[];
  availableModels: Model[];
  isLoadingModels: boolean;
  
  // UI state
  showAddProviderModal: boolean;
  
  // Actions
  setProvider: (provider: string) => void;
  setApiKey: (apiKey: string) => void;
  setApiName: (apiName: string) => void;
  
  validateKey: () => Promise<ValidationResult>;
  saveKey: () => Promise<boolean>;
  
  fetchAvailableModels: () => Promise<void>;
  refreshModels: () => Promise<void>;
  
  reset: () => void;
  setShowAddProviderModal: (show: boolean) => void;
  
  // Provider management
  addCustomProvider: (provider: Omit<Provider, 'value'> & { value?: string }) => void;
}

const DEFAULT_PROVIDERS: Provider[] = [
  { value: 'openai', label: 'OpenAI', keyPattern: '^sk-' },
  { value: 'deepseek', label: 'DeepSeek', keyPattern: '^sk-' },
  { value: 'perplexity', label: 'Perplexity', keyPattern: '^pplx-' },
  { value: 'anthropic', label: 'Anthropic (Claude)', keyPattern: '^sk-ant-' },
  { value: 'groq', label: 'Groq', keyPattern: '^gsk_' },
  { value: 'together', label: 'Together AI', keyPattern: '^[a-f0-9]{64}$' },
  { value: 'mistral', label: 'Mistral', keyPattern: '^[a-zA-Z0-9]{32}$' },
  { value: 'gemini', label: 'Google Gemini', keyPattern: '^AIza[0-9A-Za-z-_]{35}$' }
];

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      // Initial state
      provider: '',
      apiKey: '',
      apiName: '',
      
      providers: DEFAULT_PROVIDERS,
      
      isValidating: false,
      validationResult: null,
      isValidated: false,
      
      connectedModels: [],
      availableModels: [],
      isLoadingModels: false,
      
      showAddProviderModal: false,
      
      // Actions
      setProvider: (provider: string) => {
        set({ 
          provider, 
          validationResult: null, 
          isValidated: false 
        });
      },
      
      setApiKey: (apiKey: string) => {
        set({ 
          apiKey, 
          validationResult: null, 
          isValidated: false 
        });
      },
      
      setApiName: (apiName: string) => {
        set({ apiName });
      },
      
      validateKey: async (): Promise<ValidationResult> => {
        const { provider, apiKey } = get();
        
        if (!apiKey.trim()) {
          const result: ValidationResult = {
            valid: false,
            error: 'API key is required'
          };
          set({ validationResult: result, isValidated: false });
          return result;
        }
        
        set({ isValidating: true, validationResult: null });
        
        try {
          const response = await axiosInstance.post('/api/external/validate-key', {
            apiKey: apiKey.trim(),
            provider: provider || undefined
          });
          
          const result: ValidationResult = {
            valid: response.data.valid,
            provider: response.data.provider,
            models: response.data.models || [],
            modelCount: response.data.modelCount || 0,
            detectedAutomatically: response.data.detectedAutomatically || false
          };
          
          set({ 
            validationResult: result, 
            isValidated: result.valid,
            provider: result.provider || provider // Update provider if auto-detected
          });
          
          return result;
          
        } catch (error: any) {
          const result: ValidationResult = {
            valid: false,
            error: error.response?.data?.error || error.message || 'Validation failed'
          };
          
          set({ validationResult: result, isValidated: false });
          return result;
          
        } finally {
          set({ isValidating: false });
        }
      },
      
      saveKey: async (): Promise<boolean> => {
        const { provider, apiKey, apiName, validationResult } = get();
        
        if (!provider || !apiKey.trim() || !apiName.trim()) {
          throw new Error('Provider, API key, and name are required');
        }
        
        if (!validationResult?.valid) {
          throw new Error('Please validate your API key first');
        }
        
        try {
          const response = await axiosInstance.post('/api/external/save-key', {
            provider,
            apiKey: apiKey.trim(),
            name: apiName.trim(),
            models: validationResult.models || []
          });
          
          if (response.data.success) {
            // Reset form
            set({
              provider: '',
              apiKey: '',
              apiName: '',
              validationResult: null,
              isValidated: false
            });
            
            // Refresh available models
            get().fetchAvailableModels();
            
            return true;
          }
          
          return false;
          
        } catch (error: any) {
          throw new Error(error.response?.data?.error || error.message || 'Failed to save API key');
        }
      },
      
      fetchAvailableModels: async () => {
        set({ isLoadingModels: true });
        
        try {
          const response = await axiosInstance.get('/api/models/available');
          
          if (response.data.success) {
            set({ 
              availableModels: response.data.data || [],
              connectedModels: response.data.data || []
            });
          }
          
        } catch (error: any) {
          console.error('Failed to fetch available models:', error);
        } finally {
          set({ isLoadingModels: false });
        }
      },
      
      refreshModels: async () => {
        set({ isLoadingModels: true });
        
        try {
          const response = await axiosInstance.post('/api/models/refresh');
          
          if (response.data.success) {
            // Fetch updated models
            await get().fetchAvailableModels();
          }
          
        } catch (error: any) {
          console.error('Failed to refresh models:', error);
        } finally {
          set({ isLoadingModels: false });
        }
      },
      
      reset: () => {
        set({
          provider: '',
          apiKey: '',
          apiName: '',
          validationResult: null,
          isValidated: false,
          showAddProviderModal: false
        });
      },
      
      setShowAddProviderModal: (show: boolean) => {
        set({ showAddProviderModal: show });
      },
      
      addCustomProvider: (newProvider) => {
        const { providers } = get();
        const value = newProvider.value || newProvider.label.toLowerCase().replace(/\s+/g, '-');
        
        const customProvider: Provider = {
          ...newProvider,
          value
        };
        
        set({ 
          providers: [...providers, customProvider],
          provider: value,
          showAddProviderModal: false
        });
      }
    }),
    {
      name: 'integration-store',
      partialize: (state) => ({
        providers: state.providers,
        connectedModels: state.connectedModels
      })
    }
  )
);