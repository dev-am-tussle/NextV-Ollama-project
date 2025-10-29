import { Search, RefreshCw, Filter, Cloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AdminFiltersToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    categoryFilter: string;
    onCategoryChange: (value: string) => void;
    tierFilter: string;
    onTierChange: (value: string) => void;
    onRefresh: () => void;
    showExternalModels?: boolean;
    onToggleExternalModels?: (show: boolean) => void;
}

export const AdminFiltersToolbar = ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    tierFilter,
    onTierChange,
    onRefresh,
    showExternalModels = true,
    onToggleExternalModels,
}: AdminFiltersToolbarProps) => {
    const categories = [
        { value: "all", label: "All Categories" },
        { value: "general", label: "General" },
        { value: "coding", label: "Coding" },
        { value: "creative", label: "Creative" },
        { value: "analytical", label: "Analytical" },
        { value: "conversational", label: "Conversational" },
        { value: "external", label: "External APIs" }
    ];

    const performanceTiers = [
        { value: "all", label: "All Tiers" },
        { value: "fast", label: "Fast" },
        { value: "balanced", label: "Balanced" },
        { value: "powerful", label: "Powerful" }
    ];

    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Search models by name, description..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* External Models Toggle */}
            {onToggleExternalModels && (
                <div className="flex items-center space-x-2 shrink-0">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="show-external" className="text-sm font-medium">
                        External APIs
                    </Label>
                    <Switch
                        id="show-external"
                        checked={showExternalModels}
                        onCheckedChange={onToggleExternalModels}
                    />
                </div>
            )}

            {/* Category Filter */}
            <div className="min-w-[160px]">
                <Select value={categoryFilter} onValueChange={onCategoryChange}>
                    <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                                {category.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Performance Tier Filter */}
            <div className="min-w-[160px]">
                <Select value={tierFilter} onValueChange={onTierChange}>
                    <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Performance" />
                    </SelectTrigger>
                    <SelectContent>
                        {performanceTiers.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                                {tier.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Refresh Button */}
            <Button 
                variant="outline" 
                size="default"
                onClick={onRefresh}
                className="shrink-0"
            >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
            </Button>
        </div>
    );
};