
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/Clients";
import SettingsPage from "./pages/SettingsPage";
import ArchivePage from "./pages/ArchivePage";
import DiscoveryRequestPage from "./pages/DiscoveryRequestPage";
import DiscoveryResponsePage from "./pages/DiscoveryResponsePage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import NotFound from "./pages/NotFound";
import PaymentPage from "./pages/PaymentPage";

// Auth provider
import { AuthProvider } from "./context/AuthContext";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                
                {/* Protected routes for lawyers */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/discovery-request/:caseId" element={<DiscoveryRequestPage />} />
                <Route path="/discovery-response/:caseId" element={<DiscoveryResponsePage />} />
                
                {/* Client routes */}
                <Route path="/client-dashboard" element={<ClientDashboardPage />} />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
