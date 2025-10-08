import { Building2, Users, Palette, MessageSquare, BarChart3 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import React from 'react';

export interface OrgAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'users' | 'branding' | 'chat') => void;
  orgSlug?: string;
}

export const OrgAdminLayout = ({ children, activeTab, setActiveTab, orgSlug }: OrgAdminLayoutProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'chat', label: 'Admin Chat', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Org Admin</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
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
