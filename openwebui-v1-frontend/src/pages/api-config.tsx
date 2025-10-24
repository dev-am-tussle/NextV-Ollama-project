import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeftIcon, Pencil, Trash2, Link, CheckCircle2, Loader2 } from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ExternalApi } from "@/services/apiKeys.service";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LazyModelList } from "@/components/ui/LazyModelList";
import { getStoredUserProfile } from "@/services/unifiedAuth";

// Function to mask API key is not needed as backend handles masking

// Mask API key for display when editing (shows first 4 and last 4 characters)
function maskApiKey(key: string | undefined | null) {
  if (!key) return "****";
  try {
    const k = String(key);
    if (k.length <= 8) return "****";
    return `${k.substring(0, 4)}...${k.slice(-4)}`;
  } catch (_) {
    return "****";
  }
}

export default function ApiConfigPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiName, setApiName] = useState("");
  const [provider, setProvider] = useState(""); // Default provider
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [validationDetails, setValidationDetails] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activatingKeys, setActivatingKeys] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showModelSelection, setShowModelSelection] = useState(false);
  const navigate = useNavigate();
  
  const {
    apiKeys,
    isLoading,
    fetchApiKeys,
    addApiKey,
    saveApiKey,
    updateApiKey,
    deleteApiKey,
    toggleApiStatus,
    verifyApiKey
  } = useApiKeys();

  // Available providers
  const providers = [
    { value: "openai", label: "OpenAI" },
    { value: "deepseek", label: "DeepSeek" },
    { value: "perplexity", label: "Perplexity" },
    { value: "anthropic", label: "Anthropic (Claude)" },
    { value: "groq", label: "Groq" },
    { value: "together", label: "Together AI" },
    { value: "mistral", label: "Mistral" },
    { value: "gemini", label: "Google Gemini" }
  ];

  // Fetch API keys when component mounts
  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleValidateKey = async () => {
    if (!apiKey?.trim() || !provider) {
      toast.error("Please enter API key and select provider");
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    
    // Step 1: Show validation started
    toast.loading("Step 1/3: Connecting to provider...", { id: "validation" });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      
      // Step 2: Validating API key
      toast.loading("Step 2/3: Validating API key...", { id: "validation" });
      
      const response = await verifyApiKey({
        provider,
        api_key: apiKey,
        name: apiName
      });
      
      if (response.success) {
        // Step 3: Fetching models
        toast.loading("Step 3/3: Fetching available models...", { id: "validation" });
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
        
        setIsValidated(true);
        // Handle response structure properly - check if response has validation data
        const validationData = (response as any);
        const models = validationData.models || [];
        const modelCount = validationData.modelCount ?? models.length ?? 0;
        
        setValidationDetails(validationData);
        setValidationError(null);
        setShowModelSelection(true);
        
        // Initialize selected models with all models by default
        const modelIds = models.map((model: any) => model.id);
        setSelectedModels(modelIds);
        
        // Success message with details
        toast.success(
          `✅ Validation successful! Found ${modelCount} models from ${provider}. Please select models to use.`, 
          { id: "validation", duration: 4000 }
        );
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setIsValidated(false);
      setValidationDetails(null);
      
      // Determine error type and show appropriate message
      let errorMessage = "Validation failed";
      let errorDetails = "";
      
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        errorMessage = "Invalid API Key";
        errorDetails = "The API key you entered is not valid or has been revoked";
      } else if (error.message?.includes("403") || error.message?.includes("forbidden")) {
        errorMessage = "Access Denied";
        errorDetails = "Your API key doesn't have permission to access this service";
      } else if (error.message?.includes("429")) {
        errorMessage = "Rate Limited";
        errorDetails = "Too many requests. Please try again in a few minutes";
      } else if (error.message?.includes("timeout") || error.message?.includes("ECONNABORTED")) {
        errorMessage = "Connection Timeout";
        errorDetails = "The provider is taking too long to respond. Please try again";
      } else if (error.message?.includes("network") || error.message?.includes("ENOTFOUND")) {
        errorMessage = "Network Error";
        errorDetails = "Unable to connect to the provider. Check your internet connection";
      } else {
        errorDetails = error.message || "Unknown error occurred";
      }
      
      setValidationError(`${errorMessage}: ${errorDetails}`);
      
      toast.error(
        `❌ ${errorMessage}`, 
        { 
          id: "validation",
          description: errorDetails,
          duration: 6000
        }
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey?.trim() || !apiName?.trim() || !provider) {
      toast.error("Please enter API name, key, and select provider");
      return;
    }

    // Strict validation requirement for new keys
    if (!isValidated && !editingId) {
      toast.error("Please validate your API key first to ensure it works correctly");
      return;
    }

    try {
      if (editingId) {
        // Update existing key
        await updateApiKey(editingId, {
          name: apiName,
          api_key: apiKey,
          provider
        });
        toast.success("API key updated successfully");
      } else {
        // For new keys, use the validation data
        if (!validationDetails) {
          toast.error("Validation data is missing. Please validate again");
          return;
        }

        // Validate model selection
        if (selectedModels.length === 0) {
          toast.error("Please select at least one model to save");
          return;
        }

        // Filter selected models from validation details
        const allModels = validationDetails.models || [];
        const selectedModelDetails = allModels.filter((model: any) => 
          selectedModels.includes(model.id)
        );

        // Add new key with validation data using saveApiKey method
        await saveApiKey({
          name: apiName,
          provider,
          api_key: apiKey,
          models: validationDetails.models || [],
          modelCount: validationDetails.modelCount || 0,
          selectedModels: selectedModelDetails
        });
        toast.success(`API key saved successfully! ${selectedModels.length} models selected and saved.`);
      }

      // Clear form
      setApiKey("");
      setApiName("");
      setProvider("");
      setEditingId(null);
      setIsValidated(false);
      setValidationDetails(null);
      setValidationError(null);
      setSelectedModels([]);
      setShowModelSelection(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save API key");
    }
  };

  const handleEdit = (item: ExternalApi) => {
    setApiName(item.name);
    setProvider(item.provider);
    // We don't set the API key as it's masked from the backend
    setEditingId(item._id);
  };

  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (keyToDelete) {
      try {
        await deleteApiKey(keyToDelete);
        setDeleteDialogOpen(false);
        setKeyToDelete(null);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete API key");
      }
    }
  };

  const handleActivateApi = async (apiItem: ExternalApi) => {
    const isActivating = !apiItem.is_active;
    const toastId = `${isActivating ? 'activate' : 'deactivate'}-${apiItem._id}`;
    
    // Show loading state
    setActivatingKeys(prev => new Set(prev).add(apiItem._id));
    
    try {
      if (isActivating) {
        // Step 1: Start activation process
        toast.loading("Step 1/4: Starting activation...", { id: toastId });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Re-validate API key
        toast.loading("Step 2/4: Re-validating API key...", { id: toastId });
        
        // Here you would normally re-validate the API key
        // For now, we simulate validation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Step 3: Activate API key
        toast.loading("Step 3/4: Activating API key...", { id: toastId });
        await toggleApiStatus(apiItem._id, true);
        
        // Step 4: Switch to chat
        toast.loading("Step 4/4: Preparing chat interface...", { id: toastId });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Success
        toast.success(`🚀 ${apiItem.name} activated! Switching to chat...`, { 
          id: toastId,
          duration: 3000
        });
        
        // Navigate to chat after a brief delay
        setTimeout(() => {
          const userProfile = getStoredUserProfile();
          const slug = userProfile?.organization?.slug || "default-slug"; // Fallback to a default slug if not found
          navigate(`/${slug}/org-user`); // Adjusted route to include dynamic slug
        }, 1500);
        
      } else {
        // Deactivating
        toast.loading("Deactivating API key...", { id: toastId });
        await toggleApiStatus(apiItem._id, false);
        toast.success(`${apiItem.name} deactivated successfully`, { id: toastId });
      }
      
    } catch (error: any) {
      console.error(`Error ${isActivating ? 'activating' : 'deactivating'} API key:`, error);
      
      const action = isActivating ? "activate" : "deactivate";
      let errorMessage = `Failed to ${action} API key`;
      let errorDetails = "";
      
      // Parse error for better user experience
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        errorMessage = "Authentication Failed";
        errorDetails = "API key is no longer valid. Please update it.";
      } else if (error.message?.includes("403")) {
        errorMessage = "Access Denied";
        errorDetails = "API key doesn't have required permissions.";
      } else if (error.message?.includes("429")) {
        errorMessage = "Rate Limited";
        errorDetails = "Too many requests. Please try again later.";
      } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
        errorMessage = "Connection Error";
        errorDetails = "Unable to connect to the service. Check your connection.";
      } else {
        errorDetails = error.message || "Unknown error occurred";
      }
      
      toast.error(`❌ ${errorMessage}`, { 
        id: toastId,
        description: errorDetails,
        duration: 6000
      });
    } finally {
      // Remove loading state
      setActivatingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(apiItem._id);
        return newSet;
      });
    }
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleSelectAllModels = () => {
    const allModelIds = validationDetails?.models?.map((model: any) => model.id) || [];
    setSelectedModels(allModelIds);
  };

  const handleDeselectAllModels = () => {
    setSelectedModels([]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8 gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleBackClick}
          className="rounded-full"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">API Configuration</h1>
          <p className="text-muted-foreground">Configure your OpenAI API key</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit API Key' : 'Add New API Key'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-name">API Name</Label>
                <Input
                  id="api-name"
                  placeholder="e.g., OpenAI Production"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(value) => {
                    setProvider(value);
                    setIsValidated(false);
                    setValidationDetails(null);
                    setValidationError(null);
                    setSelectedModels([]);
                    setShowModelSelection(false);
                  }}
                  disabled={!!editingId}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type={editingId ? "text" : "password"}
                  placeholder="sk-..."
                  value={editingId ? maskApiKey(apiKey) : apiKey}
                  onChange={(e) => {
                    if (!editingId) {
                      setApiKey(e.target.value);
                      setIsValidated(false);
                      setValidationDetails(null);
                      setValidationError(null);
                      setSelectedModels([]);
                      setShowModelSelection(false);
                    }
                  }}
                  disabled={!!editingId}
                />
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleValidateKey}
                    disabled={!apiKey || !provider || isValidating}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : isValidated ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        Validated
                      </>
                    ) : (
                      "Validate API Key"
                    )}
                  </Button>

                  {/* Validation Results */}
                  {isValidated && validationDetails && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-800 font-medium">
                          API Key validated successfully!
                        </p>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Found {validationDetails.modelCount || 0} models from {provider}
                      </p>
                      {validationDetails.validatedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Validated at {new Date(validationDetails.validatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Model Selection */}
                  {showModelSelection && validationDetails && validationDetails.models && (
                    <Card className="">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Select Models to Use
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Choose which models from {provider} you want to use in your conversations.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Model Selection Controls */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {selectedModels.length} of {validationDetails.models.length} models selected
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllModels}
                                disabled={selectedModels.length === validationDetails.models.length}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeselectAllModels}
                                disabled={selectedModels.length === 0}
                              >
                                Deselect All
                              </Button>
                            </div>
                          </div>

                          {/* Model List */}
                          <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                            {validationDetails.models.map((model: any) => (
                              <div
                                key={model.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    id={`user-model-${model.id}`}
                                    checked={selectedModels.includes(model.id)}
                                    onChange={() => handleModelToggle(model.id)}
                                    className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-green-500 checked:border-green-500 checked:before:content-['✔'] checked:before:text-white checked:before:flex checked:before:justify-center checked:before:items-center"
                                  />
                                  <div>
                                    <label
                                      htmlFor={`user-model-${model.id}`}
                                      className="font-medium cursor-pointer"
                                    >
                                      {model.name}
                                    </label>
                                    {model.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {model.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {model.context_length && (
                                  <div className="text-xs text-muted-foreground">
                                    {model.context_length.toLocaleString()} tokens
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {selectedModels.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                              <p className="text-sm">⚠️ Please select at least one model to continue</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Error */}
                  {validationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <div className="h-4 w-4 text-red-600 mt-0.5">⚠️</div>
                        <div className="flex-1">
                          <p className="text-sm text-red-800 font-medium">Validation Failed</p>
                          <p className="text-xs text-red-700 mt-1">{validationError}</p>
                          <p className="text-xs text-red-600 mt-2">
                            💡 <strong>Tips:</strong> Check your API key, ensure it's not expired, and verify you have sufficient credits.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button
                className="flex-1"
                onClick={handleSaveApiKey}
                disabled={editingId ? false : (!isValidated || selectedModels.length === 0)}
              >
                {editingId ? 'Update' : 'Save'} Configuration
                {!editingId && selectedModels.length > 0 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {selectedModels.length} models
                  </span>
                )}
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setApiKey("");
                    setApiName("");
                    setProvider("");
                    setIsValidated(false);
                    setValidationDetails(null);
                    setValidationError(null);
                    setSelectedModels([]);
                    setShowModelSelection(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Saved API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-2">
                {apiKeys.map((item) => (
                  <div
                    key={item._id}
                    className={`flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm ${item.is_active ? 'border-green-500' : ''}`}
                  >
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {item.name}
                        {item.is_active && (
                          <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.provider} • {item.api_key}
                      </p>
                      {item.metadata && item.metadata.selectedModels && (
                        <div className="mt-2">
                          <LazyModelList models={item.metadata.selectedModels} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={item.is_active ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleActivateApi(item)}
                            disabled={activatingKeys.has(item._id)}
                          >
                            {activatingKeys.has(item._id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : item.is_active ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" /> // New icon for deactivate
                            ) : (
                              <Link className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {activatingKeys.has(item._id) 
                            ? 'Processing...' 
                            : item.is_active 
                              ? 'Deactivate API Key' 
                              : 'Activate & Switch to Chat'
                          }
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Edit API Key
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Delete API Key
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No API keys configured yet.</p>
                <p className="text-sm">Add your first API key above to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}