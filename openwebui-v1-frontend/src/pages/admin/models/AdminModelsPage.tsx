import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminKPICards } from "./components/AdminKPICards";
import { AdminFiltersToolbar } from "./components/AdminFiltersToolbar";
import { AdminModelsTable } from "./components/AdminModelsTable";
import { AdminModelSlideOver } from "./components/AdminModelSlideOver";
import { AdminExternalApiManager } from "@/components/admin/AdminExternalApiManager";
import { AdminApiErrorBoundary } from "@/components/admin/AdminApiErrorBoundary";
import { adminModelsService, type AdminModel } from "@/services/adminModelsService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export const AdminModelsPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State for filtering and selection
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("display_name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [showExternalModels, setShowExternalModels] = useState(true);

    // SlideOver state
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AdminModel | null>(null);
    
    // API Manager state
    const [apiManagerOpen, setApiManagerOpen] = useState(false);

    // Fetch combined models (organization + external APIs)
    const {
        data: combinedModelsResponse,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ["admin-combined-models"],
        queryFn: () => adminModelsService.getCombinedModelsForUI(),
        staleTime: 30000, // 30 seconds
    });

    // Fetch analytics
    const { data: analyticsData } = useQuery({
        queryKey: ["admin-organization-analytics"],
        queryFn: () => adminModelsService.getOrganizationAnalytics(),
        staleTime: 60000, // 1 minute
    });

    // Toggle model mutation
    const toggleModelMutation = useMutation({
        mutationFn: ({ modelId, enabled }: { modelId: string; enabled: boolean }) =>
            adminModelsService.toggleOrganizationModel(modelId, enabled),
        onMutate: async ({ modelId, enabled }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["admin-combined-models"] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(["admin-combined-models"]);

            // Optimistically update to the new value
            queryClient.setQueryData(["admin-combined-models"], (old: any) => {
                if (!old?.data) return old;
                
                return {
                    ...old,
                    data: old.data.map((model: AdminModel) =>
                        model._id === modelId
                            ? { ...model, org_enabled: enabled }
                            : model
                    )
                };
            });

            // Return a context object with the snapshotted value
            return { previousData };
        },
        onSuccess: (_, { enabled }) => {
            toast({
                title: "Success",
                description: `Model ${enabled ? "enabled" : "disabled"} for your organization`,
            });
        },
        onError: (error, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(["admin-combined-models"], context?.previousData);
            
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update model",
                variant: "destructive",
            });
        },
        onSettled: () => {
            // Always refetch after error or success to ensure we have the latest data
            queryClient.invalidateQueries({ queryKey: ["admin-combined-models"] });
        }
    });

    // Delete model mutation
    const deleteModelMutation = useMutation({
        mutationFn: (modelId: string) =>
            adminModelsService.deleteOrganizationModel(modelId),
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Model permanently removed from your department",
            });
            queryClient.invalidateQueries({ queryKey: ["admin-combined-models"] });
            queryClient.invalidateQueries({ queryKey: ["admin-organization-analytics"] });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete model",
                variant: "destructive",
            });
        }
    });

    // Computed values with client-side filtering and sorting
    const allModels = combinedModelsResponse?.data || [];
    const combinedStatistics = combinedModelsResponse?.statistics;
    const externalApisInfo = combinedModelsResponse?.external_apis;
    
    // Client-side filtering
    const filteredModels = useMemo(() => {
        let filtered = allModels;

        // Filter by source type
        if (!showExternalModels) {
            filtered = filtered.filter(model => model.source_type !== 'external_api');
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(model =>
                model.display_name.toLowerCase().includes(query) ||
                model.name.toLowerCase().includes(query) ||
                model.description.toLowerCase().includes(query) ||
                model.provider.toLowerCase().includes(query)
            );
        }

        // Filter by category
        if (categoryFilter && categoryFilter !== "all") {
            filtered = filtered.filter(model => model.category === categoryFilter);
        }

        // Filter by tier
        if (tierFilter && tierFilter !== "all") {
            filtered = filtered.filter(model => model.performance_tier === tierFilter);
        }

        return filtered;
    }, [allModels, searchQuery, categoryFilter, tierFilter, showExternalModels]);

    // Client-side sorting
    const sortedModels = useMemo(() => {
        const sorted = [...filteredModels];
        
        sorted.sort((a, b) => {
            let aValue = a[sortBy as keyof AdminModel];
            let bValue = b[sortBy as keyof AdminModel];
            
            // Handle special cases for sorting
            if (sortBy === 'size') {
                // Convert size to bytes for proper sorting
                const parseSize = (size: string) => {
                    const match = size.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB|B)/i);
                    if (!match) return 0;
                    const value = parseFloat(match[1]);
                    const unit = match[2].toUpperCase();
                    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
                    return value * (multipliers[unit as keyof typeof multipliers] || 0);
                };
                aValue = parseSize(a.size);
                bValue = parseSize(b.size);
            }
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }, [filteredModels, sortBy, sortOrder]);

    // Client-side pagination
    const paginatedModels = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedModels.slice(startIndex, endIndex);
    }, [sortedModels, currentPage, pageSize]);

    // Mock pagination object for UI compatibility
    const pagination = useMemo(() => ({
        page: currentPage,
        limit: pageSize,
        total: sortedModels.length,
        pages: Math.ceil(sortedModels.length / pageSize)
    }), [currentPage, pageSize, sortedModels.length]);

    // Create analytics from current filtered data
    const analytics = useMemo(() => {
        const categoryCount: Record<string, number> = {};
        const tierCount: Record<string, number> = {};
        
        filteredModels.forEach(model => {
            categoryCount[model.category] = (categoryCount[model.category] || 0) + 1;
            tierCount[model.performance_tier] = (tierCount[model.performance_tier] || 0) + 1;
        });
        
        return {
            total_models: filteredModels.length,
            models_by_category: categoryCount,
            models_by_tier: tierCount
        };
    }, [filteredModels]);

    // Event handlers
    const handleModelClick = (model: AdminModel) => {
        setSelectedModel(model);
        setSlideOverOpen(true);
    };

    const handleCloseSlideOver = () => {
        setSlideOverOpen(false);
        setSelectedModel(null);
    };

    const handleToggleModel = (modelId: string, enabled: boolean) => {
        // Find the model to check if it's external
        const model = allModels.find(m => m._id === modelId);
        if (model?.source_type === 'external_api') {
            toast({
                title: "Cannot toggle external model",
                description: "External API models cannot be toggled. They are managed through API configuration.",
                variant: "destructive",
            });
            return;
        }
        toggleModelMutation.mutate({ modelId, enabled });
    };

    const handleDeleteModel = (modelId: string) => {
        // Find the model to check if it's external
        const model = allModels.find(m => m._id === modelId);
        if (model?.source_type === 'external_api') {
            toast({
                title: "Cannot delete external model",
                description: "External API models cannot be deleted from here. Manage them through API configuration.",
                variant: "destructive",
            });
            return;
        }
        
        // Show confirmation dialog
        if (window.confirm('Are you sure you want to permanently remove this model from your department? This action cannot be undone.')) {
            deleteModelMutation.mutate(modelId);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSortChange = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
        setCurrentPage(1); // Reset to first page when sorting changes
    };

    // Reset pagination when filters change
    const resetFilters = () => {
        setSearchQuery("");
        setCategoryFilter("all");
        setTierFilter("all");
        setSortBy("display_name");
        setSortOrder("asc");
        setCurrentPage(1);
    };

    if (isError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Failed to load models
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        There was an error loading your department's models.
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Model Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your department's AI models and monitor usage analytics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setApiManagerOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        API Configuration
                    </Button>
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <AdminKPICards 
                models={filteredModels} 
                analytics={analytics}
                detailedAnalytics={analyticsData?.data}
            />

            {/* Filters and Search */}
            <AdminFiltersToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                tierFilter={tierFilter}
                onTierChange={setTierFilter}
                onRefresh={() => refetch()}
                showExternalModels={showExternalModels}
                onToggleExternalModels={setShowExternalModels}
            />

            {/* Models Table */}
            <AdminModelsTable
                models={paginatedModels}
                isLoading={isLoading}
                pagination={pagination}
                onModelClick={handleModelClick}
                onToggleModel={handleToggleModel}
                onDeleteModel={handleDeleteModel}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                currentPage={currentPage}
            />

            {/* Model Details SlideOver */}
            <AdminModelSlideOver
                open={slideOverOpen}
                onClose={handleCloseSlideOver}
                model={selectedModel}
                onToggleModel={handleToggleModel}
                onDeleteModel={handleDeleteModel}
            />

            {/* Admin External API Manager */}
            <AdminApiErrorBoundary>
                <AdminExternalApiManager
                    open={apiManagerOpen}
                    onOpenChange={setApiManagerOpen}
                />
            </AdminApiErrorBoundary>
        </div>
    );
};

export default AdminModelsPage;