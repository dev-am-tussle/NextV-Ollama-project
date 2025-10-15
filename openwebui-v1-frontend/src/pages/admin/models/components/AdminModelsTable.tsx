import { 
    ChevronDown, 
    ChevronUp, 
    Eye, 
    Users, 
    Settings, 
    Info,
    ChevronLeft,
    ChevronRight,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AdminModel, AdminModelsPagination } from "@/services/adminModelsService";

interface AdminModelsTableProps {
    models: AdminModel[];
    isLoading: boolean;
    pagination?: AdminModelsPagination;
    onModelClick: (model: AdminModel) => void;
    onToggleModel: (modelId: string, enabled: boolean) => void;
    onDeleteModel: (modelId: string) => void;
    onPageChange: (page: number) => void;
    onSortChange: (field: string) => void;
    sortBy: string;
    sortOrder: "asc" | "desc";
    currentPage: number;
}

export const AdminModelsTable = ({
    models,
    isLoading,
    pagination,
    onModelClick,
    onToggleModel,
    onDeleteModel,
    onPageChange,
    onSortChange,
    sortBy,
    sortOrder,
    currentPage,
}: AdminModelsTableProps) => {
    const formatSize = (size: string) => {
        // Convert size like "1.4GB" or "2800MB" to a more readable format
        return size.replace(/(\d+(?:\.\d+)?)([KMGT]?B)/i, "$1 $2");
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            general: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
            coding: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
            creative: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
            analytical: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
            conversational: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400",
        };
        return colors[category as keyof typeof colors] || colors.general;
    };

    const getTierColor = (tier: string) => {
        const colors = {
            fast: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
            balanced: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
            powerful: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        };
        return colors[tier as keyof typeof colors] || colors.balanced;
    };

    const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 font-medium hover:bg-transparent"
            onClick={() => onSortChange(field)}
        >
            {children}
            {sortBy === field && (
                sortOrder === "asc" ? (
                    <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                    <ChevronDown className="ml-1 h-3 w-3" />
                )
            )}
        </Button>
    );

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading models...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (models.length === 0) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="text-center">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No models found
                        </h3>
                        <p className="text-muted-foreground">
                            No models match your current filters. Try adjusting your search criteria.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">
                                    <SortButton field="display_name">Model</SortButton>
                                </TableHead>
                                <TableHead>
                                    <SortButton field="category">Category</SortButton>
                                </TableHead>
                                <TableHead>
                                    <SortButton field="performance_tier">Tier</SortButton>
                                </TableHead>
                                <TableHead>
                                    <SortButton field="size">Size</SortButton>
                                </TableHead>
                                <TableHead className="text-center">
                                    <Users className="h-4 w-4 mx-auto" />
                                </TableHead>
                                <TableHead className="text-center">
                                    <Settings className="h-4 w-4 mx-auto" />
                                </TableHead>
                                <TableHead className="text-center">Enabled</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {models.map((model) => (
                                <TableRow 
                                    key={model._id} 
                                    className="hover:bg-muted/50 cursor-pointer"
                                    onClick={() => onModelClick(model)}
                                >
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium text-foreground">
                                                {model.display_name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {model.name}
                                            </div>
                                            {model.parameters && (
                                                <Badge variant="outline" className="text-xs">
                                                    {model.parameters}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="secondary" 
                                            className={`capitalize ${getCategoryColor(model.category)}`}
                                        >
                                            {model.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="secondary" 
                                            className={`capitalize ${getTierColor(model.performance_tier)}`}
                                        >
                                            {model.performance_tier}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {formatSize(model.size)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <span className="text-sm font-medium">
                                                {model.pulled_by_users || 0}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <span className="text-sm font-medium">
                                                {model.set_as_default_by_users || 0}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={model.org_enabled}
                                            onCheckedChange={(checked) => 
                                                onToggleModel(model._id, checked)
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onModelClick(model);
                                                }}
                                                title="View details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteModel(model._id);
                                                }}
                                                className="text-destructive hover:text-destructive"
                                                title="Delete from organization"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pagination.limit) + 1} to{" "}
                        {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
                        {pagination.total} models
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                const page = i + 1;
                                const isActive = page === currentPage;
                                return (
                                    <Button
                                        key={page}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </Button>
                                );
                            })}
                            {pagination.pages > 5 && (
                                <>
                                    <span className="text-muted-foreground">...</span>
                                    <Button
                                        variant={currentPage === pagination.pages ? "default" : "outline"}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => onPageChange(pagination.pages)}
                                    >
                                        {pagination.pages}
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= pagination.pages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};