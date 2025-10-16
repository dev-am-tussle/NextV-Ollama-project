import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeftIcon, Pencil, Trash2, Link } from "lucide-react";
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

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
}

export default function ApiConfigPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiName, setApiName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<ApiKeyItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyItem | null>(null);
  const navigate = useNavigate();

  const handleSaveApiKey = () => {
    if (!apiKey?.trim() || !apiName?.trim()) {
      toast.error("Please enter both API name and key");
      return;
    }

    if (editingId) {
      // Update existing key
      setSavedKeys(prev => prev.map(item => 
        item.id === editingId 
          ? { ...item, name: apiName, key: apiKey }
          : item
      ));
      setEditingId(null);
      toast.success("API key updated successfully");
    } else {
      // Add new key
      setSavedKeys(prev => [...prev, {
        id: Date.now().toString(),
        name: apiName,
        key: apiKey,
        isActive: false
      }]);
      toast.success("API key saved successfully");
    }

    // Clear form
    setApiKey("");
    setApiName("");
  };

  const handleEdit = (item: ApiKeyItem) => {
    setApiName(item.name);
    setApiKey(item.key);
    setEditingId(item.id);
  };

  const handleDeleteClick = (item: ApiKeyItem) => {
    setKeyToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (keyToDelete) {
      setSavedKeys(prev => prev.filter(item => item.id !== keyToDelete.id));
      toast.success("API key deleted successfully");
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleIntegrate = (id: string) => {
    setSavedKeys(prev => prev.map(item => ({
      ...item,
      isActive: item.id === id ? !item.isActive : item.isActive
    })));
    const item = savedKeys.find(k => k.id === id);
    toast.success(`API key ${item?.isActive ? 'deactivated' : 'activated'} successfully`);
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
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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

        {savedKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedKeys.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.key.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={item.isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleIntegrate(item.id)}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.isActive ? 'Deactivate' : 'Activate'} API Key
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
                            onClick={() => handleDeleteClick(item)}
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
              This will permanently delete the API key "{keyToDelete?.name}". This action cannot be undone.
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