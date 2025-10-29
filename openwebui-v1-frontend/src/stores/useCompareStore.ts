import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareModel {
  id: string;
  name: string;
  display_name: string;
  category?: string;
  provider?: string;
  performance_tier?: string;
  size?: string;
}

interface CompareState {
  isComparing: boolean;
  selectedModels: CompareModel[];
  limit: number;
  hasShownLimitAlert: boolean;
  
  // Actions
  startCompare: () => void;
  stopCompare: () => void;
  toggleCompare: () => void;
  addModel: (model: CompareModel) => { success: boolean; message?: string };
  removeModel: (modelId: string) => void;
  resetCompare: () => void;
  setLimit: (limit: number) => void;
  resetLimitAlert: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      isComparing: false,
      selectedModels: [],
      limit: 3, // Default free tier limit
      hasShownLimitAlert: false,

      startCompare: () => set({ isComparing: true }),
      
      stopCompare: () => set({ isComparing: false }),
      
      toggleCompare: () => set((state) => ({ 
        isComparing: !state.isComparing,
        // Reset models when toggling off
        selectedModels: !state.isComparing ? [] : state.selectedModels
      })),

      addModel: (model: CompareModel) => {
        const state = get();
        
        // Check if model already exists
        const exists = state.selectedModels.some(m => m.id === model.id);
        if (exists) {
          return {
            success: false,
            message: 'This model is already selected for comparison'
          };
        }

        // Check limit
        if (state.selectedModels.length >= state.limit) {
          set({ hasShownLimitAlert: true });
          return {
            success: false,
            message: `You've reached the free comparison limit (${state.limit} models). Upgrade your plan to compare more models.`
          };
        }

        // Add model
        set((state) => ({
          selectedModels: [...state.selectedModels, model]
        }));

        return { success: true };
      },

      removeModel: (modelId: string) => {
        set((state) => {
          const newModels = state.selectedModels.filter(m => m.id !== modelId);
          
          // If all models removed, exit compare mode
          return {
            selectedModels: newModels,
            isComparing: newModels.length > 0 ? state.isComparing : false
          };
        });
      },

      resetCompare: () => set({
        isComparing: false,
        selectedModels: [],
        hasShownLimitAlert: false
      }),

      setLimit: (limit: number) => set({ limit }),

      resetLimitAlert: () => set({ hasShownLimitAlert: false })
    }),
    {
      name: 'compare-models-storage',
      // Only persist selectedModels to restore previous comparison
      partialize: (state) => ({ 
        selectedModels: state.selectedModels 
      })
    }
  )
);
