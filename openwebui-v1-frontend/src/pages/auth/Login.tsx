import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, User, Shield } from "lucide-react";
import { adminLogin } from "@/services/adminAuth";

const MicrosoftLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="3" width="8" height="8" fill="#F35325" />
    <rect x="13" y="3" width="8" height="8" fill="#81BC06" />
    <rect x="3" y="13" width="8" height="8" fill="#05A6F0" />
    <rect x="13" y="13" width="8" height="8" fill="#FFBA08" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'user' | 'admin'>('user');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (userType === 'admin') {
        // Use separate admin login system
        const response = await adminLogin(email, password);
        
        toast({
          title: "Welcome back, Admin!",
          description: "You have been successfully logged in.",
        });
        
        // Get organization slug for redirect
        const orgSlug = response.organization?.slug;
        const redirectPath = orgSlug ? `/${orgSlug}/org-admin` : '/';
        
        // Small delay to ensure localStorage is set, then navigate
        setTimeout(() => {
          navigate(redirectPath);
        }, 100);
      } else {
        // Use existing user login
        await login({ email, password });
        
        // Wait for profile to be persisted
        const waitForProfile = async (timeoutMs = 2000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const raw = localStorage.getItem("authProfile");
            const token =
              localStorage.getItem("authToken") || localStorage.getItem("token");
            if (raw && token) return true;
            await new Promise((r) => setTimeout(r, 100));
          }
          return false;
        };
        await waitForProfile(2000);
        
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
        
        // Get organization slug from profile for redirect
        const profile = JSON.parse(localStorage.getItem("authProfile") || "{}");
        const orgSlug = profile?.organization?.slug;
        
        // Small delay to ensure everything is set, then navigate to org-based route
        setTimeout(() => {
          const redirectPath = orgSlug ? `/${orgSlug}/org-user` : '/';
          navigate(redirectPath);
        }, 100);
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Choose your account type and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={userType} onValueChange={(value) => setUserType(value as 'user' | 'admin')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="user" className="space-y-4 mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link to="#" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-hover"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in as User"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4 mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="Enter your admin email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Admin access for organization management
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-hover"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Microsoft OAuth button - only show for user login */}
        {userType === 'user' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
                const redirect = import.meta.env.VITE_MICROSOFT_REDIRECT_URI;
                const tenant =
                  import.meta.env.VITE_MICROSOFT_TENANT_ID || "common";
                const params = new URLSearchParams({
                  client_id: clientId,
                  response_type: "code",
                  redirect_uri: redirect,
                  response_mode: "query",
                  scope: "openid profile email",
                  prompt: "select_account",
                });
                window.location.href = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-md mt-3 hover:bg-muted"
            >
              <MicrosoftLogo />
              <span>Continue with Microsoft</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
