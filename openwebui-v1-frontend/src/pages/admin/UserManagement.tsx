import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, UserPlus, MoreVertical, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

const mockUsers = [
    {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "Member",
        status: "active",
        joinedAt: "2024-01-15",
        lastActive: "2 hours ago",
    },
    {
        id: "2",
        name: "Sarah Smith",
        email: "sarah@example.com",
        role: "Admin",
        status: "active",
        joinedAt: "2024-01-10",
        lastActive: "5 minutes ago",
    },
    {
        id: "3",
        name: "Mike Johnson",
        email: "mike@example.com",
        role: "Member",
        status: "inactive",
        joinedAt: "2024-02-01",
        lastActive: "3 days ago",
    },
    {
        id: "4",
        name: "Emily Brown",
        email: "emily@example.com",
        role: "Member",
        status: "active",
        joinedAt: "2024-02-15",
        lastActive: "1 hour ago",
    },
];

export const UserManagement = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState(mockUsers);

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAction = (action: string, userId: string) => {
        toast.success(`${action} action triggered for user ${userId}`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Organization Users</CardTitle>
                        <Button className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite User
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                                    {user.name
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={user.status === "active" ? "default" : "secondary"}
                                                className={
                                                    user.status === "active"
                                                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                        : ""
                                                }
                                            >
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {user.joinedAt}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {user.lastActive}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleAction("Edit", user.id)}>
                                                        Edit User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction("Reset Password", user.id)}>
                                                        Reset Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction("View Activity", user.id)}>
                                                        View Activity
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleAction("Remove", user.id)}
                                                    >
                                                        Remove User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
