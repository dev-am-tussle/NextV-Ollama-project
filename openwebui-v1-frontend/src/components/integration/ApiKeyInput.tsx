import { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIntegrationStore } from '@/stores/useIntegrationStore';
import { cn } from '@/lib/utils';

interface ApiKeyInputProps {
  disabled?: boolean;
}

export function ApiKeyInput({ disabled = false }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  
  const { 
    apiKey, 
    provider,
    setApiKey, 
    validateKey,
    isValidating,
    validationResult,
    isValidated
  } = useIntegrationStore();

  const handleValidate = async () => {
    if (!apiKey.trim() || !provider) {
      return;
    }
    
    await validateKey();
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    
    if (isValidated && validationResult?.valid) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    if (validationResult && !validationResult.valid) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    
    return null;
  };

  const getInputClassName = () => {
    if (isValidated && validationResult?.valid) {
      return "border-green-500 focus:ring-green-500";
    }
    
    if (validationResult && !validationResult.valid) {
      return "border-red-500 focus:ring-red-500";
    }
    
    return "";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="api-key">API Key</Label>
      
      <div className="relative">
        <Input
          id="api-key"
          type={showKey ? "text" : "password"}
          placeholder="Enter your API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={disabled}
          className={cn("pr-20", getInputClassName())}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {getValidationIcon()}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowKey(!showKey)}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title={showKey ? "Hide API key" : "Show API key"}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Validation Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleValidate}
        disabled={!apiKey.trim() || !provider || isValidating || disabled}
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

      {/* Validation Result */}
      {validationResult && (
        <div className={cn(
          "p-3 rounded-md text-sm",
          validationResult.valid 
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
        )}>
          {validationResult.valid ? (
            <div>
              <div className="font-medium">✓ API Key is valid!</div>
              <div className="mt-1">
                Provider: {validationResult.provider}
                {validationResult.detectedAutomatically && (
                  <span className="ml-1 text-xs">(auto-detected)</span>
                )}
                <br />
                Found {validationResult.modelCount || 0} models
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">✗ Validation failed</div>
              <div className="mt-1">{validationResult.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}