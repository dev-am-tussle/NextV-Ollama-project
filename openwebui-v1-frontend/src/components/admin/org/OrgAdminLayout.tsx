import { Building2, Users, Palette, BarChart3, X, Layers, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminProfile, unifiedLogout } from '@/services/unifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';

export interface OrgAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'users' | 'branding') => void;
  orgSlug?: string;
}

export const OrgAdminLayout = ({ children, activeTab, setActiveTab, orgSlug }: OrgAdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'models', label: 'Models', icon: Layers },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'setting', label: 'Settings', icon: Building2 },
  ];

  const handleLogout = async () => {
    try {
      await unifiedLogout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logged out",
        description: "You have been logged out.",
      });
      navigate("/auth/login");
    }
  };

  const handleBusinessIconClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Building2
              className="h-6 w-6 text-primary cursor-pointer"
              onClick={handleBusinessIconClick}
            />
            {sidebarOpen && <h1 className="text-lg font-semibold">Org Admin</h1>}
          </div>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-2 right-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      <div className={cn("flex flex-1 flex-col transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div>
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            <p className="text-sm text-muted-foreground">Manage your organization</p>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default OrgAdminLayout;
