import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Eye, TestTube, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Model } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";

interface ModelsTableProps {
    models: Model[];
    isLoading: boolean;
    onModelClick: (model: Model) => void;
    onRefresh: () => void;
    onUpdateModel: (id: string, updates: Partial<Model>) => Promise<boolean>;
    onDeleteModel: (id: string) => Promise<boolean>;
}

const tierColors = {
    fast: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    balanced: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    powerful: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700",
};

export const ModelsTable = ({ models, isLoading, onModelClick, onRefresh, onUpdateModel, onDeleteModel }: ModelsTableProps) => {
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const { toast } = useToast();

    const handleStatusToggle = async (model: Model, newStatus: boolean) => {
        setUpdatingStatus(model.id);
        
        const success = await onUpdateModel(model.id, { is_active: newStatus });
        
        if (success) {
            toast({
                title: newStatus ? "Model activated" : "Model deactivated",
                description: `${model.display_name} is now ${newStatus ? "active" : "inactive"}`,
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to update model status",
                variant: "destructive",
            });
        }
        
        setUpdatingStatus(null);
    };

    const handleDelete = async (model: Model) => {
        if (!confirm(`Are you sure you want to delete ${model.display_name}?`)) return;

        const success = await onDeleteModel(model.id);
        
        if (success) {
            toast({
                title: "Model deleted",
                description: `${model.display_name} has been removed`,
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to delete model",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isLoading && models.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-lg font-semibold text-foreground">Models (0)</h2>
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-3 mb-4">
                        <TestTube className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No Models Found</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                        Your database is empty. Click "Add Model" to create a new one.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">Models ({models.length})</h2>
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>RAM</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pulled</TableHead>
                        <TableHead className="text-right">Usage (24h)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {models.map((model) => (
                        <TableRow
                            key={model.id}
                            className={`cursor-pointer ${!model.is_active ? "opacity-60" : ""}`}
                            onClick={() => onModelClick(model)}
                        >
                            <TableCell>
                                <div>
                                    <div className="font-medium text-foreground">{model.display_name}</div>
                                    <div className="font-mono text-xs text-muted-foreground">{model.exact_name}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {model.size}
                                    {model.parameters && ` (${model.parameters})`}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`${tierColors[model.performance_tier]} capitalize`}>
                                    {model.performance_tier}
                                </Badge>
                            </TableCell>
                            <TableCell className="capitalize text-muted-foreground">{model.category}</TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    {model.tags?.slice(0, 2).map((tag, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {(model.tags?.length || 0) > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{(model.tags?.length || 0) - 2}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{model.min_ram_gb || "N/A"} GB</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={model.is_active}
                                    onCheckedChange={(checked) => handleStatusToggle(model, checked)}
                                    disabled={updatingStatus === model.id}
                                />
                            </TableCell>
                            <TableCell>
                                {model.is_pulled ? (
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">
                                        Yes
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30">
                                        No
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-medium">{model.usage_24h || 0}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onModelClick(model)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(model)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};