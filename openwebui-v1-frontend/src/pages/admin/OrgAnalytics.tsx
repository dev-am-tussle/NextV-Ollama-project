import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, CreditCard, TrendingUp } from "lucide-react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const mockStats = {
    totalUsers: 248,
    activeUsers: 189,
    planType: "Enterprise",
    monthlyUsage: "3,542 messages",
};

const mockUserGrowth = [
    { month: "Jan", users: 120 },
    { month: "Feb", users: 145 },
    { month: "Mar", users: 178 },
    { month: "Apr", users: 210 },
    { month: "May", users: 248 },
];

const mockUsageData = [
    { day: "Mon", messages: 420 },
    { day: "Tue", messages: 580 },
    { day: "Wed", messages: 490 },
    { day: "Thu", messages: 720 },
    { day: "Fri", messages: 650 },
    { day: "Sat", messages: 380 },
    { day: "Sun", messages: 302 },
];

export const OrgAnalytics = () => {
    const statCards = [
        {
            title: "Total Users",
            value: mockStats.totalUsers,
            icon: Users,
            trend: "+12% from last month",
        },
        {
            title: "Active Users",
            value: mockStats.activeUsers,
            icon: Activity,
            trend: "76% active rate",
        },
        {
            title: "Plan Type",
            value: mockStats.planType,
            icon: CreditCard,
            trend: "Valid until Dec 2025",
        },
        {
            title: "Monthly Usage",
            value: mockStats.monthlyUsage,
            icon: TrendingUp,
            trend: "+8% from last month",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={mockUserGrowth}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="month" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(var(--primary))' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={mockUsageData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="day" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
