import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIntegrationStore } from '@/stores/useIntegrationStore';
import { toast } from 'sonner';

export function AddProviderModal() {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [keyPattern, setKeyPattern] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const { 
    showAddProviderModal, 
    setShowAddProviderModal, 
    addCustomProvider 
  } = useIntegrationStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Provider name is required');
      return;
    }
    
    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }
    
    setIsAdding(true);
    
    try {
      // Validate URL format
      new URL(baseUrl);
      
      addCustomProvider({
        label: name.trim(),
        baseUrl: baseUrl.trim(),
        keyPattern: keyPattern.trim() || undefined
      });
      
      toast.success(`Added custom provider: ${name}`);
      handleClose();
      
    } catch (error) {
      toast.error('Invalid base URL format');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setShowAddProviderModal(false);
    setName('');
    setBaseUrl('');
    setKeyPattern('');
  };

  return (
    <Dialog open={showAddProviderModal} onOpenChange={setShowAddProviderModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Provider</DialogTitle>
          <DialogDescription>
            Add a custom AI provider with your own API endpoint.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">Provider Name</Label>
            <Input
              id="provider-name"
              placeholder="e.g., My Custom AI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              type="url"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The base URL for the provider's API
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="key-pattern">Key Pattern (Optional)</Label>
            <Input
              id="key-pattern"
              placeholder="e.g., ^sk-"
              value={keyPattern}
              onChange={(e) => setKeyPattern(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Regular expression pattern to validate API keys
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAdding || !name.trim() || !baseUrl.trim()}
            >
              {isAdding ? 'Adding...' : 'Add Provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}