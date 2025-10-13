import apiFetch from '../lib/api';

const API_BASE = (import.meta as any).env?.VITE_API_URL as string;
const OLLAMA_BASE_URL = (import.meta as any).env?.VITE_OLLAMA_BASE_URL as string || 'http://localhost:11434';

export interface OnboardingStep {
  ollama_installed: boolean;
  models_selected: boolean;
  models_downloaded: boolean;
}

export interface ConfigCheck {
  completed: boolean;
  steps: OnboardingStep;
  completed_at: string | null;
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  models: Array<{ name: string; size: number; modified_at: string }>;
}

export interface OrganizationModels {
  organization: string;
  models: {
    downloaded: string[];
    available: string[];
    recommended: string[];
  };
  totalAllowed: number;
}

export interface ModelPullProgress {
  status: string;
  completed?: number;
  total?: number;
  message?: string;
}

export interface OnboardingVerification {
  configComplete: boolean;
  ollamaRunning: boolean;
  modelsDownloaded: boolean;
  allChecks: boolean;
}

class OnboardingService {
  // Check Ollama installation status
  async checkOllama(): Promise<OllamaStatus> {
    const response = await apiFetch('onboarding/check-ollama', {
      method: 'GET'
    });
    return response.data;
  }

  // Start Ollama service
  async startOllama(): Promise<{ success: boolean; message?: string; error?: string }> {
    return await apiFetch('onboarding/start-ollama', {
      method: 'POST'
    });
  }

  // Get organization models
  async getOrganizationModels(): Promise<OrganizationModels> {
    const response = await apiFetch('onboarding/organization-models', {
      method: 'GET'
    });
    return response.data;
  }

  // Pull/download a model with real-time progress
  async pullModel(
    modelName: string,
    onProgress?: (progress: ModelPullProgress) => void
  ): Promise<void> {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    const url = `${API_BASE.replace(/\/$/, "")}/api/onboarding/pull-model`;

    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${url}?model=${encodeURIComponent(modelName)}`, {
        withCredentials: true
      });

      // For POST request with EventSource, we need to use fetch instead
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'text/event-stream'
        },
        credentials: 'include',
        body: JSON.stringify({ modelName })
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        
        function readStream(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              resolve();
              return;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (onProgress) {
                    onProgress(data);
                  }
                  if (data.status === 'done' || data.status === 'completed') {
                    resolve();
                    return;
                  }
                  if (data.status === 'error') {
                    reject(new Error(data.message || 'Model pull failed'));
                    return;
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }

            return readStream();
          });
        }

        return readStream();
      }).catch(reject);
    });
  }

  // Get user configuration status
  async getConfigStatus(): Promise<ConfigCheck> {
    const response = await apiFetch('onboarding/config-status', {
      method: 'GET'
    });
    return response.data;
  }

  // Update configuration step
  async updateConfigStep(step: keyof OnboardingStep, completed: boolean = true): Promise<ConfigCheck> {
    const response = await apiFetch('onboarding/config-step', {
      method: 'PUT',
      body: JSON.stringify({ step, completed }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  // Verify onboarding completion
  async verifyCompletion(): Promise<OnboardingVerification> {
    const response = await apiFetch('onboarding/verify', {
      method: 'GET'
    });
    return response.data;
  }
}

export default new OnboardingService();