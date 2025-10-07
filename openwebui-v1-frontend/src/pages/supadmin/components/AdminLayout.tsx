import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, MessageSquare, Package, Settings, FileText, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/superadmin", icon: LayoutDashboard },
  { name: "Models", href: "/superadmin", icon: Package },
  { name: "Organizations", href: "/superadmin/organizations", icon: Building2 },
  { name: "Conversations", href: "/superadmin/conversations", icon: MessageSquare },
  { name: "Settings", href: "/superadmin/settings", icon: Settings },
  { name: "Logs", href: "/superadmin/logs", icon: FileText },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("superAdminToken");
    localStorage.removeItem("isSuperAdmin");
    navigate("/superadmin/auth/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && <span className="text-lg font-semibold text-foreground">Admin Panel</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.name}</span>}
            </NavLink>
            ))}
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
        </aside>      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">TussleDigital - AI</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              DEV
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Last sync: Just now</span>
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};