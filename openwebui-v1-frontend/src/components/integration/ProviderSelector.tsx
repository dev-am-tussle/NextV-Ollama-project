import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntegrationStore } from '@/stores/useIntegrationStore';

interface ProviderSelectorProps {
  disabled?: boolean;
}

export function ProviderSelector({ disabled = false }: ProviderSelectorProps) {
  const { 
    provider, 
    providers, 
    setProvider, 
    setShowAddProviderModal 
  } = useIntegrationStore();

  const handleProviderChange = (value: string) => {
    if (value === 'add-new') {
      setShowAddProviderModal(true);
    } else {
      setProvider(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="provider">Provider</Label>
      <div className="flex gap-2">
        <Select
          value={provider}
          onValueChange={handleProviderChange}
          disabled={disabled}
        >
          <SelectTrigger id="provider" className="flex-1">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="add-new" className="text-blue-600">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add new provider
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAddProviderModal(true)}
          disabled={disabled}
          title="Add custom provider"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {provider && (
        <div className="text-sm text-muted-foreground">
          {providers.find(p => p.value === provider)?.keyPattern && (
            <span>
              Expected key pattern: {providers.find(p => p.value === provider)?.keyPattern}
            </span>
          )}
        </div>
      )}
    </div>
  );
}