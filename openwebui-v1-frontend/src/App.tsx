import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Chat from "./pages/Chat";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  // hide footer on auth pages (login, signup and any /auth/* routes)
  const hideFooter = location.pathname.startsWith("/auth");

  return (
    <AppProvider>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col w-full">
            {!hideFooter && <Header />}
            <main className="flex-1">
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            {!hideFooter && <Footer />}
          </div>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </AppProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
