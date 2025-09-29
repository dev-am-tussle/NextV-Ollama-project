import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { GitCompare, ChevronDown, Gem, Wind, Brain, Atom } from "lucide-react";

export type ModelKey = "Gemma" | "Phi";

interface ModelSelectorProps {
  selected: ModelKey;
  onSelect: (m: ModelKey) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  // optional list of models user is allowed to use (backend-provided)
  availableModels?: string[] | null;
}

const iconFor = (model: ModelKey) => {
  switch (model) {
    case "Gemma":
      return <Gem className="h-4 w-4" />;
    case "Phi":
      return <Atom className="h-4 w-4" />;
    default:
      return <Wind className="h-4 w-4" />;
  }
};

// Single source of truth mapping from UI key to backend model id.
export const keyToBackend: Record<ModelKey, string> = {
  Gemma: "gemma:2b",
  Phi: "phi:2.7b",
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selected,
  onSelect,
  compareMode,
  onToggleCompare,
  availableModels,
}) => {
  // Derive allowed backend ids from the server-provided `availableModels` array (this should
  // come from the user's `settings.avail_models` returned at login). If the server doesn't
  // provide any models, use a minimal safe fallback so the UI remains usable.
  const allowedBackendIds = new Set<string>();
  if (availableModels && availableModels.length > 0) {
    for (const m of availableModels) {
      if (typeof m === "string" && m.trim()) allowedBackendIds.add(m);
    }
  } else {
    // minimal safe fallback
    allowedBackendIds.add("gemma:2b");
    allowedBackendIds.add("phi:2.7b");
  }

  // Build a reverse map from backend id -> preferred UI key (ModelKey). This selects the
  // first UI key that maps to a backend id so we can display friendly names while preserving
  // the ModelKey typing used across the app.
  const backendToKey = Object.entries(keyToBackend).reduce(
    (acc, [uiKey, backendId]) => {
      if (!acc[backendId]) acc[backendId] = uiKey as ModelKey;
      return acc;
    },
    {} as Record<string, ModelKey>
  );

  // Only include UI options that correspond to allowed backend ids.
  let models: ModelKey[] = Array.from(allowedBackendIds)
    .map((id) => backendToKey[id])
    .filter(Boolean) as ModelKey[];

  // If nothing matched (defensive), fall back to the original set so the dropdown isn't empty.
  if (models.length === 0) models = ["Gemma", "Phi"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 pr-2"
        >
          {iconFor(selected)}
          <span className="font-medium">{selected}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 bg-popover border border-border"
      >
        {models.map((m) => (
          <DropdownMenuItem
            key={m}
            onClick={() => onSelect(m)}
            className="flex items-center gap-2"
          >
            {iconFor(m)} <span>{m}</span>
          </DropdownMenuItem>
        ))}
        <div className="my-1 border-t border-border" />
        <DropdownMenuItem
          onClick={onToggleCompare}
          className="flex items-center gap-2"
        >
          <GitCompare className="h-4 w-4" />
          <span>{compareMode ? "Disable" : "Enable"} Compare</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { iconFor as modelIcon };
