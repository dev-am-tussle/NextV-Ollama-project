import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { GitCompare, ChevronDown, Gem, Wind, Brain, Atom } from "lucide-react";

export type ModelKey = "Mistral" | "Gemma" | "Phi" | "Ollama";

interface ModelSelectorProps {
  selected: ModelKey;
  onSelect: (m: ModelKey) => void;
  compareMode: boolean;
  onToggleCompare: () => void;
}

const iconFor = (model: ModelKey) => {
  switch (model) {
    case "Gemma":
      return <Gem className="h-4 w-4" />;
    case "Phi":
      return <Atom className="h-4 w-4" />;
    case "Ollama":
      return <Brain className="h-4 w-4" />;
    case "Mistral":
    default:
      return <Wind className="h-4 w-4" />;
  }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selected,
  onSelect,
  compareMode,
  onToggleCompare,
}) => {
  const models: ModelKey[] = ["Mistral", "Gemma", "Phi", "Ollama"];
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
