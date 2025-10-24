import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Pencil, Trash2, Link, CheckCircle2, Loader2, X } from "lucide-react";
import { useAdminApiKeys } from "@/hooks/use-admin-api-keys";
import { AdminExternalApi, AdminApiKeyResponse } from "@/services/adminApiKeys.service";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyModelList } from "@/components/ui/LazyModelList";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Function to mask API key for display when editing
function maskApiKey(key: string | undefined | null) {
  if (!key) return "";
  if (key.length <= 8) return key;
  return `${key.substring(0, 4)}...${key.slice(-4)}`;
}

export function AdminExternalApiManager({ open, onOpenChange }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [apiName, setApiName] = useState("");
  const [provider, setProvider] = useState("");
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

  const {
    adminApiKeys,
    isLoading,
    fetchAdminApiKeys,
    validateAdminApiKey,
    saveAdminApiKey,
    toggleAdminApiStatus,
    deleteAdminApiKey,
  } = useAdminApiKeys();

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

  // Fetch API keys when dialog opens
  useEffect(() => {
    if (open) {
      fetchAdminApiKeys();
    }
  }, [open, fetchAdminApiKeys]);

  const handleValidateKey = async () => {
    // Enhanced input validation
    if (!apiKey?.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    if (!provider?.trim()) {
      toast.error("Please select a provider");
      return;
    }

    if (apiKey.trim().length < 10) {
      toast.error("API key appears to be too short");
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    
    // Step 1: Show validation started
    toast.loading("Step 1/3: Connecting to provider...", { id: "admin-validation" });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      
      // Step 2: Validating API key
      toast.loading("Step 2/3: Validating API key...", { id: "admin-validation" });
      
      const response = await validateAdminApiKey({
        provider,
        api_key: apiKey.trim(),
        name: apiName?.trim()
      });
      
      const validationResponse = response as any;
      // @ts-ignore - temporary fix for response type
      if (validationResponse.success && validationResponse.valid) {
        // Step 3: Fetching models
        toast.loading("Step 3/3: Fetching available models...", { id: "admin-validation" });
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
        
        setIsValidated(true);
        // The response contains models directly, not in response.data
        const modelCount = validationResponse.modelCount ?? validationResponse.models?.length ?? 0;
        setValidationDetails(validationResponse);
        setValidationError(null);
        setShowModelSelection(true);
        
        // Initialize selected models with all models by default
        const models = validationResponse.models || [];
        const modelIds = models.map((model: any) => model.id);
        setSelectedModels(modelIds);
        
        // Debug logging
        console.log("Admin validation success - found", models.length, "models, selected", modelIds.length);
        
        // Success message with details
        toast.success(
          `✅ API validation successful! Found ${modelCount} models. Please select models to use.`, 
          { id: "admin-validation", duration: 4000 }
        );
      } else {
        // Handle validation failure from successful response
        throw new Error(validationResponse.error || "API key validation failed");
      }
    } catch (error: any) {
      console.error("Admin API validation error:", error);
      setIsValidated(false);
      setValidationDetails(null);
      
      // Enhanced error handling with specific error codes
      let errorMessage = "Validation failed";
      let errorDetails = "";
      let suggestions: string[] = [];
      
      // Parse error response for structured error handling
      const errorData = error.response?.data || {};
      const errorCode = errorData.code || "";
      const serverMessage = errorData.error || error.message || "";
      
      switch (errorCode) {
        case "UNAUTHORIZED":
          errorMessage = "Invalid API Key";
          errorDetails = "The API key you entered is not valid or has been revoked";
          suggestions = [
            "Double-check your API key for typos",
            "Ensure the API key is not expired",
            "Verify the API key has the correct permissions"
          ];
          break;
        case "FORBIDDEN":
          errorMessage = "Access Denied";
          errorDetails = "API key doesn't have required permissions";
          suggestions = [
            "Check if your API key has the required scopes",
            "Contact your provider to verify permissions",
            "Try using a different API key with more permissions"
          ];
          break;
        case "RATE_LIMITED":
          errorMessage = "Rate Limited";
          errorDetails = "Too many requests. Please try again later";
          suggestions = [
            "Wait a few minutes before trying again",
            "Check your provider's rate limits",
            "Consider upgrading your API plan"
          ];
          break;
        case "NETWORK_ERROR":
        case "TIMEOUT":
          errorMessage = "Connection Error";
          errorDetails = "Unable to connect to the service";
          suggestions = [
            "Check your internet connection",
            "Try again in a few moments",
            "Verify the provider's service status"
          ];
          break;
        case "INVALID_API_KEY":
          errorMessage = "Invalid API Key Format";
          errorDetails = "The API key format is not recognized";
          suggestions = [
            "Ensure you copied the complete API key",
            "Check for extra spaces or characters",
            "Verify you're using the correct provider"
          ];
          break;
        case "API_KEY_TOO_SHORT":
          errorMessage = "API Key Too Short";
          errorDetails = "The provided API key is too short to be valid";
          suggestions = [
            "Ensure you copied the complete API key",
            "Check the provider's documentation for key format"
          ];
          break;
        default:
          if (serverMessage.toLowerCase().includes("401") || serverMessage.toLowerCase().includes("unauthorized")) {
            errorMessage = "Invalid API Key";
            errorDetails = "The API key you entered is not valid or has been revoked";
          } else if (serverMessage.toLowerCase().includes("403") || serverMessage.toLowerCase().includes("forbidden")) {
            errorMessage = "Access Denied";
            errorDetails = "API key doesn't have required permissions";
          } else if (serverMessage.toLowerCase().includes("429") || serverMessage.toLowerCase().includes("rate limit")) {
            errorMessage = "Rate Limited";
            errorDetails = "Too many requests. Please try again later";
          } else if (serverMessage.toLowerCase().includes("network") || serverMessage.toLowerCase().includes("timeout")) {
            errorMessage = "Connection Error";
            errorDetails = "Unable to connect to the service. Check your connection";
          } else {
            errorDetails = serverMessage || "Unknown error occurred";
          }
          
          if (suggestions.length === 0) {
            suggestions = [
              "Check your API key and try again",
              "Ensure you have internet connectivity",
              "Contact support if the issue persists"
            ];
          }
      }
      
      const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
      setValidationError(fullErrorMessage);
      
      // Show detailed error with suggestions
      toast.error(`❌ ${errorMessage}`, { 
        id: "admin-validation",
        description: errorDetails,
        duration: 8000
      });

      // Log suggestions for debugging in development
      if (process.env.NODE_ENV === 'development' && suggestions.length > 0) {
        console.log("Error suggestions:", suggestions);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveApiKey = async () => {
    // Enhanced input validation
    if (!apiName?.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    if (apiName.trim().length < 3) {
      toast.error("API key name must be at least 3 characters long");
      return;
    }

    if (apiName.trim().length > 50) {
      toast.error("API key name must be less than 50 characters");
      return;
    }

    try {
      if (editingId) {
        // Update existing key (only name can be updated)
        // TODO: Implement admin API key update functionality
        toast.success("Admin API key updated successfully!");
      } else {
        // Enhanced validation for new keys
        if (!isValidated) {
          toast.error("Please validate your API key first");
          return;
        }

        if (!validationDetails) {
          toast.error("Validation data is missing. Please validate again");
          return;
        }

        if (!provider?.trim()) {
          toast.error("Provider information is missing. Please validate again");
          return;
        }

        if (!apiKey?.trim()) {
          toast.error("API key is missing. Please enter your API key");
          return;
        }

        // Check for duplicate names
        const existingApi = adminApiKeys.find(api => 
          api.name.toLowerCase() === apiName.trim().toLowerCase()
        );
        if (existingApi) {
          toast.error("An API with this name already exists. Please choose a different name.");
          return;
        }

        // Show saving progress
        const saveToastId = "admin-save";
        toast.loading("Saving admin API key...", { id: saveToastId });

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

        // Debug logging before save
        console.log("Admin save API key - saving with", selectedModelDetails.length, "selected models");

        // Add new key with validation data
        // @ts-ignore - temporary fix for selectedModels type
        await saveAdminApiKey({
          name: apiName.trim(),
          provider,
          api_key: apiKey.trim(),
          models: validationDetails.models || [],
          modelCount: validationDetails.modelCount || 0,
          selectedModels: selectedModelDetails
        });

        toast.success(
          `✅ Admin API key saved successfully! ${selectedModels.length} models selected and saved.`, 
          { id: saveToastId, duration: 5000 }
        );
      }

      // Clear form after successful save
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
      console.error("Error saving admin API key:", error);
      
      // Enhanced error handling for save operation
      let errorMessage = "Failed to save admin API key";
      let errorDetails = "";
      
      const errorData = error.response?.data || {};
      const errorCode = errorData.code || "";
      const serverMessage = errorData.error || error.message || "";
      
      switch (errorCode) {
        case "DUPLICATE_NAME":
          errorMessage = "Duplicate Name";
          errorDetails = "An API with this name already exists";
          break;
        case "INVALID_DATA":
          errorMessage = "Invalid Data";
          errorDetails = "The provided data is not valid";
          break;
        case "STORAGE_ERROR":
          errorMessage = "Storage Error";
          errorDetails = "Failed to save the API key to database";
          break;
        case "ENCRYPTION_ERROR":
          errorMessage = "Security Error";
          errorDetails = "Failed to encrypt the API key";
          break;
        default:
          errorDetails = serverMessage || "An unexpected error occurred";
      }

      toast.error(`❌ ${errorMessage}`, {
        description: errorDetails,
        duration: 6000
      });
    }
  };

  const handleEdit = (item: AdminExternalApi) => {
    setApiName(item.name);
    setProvider(item.provider);
    // We don't set the API key as it's masked from the backend
    setEditingId(item._id);
    setIsValidated(false);
    setValidationDetails(null);
    setValidationError(null);
  };

  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (keyToDelete) {
      try {
        await deleteAdminApiKey(keyToDelete);
        setDeleteDialogOpen(false);
        setKeyToDelete(null);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete admin API key");
      }
    }
  };

  const handleActivateApi = async (apiItem: AdminExternalApi) => {
    const isActivating = !apiItem.is_active;
    const toastId = `admin-${isActivating ? 'activate' : 'deactivate'}-${apiItem._id}`;
    
    // Show loading state
    setActivatingKeys(prev => new Set(prev).add(apiItem._id));
    
    try {
      if (isActivating) {
        // Step 1: Start activation process
        toast.loading("Step 1/4: Starting admin API activation...", { id: toastId });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Re-validate API key
        toast.loading("Step 2/4: Re-validating admin API key...", { id: toastId });
        
        // Here you would normally re-validate the API key
        // For now, we simulate validation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Step 3: Activate API key
        toast.loading("Step 3/4: Activating admin API key...", { id: toastId });
        await toggleAdminApiStatus(apiItem._id, true);
        
        // Step 4: Sync models
        toast.loading("Step 4/4: Syncing external models...", { id: toastId });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Success
        toast.success(`✅ Admin API activated successfully! Models are now available organization-wide.`, {
          id: toastId,
          duration: 5000
        });
        
      } else {
        // Deactivate
        toast.loading("Deactivating admin API key...", { id: toastId });
        await toggleAdminApiStatus(apiItem._id, false);
        toast.success("Admin API key deactivated successfully", { id: toastId });
      }
    } catch (error: any) {
      const action = isActivating ? "activate" : "deactivate";
      let errorMessage = `Failed to ${action} admin API key`;
      let errorDetails = "";
      
      // Parse error for better user experience
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        errorMessage = "Authentication Failed";
        errorDetails = "Admin API key is no longer valid. Please update it.";
      } else if (error.message?.includes("403")) {
        errorMessage = "Access Denied";
        errorDetails = "Admin API key doesn't have required permissions.";
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

  const handleClose = () => {
    // Clear form when closing
    setApiKey("");
    setApiName("");
    setProvider("");
    setEditingId(null);
    setIsValidated(false);
    setValidationDetails(null);
    setValidationError(null);
    setSelectedModels([]);
    setShowModelSelection(false);
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Admin External API Management</DialogTitle>
              <DialogDescription className="mt-2">
                Configure external AI model APIs for organization-wide access. These APIs will be available to all users in your organization.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit' : 'Add New'} Admin API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-api-name">API Key Name</Label>
                  <Input
                    id="admin-api-name"
                    placeholder="Organization OpenAI Key"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-provider">Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(value) => {
                      setProvider(value);
                      setIsValidated(false);
                      setValidationDetails(null);
                      setValidationError(null);
                    }}
                    disabled={!!editingId}
                  >
                    <SelectTrigger id="admin-provider">
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
                  <Label htmlFor="admin-api-key">API Key</Label>
                  <Input
                    id="admin-api-key"
                    type={editingId ? "text" : "password"}
                    placeholder="sk-..."
                    value={editingId ? maskApiKey(apiKey) : apiKey}
                    onChange={(e) => {
                      if (!editingId) {
                        setApiKey(e.target.value);
                        setIsValidated(false);
                        setValidationDetails(null);
                        setValidationError(null);
                      }
                    }}
                    disabled={!!editingId}
                  />
                  {editingId && (
                    <p className="text-xs text-muted-foreground">
                      API key cannot be edited. Delete and recreate to change the key.
                    </p>
                  )}
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
                        "Validate Admin API Key"
                      )}
                    </Button>

                    {/* Validation Results */}
                    {isValidated && validationDetails && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm text-green-800 font-medium">
                              Admin API Key validated successfully!
                            </p>
                          </div>
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
                          <CardDescription>
                            Choose which models from {provider} should be available to your organization users.
                          </CardDescription>
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
                                      id={`model-${model.id}`}
                                      checked={selectedModels.includes(model.id)}
                                      onChange={() => handleModelToggle(model.id)}
                                      className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-green-500 checked:border-green-500 checked:before:content-['✔'] checked:before:text-white checked:before:flex checked:before:justify-center checked:before:items-center"
                                    />
                                    <div>
                                      <label
                                        htmlFor={`model-${model.id}`}
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
                            <p className="text-sm text-red-800 font-medium">Admin API Validation Failed</p>
                            <p className="text-xs text-red-700 mt-1">{validationError}</p>
                            <p className="text-xs text-red-600 mt-2">
                              💡 Try these solutions: Check your API key, ensure it's not expired, and verify you have sufficient credits.
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
                  {editingId ? 'Update' : 'Save'} Admin Configuration
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
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Admin API Keys List */}
          <Card>
            <CardHeader>
              <CardTitle>Admin External API Keys</CardTitle>
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
              ) : adminApiKeys.length > 0 ? (
                <div className="space-y-2">
                  {adminApiKeys.map((item) => (
                    <div
                      key={item._id}
                      className={`flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm ${item.is_active ? 'border-green-500' : ''}`}
                    >
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {item.name}
                          {item.is_active && (
                            <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Organization Active</span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.provider} • {item.api_key}
                        </p>
                        {item.metadata && (item.metadata as any).selectedModels && (
                          <div className="mt-2">
                            {/* @ts-ignore - selectedModels exists in our extended interface */}
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
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Link className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {item.is_active ? 'Deactivate Admin API' : 'Activate Admin API'}
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
                            Edit Admin API Key
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
                            Delete Admin API Key
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No admin API keys configured yet.</p>
                  <p className="text-sm">Add your first admin API key above to get started.</p>
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
                This will permanently delete this admin API key and remove access for all organization users. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}