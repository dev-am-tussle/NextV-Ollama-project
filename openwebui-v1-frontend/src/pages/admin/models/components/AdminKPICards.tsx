import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Activity, 
    Check, 
    Users, 
    TrendingUp, 
    Database,
    Settings,
    BarChart3,
    Target
} from "lucide-react";
import { AdminModel, AdminModelAnalytics, DetailedAnalytics } from "@/services/adminModelsService";

interface AdminKPICardsProps {
    models: AdminModel[];
    analytics?: AdminModelAnalytics;
    detailedAnalytics?: DetailedAnalytics;
}

export const AdminKPICards = ({ models, analytics, detailedAnalytics }: AdminKPICardsProps) => {
    const kpis = useMemo(() => {
        // Basic model statistics
        const totalModels = models.length;
        const modelsByCategory = models.reduce((acc, model) => {
            acc[model.category] = (acc[model.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const modelsByTier = models.reduce((acc, model) => {
            acc[model.performance_tier] = (acc[model.performance_tier] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Usage statistics
        const totalPulledByUsers = models.reduce((sum, model) => sum + (model.pulled_by_users || 0), 0);
        const totalSetAsDefault = models.reduce((sum, model) => sum + (model.set_as_default_by_users || 0), 0);
        
        // Top model by usage
        const topModel = models.reduce((prev, current) => {
            const prevUsage = (prev.pulled_by_users || 0) + (prev.set_as_default_by_users || 0);
            const currentUsage = (current.pulled_by_users || 0) + (current.set_as_default_by_users || 0);
            return currentUsage > prevUsage ? current : prev;
        }, models[0]);

        // Most popular category
        const popularCategory = Object.entries(modelsByCategory).reduce((prev, current) => 
            current[1] > prev[1] ? current : prev
        , ["none", 0])[0];

        return {
            totalModels,
            totalPulledByUsers,
            totalSetAsDefault,
            topModel: topModel?.display_name || "N/A",
            popularCategory: popularCategory !== "none" ? popularCategory : "N/A",
            totalUsers: detailedAnalytics?.total_users || 0,
            usersWithDefault: detailedAnalytics?.users_with_default_model || 0,
            modelUtilization: totalModels > 0 ? Math.round((totalPulledByUsers / totalModels) * 100) / 100 : 0
        };
    }, [models, detailedAnalytics]);

    const cards = [
        {
            title: "Available Models",
            value: kpis.totalModels,
            icon: Database,
            gradient: "from-blue-500/10 to-blue-600/5",
            iconColor: "text-blue-600 dark:text-blue-400",
            description: "Models in your org"
        },
        {
            title: "Total Users",
            value: kpis.totalUsers,
            icon: Users,
            gradient: "from-emerald-500/10 to-emerald-600/5",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            description: "Organization members"
        },
        {
            title: "Model Pulls",
            value: kpis.totalPulledByUsers,
            icon: Activity,
            gradient: "from-violet-500/10 to-violet-600/5",
            iconColor: "text-violet-600 dark:text-violet-400",
            description: "Total downloads"
        },
        {
            title: "Default Settings",
            value: kpis.totalSetAsDefault,
            icon: Settings,
            gradient: "from-amber-500/10 to-amber-600/5",
            iconColor: "text-amber-600 dark:text-amber-400",
            description: "Users with defaults"
        },
        {
            title: "Top Model",
            value: kpis.topModel,
            icon: TrendingUp,
            gradient: "from-rose-500/10 to-rose-600/5",
            iconColor: "text-rose-600 dark:text-rose-400",
            valueClass: "text-lg",
            description: "Most popular"
        },
        {
            title: "Popular Category",
            value: kpis.popularCategory,
            icon: BarChart3,
            gradient: "from-indigo-500/10 to-indigo-600/5",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            valueClass: "text-lg capitalize",
            description: "Most used type"
        },
        {
            title: "Avg Downloads",
            value: `${kpis.modelUtilization}`,
            icon: Target,
            gradient: "from-teal-500/10 to-teal-600/5",
            iconColor: "text-teal-600 dark:text-teal-400",
            description: "Per model"
        },
        {
            title: "Users w/ Defaults",
            value: kpis.usersWithDefault,
            icon: Check,
            gradient: "from-green-500/10 to-green-600/5",
            iconColor: "text-green-600 dark:text-green-400",
            description: "Configured users"
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <Card key={index} className="border border-border overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {card.title}
                                </p>
                                <p className={`text-2xl font-bold text-foreground ${card.valueClass || ""}`}>
                                    {card.value}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {card.description}
                                </p>
                            </div>
                            <div className={`rounded-lg bg-background p-2 ${card.iconColor}`}>
                                <card.icon className="h-4 w-4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};