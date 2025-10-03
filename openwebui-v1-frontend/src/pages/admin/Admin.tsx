import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandingSettings } from "./BrandingSettings";
import { 
  Settings, 
  Palette, 
  Shield, 
  Users, 
  Database,
  ArrowLeft 
} from "lucide-react";
import { Link } from "react-router-dom";

const adminMenuItems = [
  {
    id: "branding",
    title: "Branding",
    description: "Customize logo, colors, and appearance",
    icon: Palette,
    path: "/admin/branding",
  },
  {
    id: "security",
    title: "Security",
    description: "Manage authentication and permissions",
    icon: Shield,
    path: "/admin/security",
    disabled: true,
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage users and roles",
    icon: Users,
    path: "/admin/users",
    disabled: true,
  },
  {
    id: "system",
    title: "System Settings",
    description: "Configure system-wide settings",
    icon: Database,
    path: "/admin/system",
    disabled: true,
  },
];

const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Manage and configure your application settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {item.disabled ? (
                  <Button variant="secondary" size="sm" disabled>
                    Coming Soon
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link to={item.path}>Configure</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const Admin: React.FC = () => {
  const location = useLocation();
  const isRootAdmin = location.pathname === "/admin";

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Back to Chat Button */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Link>
        </Button>
      </div>

      {/* Breadcrumb */}
      {!isRootAdmin && (
        <div className="mb-6">
          <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground">
              Admin Settings
            </Link>
            <span>/</span>
            <span className="text-foreground">
              {location.pathname.split("/").pop()}
            </span>
          </nav>
        </div>
      )}

      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/branding" element={<BrandingSettings />} />
        {/* Add more admin routes here */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};