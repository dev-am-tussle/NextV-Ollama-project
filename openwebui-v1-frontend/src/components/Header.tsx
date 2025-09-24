import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();

  // Don't show header on main chat interface
  if (location.pathname === "/" && isAuthenticated) {
    return null;
  }

  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/home" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">Pointer</span>
          </Link>

          {!isAuthPage && (
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                to="/home#features"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Features
              </Link>
              <Link
                to="/home#pricing"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Pricing
              </Link>
              <Link
                to="/home#testimonials"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Testimonials
              </Link>
            </nav>
          )}
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center space-x-2">
            <ThemeToggle />

            {!isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button size="sm" className="btn-hover" asChild>
                  <Link to="/auth/signup">Try for free</Link>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await logout();
                    toast({
                      title: "Signed out",
                      description: "You have been signed out.",
                    });
                  } catch (err) {
                    toast({
                      title: "Sign out",
                      description: "There was a problem signing out.",
                    });
                  }
                }}
              >
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
