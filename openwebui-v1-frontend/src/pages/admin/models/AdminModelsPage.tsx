import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminKPICards } from "./components/AdminKPICards";
import { AdminFiltersToolbar } from "./components/AdminFiltersToolbar";
import { AdminModelsTable } from "./components/AdminModelsTable";
import { AdminModelSlideOver } from "./components/AdminModelSlideOver";
import { adminModelsService, type AdminModel } from "@/services/adminModelsService";
import { useToast } from "@/hooks/use-toast";

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

    // SlideOver state
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AdminModel | null>(null);

    // Fetch organization models
    const {
        data: modelsResponse,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: [
            "admin-organization-models",
            currentPage,
            pageSize,
            categoryFilter,
            tierFilter,
            searchQuery,
            sortBy,
            sortOrder
        ],
        queryFn: () => adminModelsService.getOrganizationModels({
            page: currentPage,
            limit: pageSize,
            category: categoryFilter && categoryFilter !== "all" ? categoryFilter : undefined,
            performance_tier: tierFilter && tierFilter !== "all" ? tierFilter : undefined,
            search: searchQuery || undefined,
            sort_by: sortBy,
            sort_order: sortOrder
        }),
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
            await queryClient.cancelQueries({ queryKey: ["admin-organization-models"] });

            // Snapshot the previous value
            const previousModels = queryClient.getQueryData([
                "admin-organization-models",
                currentPage,
                pageSize,
                categoryFilter,
                tierFilter,
                searchQuery,
                sortBy,
                sortOrder
            ]);

            // Optimistically update to the new value
            queryClient.setQueryData([
                "admin-organization-models",
                currentPage,
                pageSize,
                categoryFilter,
                tierFilter,
                searchQuery,
                sortBy,
                sortOrder
            ], (old: any) => {
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
            return { previousModels };
        },
        onSuccess: (_, { enabled }) => {
            toast({
                title: "Success",
                description: `Model ${enabled ? "enabled" : "disabled"} for your organization`,
            });
            // Don't invalidate queries - we've already updated optimistically
            // Only invalidate analytics since we don't update that optimistically
            queryClient.invalidateQueries({ queryKey: ["admin-organization-analytics"] });
        },
        onError: (error, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData([
                "admin-organization-models",
                currentPage,
                pageSize,
                categoryFilter,
                tierFilter,
                searchQuery,
                sortBy,
                sortOrder
            ], context?.previousModels);
            
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update model",
                variant: "destructive",
            });
        },
        onSettled: () => {
            // Always refetch after error or success to ensure we have the latest data
            queryClient.invalidateQueries({ queryKey: ["admin-organization-models"] });
        }
    });

    // Delete model mutation
    const deleteModelMutation = useMutation({
        mutationFn: (modelId: string) =>
            adminModelsService.deleteOrganizationModel(modelId),
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Model permanently removed from your organization",
            });
            queryClient.invalidateQueries({ queryKey: ["admin-organization-models"] });
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

    // Computed values
    const models = modelsResponse?.data || [];
    const pagination = modelsResponse?.pagination;
    const analytics = modelsResponse?.analytics;

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
        toggleModelMutation.mutate({ modelId, enabled });
    };

    const handleDeleteModel = (modelId: string) => {
        // Show confirmation dialog
        if (window.confirm('Are you sure you want to permanently remove this model from your organization? This action cannot be undone.')) {
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
                        There was an error loading your organization's models.
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
                        Manage your organization's AI models and monitor usage analytics
                    </p>
                </div>
                <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                >
                    Reset Filters
                </button>
            </div>

            {/* KPI Cards */}
            <AdminKPICards 
                models={models} 
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
            />

            {/* Models Table */}
            <AdminModelsTable
                models={models}
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
        </div>
    );
};

export default AdminModelsPage;