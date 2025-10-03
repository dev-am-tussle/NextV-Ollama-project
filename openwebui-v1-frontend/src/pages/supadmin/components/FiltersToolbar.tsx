import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ModelCategory, PerformanceTier } from "./ModelCatalog";

interface FiltersToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    categoryFilter: ModelCategory | "all";
    onCategoryChange: (value: ModelCategory | "all") => void;
    tierFilter: PerformanceTier | "all";
    onTierChange: (value: PerformanceTier | "all") => void;
    activeFilter: "all" | "active" | "inactive";
    onActiveChange: (value: "all" | "active" | "inactive") => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    onAddModel: () => void;
    onSeedModels?: () => void;
}

const tierColors = {
    fast: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    balanced: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    powerful: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export const FiltersToolbar = ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    tierFilter,
    onTierChange,
    activeFilter,
    onActiveChange,
    selectedTags,
    onTagsChange,
    onAddModel,
    onSeedModels,
}: FiltersToolbarProps) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or tag..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Category */}
                <Select value={categoryFilter} onValueChange={onCategoryChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="analytical">Analytical</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                </Select>

                {/* Availability */}
                <Select value={activeFilter} onValueChange={onActiveChange}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                {/* Seed Models Button (for development) */}
                {onSeedModels && (
                    <Button onClick={onSeedModels} variant="outline" size="sm">
                        Seed Data
                    </Button>
                )}

                {/* Add Model Button */}
                <Button 
                    onClick={onAddModel} 
                    className="ml-auto"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Model
                </Button>
            </div>

            {/* Performance Tier Chips */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Performance:</span>
                <Badge
                    variant={tierFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => onTierChange("all")}
                >
                    All
                </Badge>
                <Badge
                    variant="outline"
                    className={`cursor-pointer ${tierFilter === "fast" ? tierColors.fast : ""}`}
                    onClick={() => onTierChange(tierFilter === "fast" ? "all" : "fast")}
                >
                    Fast
                </Badge>
                <Badge
                    variant="outline"
                    className={`cursor-pointer ${tierFilter === "balanced" ? tierColors.balanced : ""}`}
                    onClick={() => onTierChange(tierFilter === "balanced" ? "all" : "balanced")}
                >
                    Balanced
                </Badge>
                <Badge
                    variant="outline"
                    className={`cursor-pointer ${tierFilter === "powerful" ? tierColors.powerful : ""}`}
                    onClick={() => onTierChange(tierFilter === "powerful" ? "all" : "powerful")}
                >
                    Powerful
                </Badge>
            </div>
        </div>
    );
};