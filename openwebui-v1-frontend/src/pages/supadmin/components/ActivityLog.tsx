import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
    details: any;
}

// Mock audit logs
const mockLogs: AuditLog[] = [
    { id: "1", action: "Enabled model Gemini 2B", created_at: new Date(Date.now() - 300000).toISOString(), details: {} },
    { id: "2", action: "Updated description for Phi 2.7B", created_at: new Date(Date.now() - 600000).toISOString(), details: {} },
    { id: "3", action: "Added tag 'recommended' to GPT-5 Mini", created_at: new Date(Date.now() - 900000).toISOString(), details: {} },
    { id: "4", action: "Disabled model Llama 3 70B", created_at: new Date(Date.now() - 1200000).toISOString(), details: {} },
    { id: "5", action: "Started pull for Code Llama 7B", created_at: new Date(Date.now() - 1500000).toISOString(), details: {} },
];

export const ActivityLog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs] = useState<AuditLog[]>(mockLogs);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                            <Button variant="ghost" size="sm">
                                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        <div className="space-y-2">
                            {logs.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="flex items-center text-sm py-2 border-b border-border last:border-0">
                                        <span className="text-muted-foreground font-mono mr-4">[{formatTime(log.created_at)}]</span>
                                        <span className="text-foreground">{log.action}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
};