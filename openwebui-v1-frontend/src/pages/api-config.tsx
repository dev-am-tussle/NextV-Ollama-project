import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeftIcon, Pencil, Trash2, Link } from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ExternalApi } from "@/services/apiKeys.service";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  
  const {
    apiKeys,
    isLoading,
    fetchApiKeys,
    addApiKey,
    updateApiKey,
    deleteApiKey,
    toggleApiStatus
  } = useApiKeys();

  // Fetch API keys when component mounts
  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleSaveApiKey = async () => {
    if (!apiKey?.trim() || !apiName?.trim()) {
      toast.error("Please enter both API name and key");
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
      } else {
        // Add new key
        await addApiKey({
          name: apiName,
          provider,
          api_key: apiKey
        });
      }

      // Clear form
      setApiKey("");
      setApiName("");
      setEditingId(null);
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

  const handleIntegrate = async (id: string, currentStatus: boolean) => {
    try {
      await toggleApiStatus(id, !currentStatus);
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle API key status");
    }
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
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type={editingId ? "text" : "password"}
                  placeholder="sk-..."
                  value={editingId ? maskApiKey(apiKey) : apiKey}
                  onChange={(e) => !editingId && setApiKey(e.target.value)}
                  disabled={editingId}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button
                className="flex-1"
                onClick={handleSaveApiKey}
              >
                {editingId ? 'Update' : 'Save'} Configuration
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setApiKey("");
                    setApiName("");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {apiKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {apiKeys.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.api_key}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={item.is_active ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleIntegrate(item._id, item.is_active)}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.is_active ? 'Deactivate' : 'Activate'} API Key
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
            </CardContent>
          </Card>
        )}
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

      {/* Loading state */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}