import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntegrationStore } from '@/stores/useIntegrationStore';

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  created?: number;
  owned_by?: string;
}

interface ModelListProps {
  models?: Model[];
  showDetails?: boolean;
}

export function ModelList({ models, showDetails = true }: ModelListProps) {
  const { validationResult } = useIntegrationStore();
  
  const displayModels = models || validationResult?.models || [];
  
  if (displayModels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>
            No models found. Validate your API key to see available models.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Models ({displayModels.length})</CardTitle>
        <CardDescription>
          Models available with your API key
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-2">
            {displayModels.map((model) => (
              <div
                key={model.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{model.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {model.provider}
                    </Badge>
                  </div>
                  
                  {showDetails && model.description && (
                    <p className="text-xs text-muted-foreground">
                      {model.description}
                    </p>
                  )}
                  
                  {showDetails && (model.owned_by || model.created) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {model.owned_by && (
                        <span>Owned by: {model.owned_by}</span>
                      )}
                      {model.created && (
                        <span>
                          Created: {new Date(model.created * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}