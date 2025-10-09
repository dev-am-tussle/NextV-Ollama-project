import { useState, useMemo } from "react";
import { KPICards } from "./KPICards";
import { FiltersToolbar } from "./FiltersToolbar";
import { ModelsTable } from "./ModelsTable";
import { ModelSlideOver } from "./ModelSlideOver";
import { ActivityLog } from "./ActivityLog";
import { Button } from "@/components/ui/button";
import { useModels, type Model } from "@/hooks/useModels";

export type PerformanceTier = "fast" | "balanced" | "powerful";
export type ModelCategory = "general" | "coding" | "creative" | "analytical" | "conversational";

// Re-export Model type for components
export type { Model };

export const ModelCatalog = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<ModelCategory | "all">("all");
    const [tierFilter, setTierFilter] = useState<PerformanceTier | "all">("all");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [isAddingModel, setIsAddingModel] = useState(false);

    const { models, isLoading, backendOnline, lastError, refetch, updateModel, createModel, deleteModel } = useModels();

    const filteredModels = useMemo(() => {
        return models.filter((model) => {
            if (searchQuery && !model.display_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !model.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (categoryFilter !== "all" && model.category !== categoryFilter) {
                return false;
            }
            if (tierFilter !== "all" && model.performance_tier !== tierFilter) {
                return false;
            }
            if (activeFilter === "active" && !model.is_active) {
                return false;
            }
            if (activeFilter === "inactive" && model.is_active) {
                return false;
            }
            if (selectedTags.length > 0) {
                const modelTags = model.tags || [];
                if (!selectedTags.some((tag) => modelTags.includes(tag))) {
                    return false;
                }
            }
            return true;
        });
    }, [models, searchQuery, categoryFilter, tierFilter, activeFilter, selectedTags]);

    const handleModelClick = (model: Model) => {
        setSelectedModel(model);
        setIsAddingModel(false);
        setSlideOverOpen(true);
    };

    const handleAddModel = () => {
        setSelectedModel(null);
        setIsAddingModel(true);
        setSlideOverOpen(true);
    };

    const handleCloseSlideOver = () => {
        setSlideOverOpen(false);
        setSelectedModel(null);
        setIsAddingModel(false);
    };

    const handleModelSaved = () => {
        refetch();
        handleCloseSlideOver();
    };

    return (
        <div className="space-y-6">
            {!backendOnline && lastError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse"></div>
                        <h3 className="font-medium text-destructive">Backend Offline</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{lastError}</p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refetch} 
                        className="mt-3"
                    >
                        Retry Connection
                    </Button>
                </div>
            )}

            <KPICards models={models} />

            <FiltersToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                tierFilter={tierFilter}
                onTierChange={setTierFilter}
                activeFilter={activeFilter}
                onActiveChange={setActiveFilter}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                onAddModel={handleAddModel}
            />

            <ModelsTable
                models={filteredModels}
                isLoading={isLoading}
                onModelClick={handleModelClick}
                onRefresh={refetch}
                onUpdateModel={updateModel}
                onDeleteModel={deleteModel}
            />

            <ModelSlideOver
                open={slideOverOpen}
                onClose={handleCloseSlideOver}
                model={selectedModel}
                isAddingModel={isAddingModel}
                onSaved={handleModelSaved}
                onCreateModel={createModel}
                onUpdateModel={updateModel}
            />

            <ActivityLog />
        </div>
    );
};