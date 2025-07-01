import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteGuard from "./components/layout/RouteGuard";
import HandleMagicLink from "./components/auth/HandleMagicLink";

// Pages
import LandingPage from "./pages/common/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/lawyer/DashboardPage";
import ClientsPage from "./pages/lawyer/Clients";
import SettingsPage from "./pages/lawyer/SettingsPage";
import DiscoveryRequestPage from "./pages/discovery/DiscoveryRequestPage";
import DiscoveryResponsePage from "./pages/discovery/DiscoveryResponsePage";
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientSettingsPage from "./pages/client/ClientSettingsPage";
import CasePage from "./pages/lawyer/CasePage";
import NotFound from "./pages/common/NotFound";
import PaymentPage from "./pages/common/PaymentPage";
import ClientSignupPage from "./pages/auth/ClientSignupPage";
import OnboardingPage from "./pages/common/OnboardingPage";
import ClientLoginPage from "./pages/auth/ClientLoginPage";
import ExpiredLinkPage from "./pages/auth/ExpiredLinkPage";
import AIChatPage from "./pages/lawyer/AIChatPage";

// Auth provider
import { AuthProvider } from "./context/AuthContext";

// Hash fragment error handler
const HashErrorHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check for error parameters in the URL hash
    if (location.hash) {
      // Convert hash to URLSearchParams for easier parsing
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      
      // If there's an error in the hash, redirect to expired link page
      if (error === 'access_denied' || errorCode === 'otp_expired') {
        console.log('Detected auth error in URL hash:', { error, errorCode });
        navigate('/expired-link', { replace: true });
      }
    }
  }, [location.hash, navigate]);
  
  return null;
};

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
              <HashErrorHandler />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/client-login" element={<ClientLoginPage />} />
                <Route path="/expired-link" element={<ExpiredLinkPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/client-signup" element={<ClientSignupPage />} />
                
                {/* Auth callback route */}
                <Route path="/auth/callback" element={<HandleMagicLink />} />
                
                {/* Onboarding route */}
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes for lawyers only */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <DashboardPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <ClientsPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <SettingsPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/case/:caseId" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <CasePage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/ai-chat/:caseId" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <AIChatPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/discovery-request/:caseId" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <DiscoveryRequestPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/discovery-request/:caseId/:type" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <DiscoveryRequestPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/discovery-response/:caseId" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <DiscoveryResponsePage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                
                {/* Client routes - only for clients */}
                <Route path="/client-dashboard" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['client']}>
                      <ClientDashboardPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/client-settings" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['client']}>
                      <ClientSettingsPage />
                    </RouteGuard>
                  </ProtectedRoute>
                } />
                
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
