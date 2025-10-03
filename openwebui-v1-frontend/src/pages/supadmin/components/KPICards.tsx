import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Check, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { Model } from "@/hooks/useModels";

interface KPICardsProps {
  models: Model[];
}

export const KPICards = ({ models }: KPICardsProps) => {
  const kpis = useMemo(() => {
    const activeModels = models.filter((m) => m.is_active).length;
    const disabledModels = models.filter((m) => !m.is_active).length;
    const unpulledModels = models.filter((m) => !m.is_pulled).length;
    
    const usages = models.map((m) => m.usage_24h || 0);
    const topModel = models.reduce((prev, current) => 
      (current.usage_24h || 0) > (prev.usage_24h || 0) ? current : prev
    , models[0]);

    // Mock avg latency for now
    const avgLatency = 245;

    return {
      activeModels,
      disabledModels,
      avgLatency,
      topModel: topModel?.display_name || "N/A",
      unpulledModels,
    };
  }, [models]);

  const cards = [
    {
      title: "Active Models",
      value: kpis.activeModels,
      icon: Check,
      gradient: "from-emerald-500/10 to-emerald-600/5",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Disabled Models",
      value: kpis.disabledModels,
      icon: AlertCircle,
      gradient: "from-amber-500/10 to-amber-600/5",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Avg Token Latency",
      value: `${kpis.avgLatency}ms`,
      icon: Clock,
      gradient: "from-indigo-500/10 to-indigo-600/5",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Top Used Model (24h)",
      value: kpis.topModel,
      icon: TrendingUp,
      gradient: "from-rose-500/10 to-rose-600/5",
      iconColor: "text-rose-600 dark:text-rose-400",
      valueClass: "text-lg",
    },
    {
      title: "Unpulled Models",
      value: kpis.unpulledModels,
      icon: Activity,
      gradient: "from-violet-500/10 to-violet-600/5",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="border border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-3xl font-bold text-foreground ${card.valueClass || ""}`}>
                  {card.value}
                </p>
              </div>
              <div className={`rounded-lg bg-background p-2.5 ${card.iconColor}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};