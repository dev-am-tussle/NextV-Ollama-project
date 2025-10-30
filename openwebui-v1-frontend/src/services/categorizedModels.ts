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

export interface AvailableApiModel extends ModelBase {
  is_external_api: boolean;
  external_source: {
    type: 'user' | 'admin';
    api_name: string;
    provider: string;
    model_id: string;
    context_length?: number;
    user_id?: string;
    admin_id?: string;
  };
}

export interface CategorizedModelsResponse {
  success: boolean;
  data: {
    downloaded: DownloadedModel[];
    availableToDownload: AvailableToDownloadModel[];
    availableGlobal: AvailableForPurchaseModel[];
    availableApi: AvailableApiModel[]; // New category for API models
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

// Select a model (traditional or API)
export async function selectModel(modelName: string): Promise<{ 
  success: boolean; 
  model_type: 'traditional' | 'external_api';
  routing_info: any;
  message: string; 
}> {
  return apiFetch("models/select", {
    method: "POST",
    body: JSON.stringify({ modelName }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
export async function downloadModelWithProgress(
  modelName: string, 
  callbacks: DownloadCallbacks
): Promise<void> {
  const { onProgress, onError, onComplete } = callbacks;
  
  try {
    // Get auth token
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required. Please log in again.');
    }

    // ✅ Correct URL with /api/v1/user and modelName in URL path
    const apiUrl = import.meta.env.VITE_API_URL;
    const url = `${apiUrl}/api/v1/user/download-model-stream/${encodeURIComponent(modelName)}`;
    
    console.log('[Download] Starting download for:', modelName);
    console.log('[Download] Request URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    console.log('[Download] Response status:', response.status, response.statusText);

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to download this model.');
      }
      if (response.status === 404) {
        throw new Error('Model not found or download endpoint not available.');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid request. Model may already be downloaded.');
      }
      
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Check if response is SSE
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.warn('[Download] Expected SSE stream, got:', contentType);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let lastProgressTime = Date.now();
    let receivedData = false;

    console.log('[Download] Starting to read stream...');

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('[Download] Stream ended');
        if (!receivedData) {
          throw new Error('Download stream ended without receiving any data');
        }
        break;
      }

      receivedData = true;
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const eventData = line.replace(/^data: /, '').trim();
            if (!eventData) continue;
            
            const progress: DownloadProgress = JSON.parse(eventData);
            const now = Date.now();

            console.log('[Download] Progress:', progress);

            // Throttle progress updates (max 10 per second)
            if (progress.type === 'progress' && now - lastProgressTime < 100) {
              continue;
            }
            lastProgressTime = now;

            switch (progress.type) {
              case 'starting':
              case 'progress':
                onProgress && onProgress(progress);
                break;
                
              case 'error':
                console.error('[Download] Error received:', progress);
                onError && onError(progress);
                reader.cancel(); // Stop reading stream
                return;
                
              case 'complete':
                console.log('[Download] Completed:', progress);
                onComplete && onComplete(progress);
                reader.cancel(); // Stop reading stream
                return;
            }
          } catch (parseError) {
            console.warn('[Download] Failed to parse SSE data:', line, parseError);
          }
        }
      }
    }

    // If stream ended without explicit completion
    if (receivedData) {
      console.log('[Download] Stream ended, assuming success');
      onComplete && onComplete({
        type: 'complete',
        success: true,
        percentage: 100,
        status: 'Download completed'
      });
    }

  } catch (error) {
    console.error('[Download] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    onError && onError({
      type: 'error',
      error: errorMessage,
      suggestions: [
        'Check your internet connection',
        'Verify Ollama service is running',
        'Ensure you have sufficient disk space',
        'Try refreshing the page and retry'
      ]
    });
  }
}