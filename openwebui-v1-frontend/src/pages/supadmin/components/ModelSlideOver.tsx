import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Model } from "@/hooks/useModels";
import { ModelCategory, PerformanceTier } from "./ModelCatalog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";

interface ModelSlideOverProps {
    open: boolean;
    onClose: () => void;
    model: Model | null;
    isAddingModel: boolean;
    onSaved: () => void;
    onCreateModel: (modelData: Omit<Model, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
    onUpdateModel: (id: string, updates: Partial<Model>) => Promise<boolean>;
}

export const ModelSlideOver = ({ open, onClose, model, isAddingModel, onSaved, onCreateModel, onUpdateModel }: ModelSlideOverProps) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: "", // changed from exact_name
        display_name: "",
        description: "",
        size: "",
        parameters: "",
        category: "general" as ModelCategory,
        performance_tier: "balanced" as PerformanceTier,
        min_ram_gb: "",
        is_active: true,
        provider: "ollama",
        model_family: "",
    });
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (model) {
            setFormData({
                name: model.name,
                display_name: model.display_name,
                description: model.description,
                size: model.size,
                parameters: model.parameters || "",
                category: model.category,
                performance_tier: model.performance_tier,
                min_ram_gb: model.min_ram_gb?.toString() || "",
                is_active: model.is_active,
                provider: model.provider || "ollama",
                model_family: model.model_family || "",
            });
            setTags(model.tags || []);
        } else if (isAddingModel) {
            setFormData({
                name: "",
                display_name: "",
                description: "",
                size: "",
                parameters: "",
                category: "general",
                performance_tier: "balanced",
                min_ram_gb: "",
                is_active: true,
                provider: "ollama",
                model_family: "",
            });
            setTags([]);
        }
    }, [model, isAddingModel]);

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.display_name || !formData.description) {
            toast({ title: "Validation error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        
        try {
            let success = false;
            
            if (isAddingModel) {
                const modelData = {
                    name: formData.name,
                    display_name: formData.display_name,
                    description: formData.description,
                    size: formData.size,
                    parameters: formData.parameters,
                    category: formData.category,
                    performance_tier: formData.performance_tier,
                    min_ram_gb: formData.min_ram_gb ? parseInt(formData.min_ram_gb) : null,
                    is_active: formData.is_active,
                    provider: formData.provider,
                    model_family: formData.model_family,
                    tags: tags,
                    use_cases: [], // Can be added later
                };
                success = await onCreateModel(modelData);
                
                if (success) {
                    toast({ title: "Model added", description: `${formData.display_name} has been created` });
                }
            } else if (model) {
                const updates = {
                    ...formData,
                    tags: tags,
                    min_ram_gb: formData.min_ram_gb ? parseInt(formData.min_ram_gb) : null,
                };
                success = await onUpdateModel(model.id, updates);
                
                if (success) {
                    toast({ title: "Model updated", description: `${formData.display_name} has been saved` });
                }
            }
            
            if (!success) {
                toast({ 
                    title: "Error", 
                    description: `Failed to ${isAddingModel ? "create" : "update"} model`, 
                    variant: "destructive" 
                });
            } else {
                onSaved();
            }
        } catch (error) {
            toast({ 
                title: "Error", 
                description: "An unexpected error occurred", 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isAddingModel ? "Add New Model" : model?.display_name}</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {!isAddingModel && model && (
                        <div className="flex items-center justify-between">
                            <Label>Active Status</Label>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Model Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g., llama2:13b"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name *</Label>
                        <Input
                            id="display_name"
                            placeholder="e.g., Gemini 2.5 Flash"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Brief description of the model's capabilities"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="size">Size *</Label>
                            <Input
                                id="size"
                                placeholder="e.g., 1.4GB"
                                value={formData.size}
                                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="parameters">Parameters</Label>
                            <Input
                                id="parameters"
                                placeholder="e.g., 2B"
                                value={formData.parameters}
                                onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as ModelCategory })}>
                            <SelectTrigger id="category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="coding">Coding</SelectItem>
                                <SelectItem value="creative">Creative</SelectItem>
                                <SelectItem value="analytical">Analytical</SelectItem>
                                <SelectItem value="conversational">Conversational</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tier">Performance Tier</Label>
                        <Select
                            value={formData.performance_tier}
                            onValueChange={(value) => setFormData({ ...formData, performance_tier: value as PerformanceTier })}
                        >
                            <SelectTrigger id="tier">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fast">Fast</SelectItem>
                                <SelectItem value="balanced">Balanced</SelectItem>
                                <SelectItem value="powerful">Powerful</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="min_ram">Min RAM (GB)</Label>
                        <Input
                            id="min_ram"
                            type="number"
                            placeholder="e.g., 4"
                            value={formData.min_ram_gb}
                            onChange={(e) => setFormData({ ...formData, min_ram_gb: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                id="tags"
                                placeholder="Add a tag"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                            />
                            <Button type="button" variant="outline" onClick={handleAddTag}>
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAddingModel ? "Create Model" : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};