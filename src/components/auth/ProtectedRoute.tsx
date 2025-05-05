
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const location = useLocation();

  // Allow access to reset-password page without authentication
  if (location.pathname === "/reset-password") {
    return <>{children}</>;
  }
  
  // Check if user is authenticated, not loading, and determine if they need to be redirected to onboarding
  if (!isLoading && !isAuthenticated) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs onboarding and is not already on the onboarding page
  if (!isLoading && isAuthenticated && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
