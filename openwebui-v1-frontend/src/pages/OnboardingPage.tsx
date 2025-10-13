import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Download, Play, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import onboardingService, { 
  OllamaStatus, 
  OrganizationModels, 
  ConfigCheck,
  ModelPullProgress 
} from '@/services/onboarding';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for different steps
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [orgModels, setOrgModels] = useState<OrganizationModels | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigCheck | null>(null);
  
  // Model download state
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, ModelPullProgress>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'ollama',
      title: 'Check Ollama Installation',
      description: 'Verify that Ollama is installed and running on your system',
      icon: <Settings className="w-5 h-5" />,
      completed: configStatus?.steps.ollama_installed || false,
      current: currentStep === 0
    },
    {
      id: 'models',
      title: 'Select Models',
      description: 'Choose models from your organization\'s catalog',
      icon: <Circle className="w-5 h-5" />,
      completed: configStatus?.steps.models_selected || false,
      current: currentStep === 1
    },
    {
      id: 'download',
      title: 'Download Models',
      description: 'Download selected models to your local system',
      icon: <Download className="w-5 h-5" />,
      completed: configStatus?.steps.models_downloaded || false,
      current: currentStep === 2
    }
  ];

  useEffect(() => {
    loadConfigStatus();
  }, []);

  useEffect(() => {
    if (configStatus?.completed) {
      // If onboarding is already complete, redirect to chat
      navigate('/chat');
    }
  }, [configStatus, navigate]);

  const loadConfigStatus = async () => {
    try {
      const status = await onboardingService.getConfigStatus();
      setConfigStatus(status);
      
      // Set current step based on completion status
      if (!status.steps.ollama_installed) {
        setCurrentStep(0);
      } else if (!status.steps.models_selected) {
        setCurrentStep(1);
      } else if (!status.steps.models_downloaded) {
        setCurrentStep(2);
      }
    } catch (err) {
      setError('Failed to load configuration status');
    }
  };

  const handleCheckOllama = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await onboardingService.checkOllama();
      setOllamaStatus(status);
      
      if (status.installed && status.running) {
        await onboardingService.updateConfigStep('ollama_installed', true);
        await loadConfigStatus();
        setCurrentStep(1);
      } else if (status.installed && !status.running) {
        // Try to start Ollama
        await handleStartOllama();
      } else {
        setError('Ollama is not installed. Please install Ollama from https://ollama.ai');
      }
    } catch (err) {
      setError('Failed to check Ollama installation');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOllama = async () => {
    setLoading(true);
    try {
      const result = await onboardingService.startOllama();
      if (result.success) {
        // Wait a moment and check again
        setTimeout(async () => {
          await handleCheckOllama();
        }, 3000);
      } else {
        setError('Failed to start Ollama service. Please start it manually.');
      }
    } catch (err) {
      setError('Failed to start Ollama service');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const models = await onboardingService.getOrganizationModels();
      setOrgModels(models);
      
      // Pre-select recommended models
      setSelectedModels(models.models.recommended || []);
      
      if (models.models.available.length === 0) {
        setError('No models available from your organization');
        return;
      }
    } catch (err) {
      setError('Failed to load organization models');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelection = (modelName: string) => {
    setSelectedModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    );
  };

  const handleDownloadModels = async () => {
    if (selectedModels.length === 0) {
      setError('Please select at least one model');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      // Mark models as selected
      await onboardingService.updateConfigStep('models_selected', true);

      // Download each selected model
      for (const modelName of selectedModels) {
        setDownloadProgress(prev => ({
          ...prev,
          [modelName]: { status: 'starting', message: `Starting download of ${modelName}` }
        }));

        await onboardingService.pullModel(modelName, (progress) => {
          setDownloadProgress(prev => ({
            ...prev,
            [modelName]: progress
          }));
        });

        setDownloadProgress(prev => ({
          ...prev,
          [modelName]: { status: 'completed', message: `${modelName} downloaded successfully` }
        }));
      }

      // Mark download step as complete
      await onboardingService.updateConfigStep('models_downloaded', true);
      await loadConfigStatus();

      // Verify completion and redirect
      const verification = await onboardingService.verifyCompletion();
      if (verification.allChecks) {
        navigate('/chat');
      }
    } catch (err) {
      setError('Failed to download models');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSkipOnboarding = async () => {
    try {
      // Mark all steps as completed (skip)
      await onboardingService.updateConfigStep('ollama_installed', true);
      await onboardingService.updateConfigStep('models_selected', true);
      await onboardingService.updateConfigStep('models_downloaded', true);
      navigate('/chat');
    } catch (err) {
      setError('Failed to skip onboarding');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Check Ollama Installation</h3>
              <p className="text-gray-600 mb-4">
                We need to verify that Ollama is installed and running on your system.
              </p>
            </div>

            {ollamaStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {ollamaStatus.installed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Installation: {ollamaStatus.installed ? 'Found' : 'Not Found'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  {ollamaStatus.running ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    Service: {ollamaStatus.running ? 'Running' : 'Not Running'}
                  </span>
                </div>

                {ollamaStatus.version && (
                  <p className="text-sm text-gray-600">Version: {ollamaStatus.version}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCheckOllama} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Check Ollama
              </Button>
              
              {ollamaStatus?.installed && !ollamaStatus.running && (
                <Button onClick={handleStartOllama} disabled={loading} variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Start Service
                </Button>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Circle className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Select Models</h3>
              <p className="text-gray-600 mb-4">
                Choose models from your organization's catalog to download.
              </p>
            </div>

            {!orgModels ? (
              <Button onClick={handleLoadModels} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Load Available Models
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Organization: {orgModels.organization}</h4>
                  <p className="text-sm text-gray-600">
                    {orgModels.totalAllowed} models available
                  </p>
                </div>

                {orgModels.models.available.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Available Models:</h4>
                    <div className="space-y-2">
                      {orgModels.models.available.map((model) => (
                        <label key={model} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedModels.includes(model)}
                            onChange={() => handleModelSelection(model)}
                            className="rounded"
                          />
                          <span>{model}</span>
                          {orgModels.models.recommended.includes(model) && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Recommended
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {orgModels.models.downloaded.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Already Downloaded:</h4>
                    <div className="space-y-2">
                      {orgModels.models.downloaded.map((model) => (
                        <div key={model} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{model}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={selectedModels.length === 0}
                  className="w-full"
                >
                  Continue with {selectedModels.length} model(s)
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Download className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Download Models</h3>
              <p className="text-gray-600 mb-4">
                Downloading selected models to your local system.
              </p>
            </div>

            {selectedModels.length > 0 && (
              <div className="space-y-3">
                {selectedModels.map((model) => {
                  const progress = downloadProgress[model];
                  return (
                    <div key={model} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{model}</span>
                        <span className="text-sm text-gray-600">
                          {progress?.status || 'Pending'}
                        </span>
                      </div>
                      
                      {progress && (
                        <div className="space-y-1">
                          {progress.total && progress.completed && (
                            <Progress 
                              value={(progress.completed / progress.total) * 100} 
                              className="w-full" 
                            />
                          )}
                          <p className="text-xs text-gray-600">
                            {progress.message}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button 
              onClick={handleDownloadModels} 
              disabled={isDownloading || selectedModels.length === 0}
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                'Download Models'
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to OpenWebUI</CardTitle>
            <CardDescription>
              Let's get you set up with everything you need to start chatting
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step.completed 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : step.current 
                        ? 'border-blue-500 text-blue-500' 
                        : 'border-gray-300 text-gray-300'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-20 h-1 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Step Info */}
            <div className="text-center">
              <h3 className="text-lg font-semibold">{steps[currentStep]?.title}</h3>
              <p className="text-gray-600">{steps[currentStep]?.description}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step Content */}
            {renderStepContent()}

            {/* Skip Option */}
            <div className="text-center pt-4 border-t">
              <Button variant="ghost" onClick={handleSkipOnboarding}>
                Skip setup and go to chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;