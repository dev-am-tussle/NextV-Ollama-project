import apiFetch from "@/lib/api";

export interface ModelBase {
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
  model_family?: string;
  parameters?: string;
  provider?: string;
}

export interface DownloadedModel extends ModelBase {
  pulled_at: string;
  usage_count: number;
  last_used: string | null;
  is_pulled: true;
}

export interface AvailableToDownloadModel extends ModelBase {
  purchased_at?: string;
  assigned_by_admin?: string;
  org_purchase_details?: {
    cost: number;
    billing_cycle: string;
  };
}

export interface AvailableForPurchaseModel extends ModelBase {
  pricing?: {
    monthly?: number;
    yearly?: number;
    one_time?: number;
  };
  popular?: boolean;
  recommended?: boolean;
}

export interface CategorizedModelsResponse {
  success: boolean;
  data: {
    downloaded: DownloadedModel[];
    availableToDownload: AvailableToDownloadModel[];
    availableGlobal: AvailableForPurchaseModel[];
  };
  user: {
    id: string;
    name: string;
    email: string;
    organization: {
      id: string;
      name: string;
    } | null;
  };
}

// Get categorized models for org-user following the 3-section structure
export async function getCategorizedModelsForUser(): Promise<CategorizedModelsResponse> {
  // Get current user from localStorage
  const authProfile = localStorage.getItem("authProfile");
  if (!authProfile) {
    throw new Error('No auth profile found');
  }
  
  const profile = JSON.parse(authProfile);
  const userId = profile?.user?.id;
  
  if (!userId) {
    throw new Error('No user ID found in auth profile');
  }
  
  return apiFetch(`available-models/user/${userId}/list`);
}

// Pull/download a model from "Available to Download" to "Downloaded"
export async function downloadModel(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("user/download-model", {
    method: "POST",
    body: JSON.stringify({ model_name: modelName }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Remove a model from "Downloaded" models
export async function removeDownloadedModel(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`user/downloaded-models/${modelName}`, {
    method: "DELETE",
  });
}

// Request admin to purchase a model (from "Available for Purchase")
export async function requestModelPurchase(modelId: string, message?: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("user/request-model-purchase", {
    method: "POST",
    body: JSON.stringify({ 
      model_id: modelId,
      user_message: message 
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Update model usage when user selects/uses a model
export async function updateModelUsage(modelName: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`user/models/${modelName}/usage`, {
    method: "POST",
  });
}

// Progress tracking for model downloads
export interface DownloadProgress {
  type: 'progress' | 'error' | 'complete' | 'starting';
  status?: string;
  completed?: number;
  total?: number;
  percentage?: number;
  error?: string;
  suggestions?: string[];
  success?: boolean;
  modelName?: string;
  message?: string;
}

export interface DownloadCallbacks {
  onProgress?: (progress: DownloadProgress) => void;
  onError?: (error: DownloadProgress) => void;
  onComplete?: (result: DownloadProgress) => void;
}

// Download model with real-time progress tracking
export async function downloadModelWithProgress(
  modelName: string, 
  callbacks: DownloadCallbacks
): Promise<void> {
  const { onProgress, onError, onComplete } = callbacks;
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/download-model-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ model_name: modelName }),
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
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const eventData = line.replace(/^data: /, '');
            const progress: DownloadProgress = JSON.parse(eventData);

            switch (progress.type) {
              case 'starting':
              case 'progress':
                onProgress && onProgress(progress);
                break;
              case 'error':
                onError && onError(progress);
                return; // Stop processing on error
              case 'complete':
                onComplete && onComplete(progress);
                return; // Stop processing on completion
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in downloadModelWithProgress:', error);
    onError && onError({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      suggestions: ['Check internet connection', 'Try again later', 'Contact support']
    });
  }
}