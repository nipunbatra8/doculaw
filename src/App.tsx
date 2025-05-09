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
import CasePage from "./pages/CasePage";
import NotFound from "./pages/NotFound";
import PaymentPage from "./pages/PaymentPage";
import ClientSignupPage from "./pages/ClientSignupPage";
import OnboardingPage from "./pages/OnboardingPage";
import ClientLoginPage from "./pages/ClientLoginPage";
import ExpiredLinkPage from "./pages/ExpiredLinkPage";

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
                <Route path="/archive" element={
                  <ProtectedRoute>
                    <RouteGuard allowedUserTypes={['lawyer']}>
                      <ArchivePage />
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