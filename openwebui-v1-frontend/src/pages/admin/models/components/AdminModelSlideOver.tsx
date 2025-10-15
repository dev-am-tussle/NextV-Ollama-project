import { X, Users, Settings, Database, Tag, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { AdminModel } from "@/services/adminModelsService";

interface AdminModelSlideOverProps {
    open: boolean;
    onClose: () => void;
    model: AdminModel | null;
    onToggleModel: (modelId: string, enabled: boolean) => void;
    onDeleteModel: (modelId: string) => void;
}

export const AdminModelSlideOver = ({
    open,
    onClose,
    model,
    onToggleModel,
    onDeleteModel,
}: AdminModelSlideOverProps) => {
    if (!model) return null;

    const formatSize = (size: string) => {
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

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
                <SheetHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <SheetTitle className="text-xl font-bold">
                                {model.display_name}
                            </SheetTitle>
                            <p className="text-sm text-muted-foreground font-mono">
                                {model.name}
                            </p>
                            <div className="flex items-center space-x-2">
                                <Badge 
                                    variant="secondary" 
                                    className={`capitalize ${getCategoryColor(model.category)}`}
                                >
                                    {model.category}
                                </Badge>
                                <Badge 
                                    variant="secondary" 
                                    className={`capitalize ${getTierColor(model.performance_tier)}`}
                                >
                                    {model.performance_tier}
                                </Badge>
                                {model.parameters && (
                                    <Badge variant="outline">
                                        {model.parameters}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Model Status */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <Settings className="h-4 w-4 mr-2" />
                                Model Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                                <div>
                                    <p className="font-medium">Enabled for Organization</p>
                                    <p className="text-sm text-muted-foreground">
                                        Users can download and use this model
                                    </p>
                                </div>
                                <Switch
                                    checked={model.org_enabled}
                                    onCheckedChange={(checked) => onToggleModel(model._id, checked)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                                <div>
                                    <p className="font-medium">Remove from Organization</p>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete this model from your organization
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to permanently remove this model from your organization? This action cannot be undone.')) {
                                            onDeleteModel(model._id);
                                            onClose();
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Usage Statistics */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                Usage Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 border border-border rounded-lg">
                                    <div className="text-2xl font-bold text-foreground">
                                        {model.pulled_by_users || 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Users Downloaded
                                    </div>
                                </div>
                                <div className="text-center p-4 border border-border rounded-lg">
                                    <div className="text-2xl font-bold text-foreground">
                                        {model.set_as_default_by_users || 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Set as Default
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <Database className="h-4 w-4 mr-2" />
                                Model Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Provider</p>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {model.provider}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Size</p>
                                    <p className="text-sm text-muted-foreground font-mono">
                                        {formatSize(model.size)}
                                    </p>
                                </div>
                                {model.model_family && (
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Family</p>
                                        <p className="text-sm text-muted-foreground capitalize">
                                            {model.model_family}
                                        </p>
                                    </div>
                                )}
                                {model.min_ram_gb && (
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Min RAM</p>
                                        <p className="text-sm text-muted-foreground">
                                            {model.min_ram_gb} GB
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <p className="text-sm font-medium text-foreground mb-2">Description</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {model.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Use Cases */}
                    {model.use_cases && model.use_cases.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center">
                                    <Zap className="h-4 w-4 mr-2" />
                                    Use Cases
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {model.use_cases.map((useCase, index) => (
                                        <Badge 
                                            key={index} 
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            {useCase.replace("-", " ")}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tags */}
                    {model.tags && model.tags.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center">
                                    <Tag className="h-4 w-4 mr-2" />
                                    Tags
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {model.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Timestamps */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-medium text-foreground">Created</p>
                                    <p className="text-muted-foreground">
                                        {new Date(model.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Updated</p>
                                    <p className="text-muted-foreground">
                                        {new Date(model.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
};