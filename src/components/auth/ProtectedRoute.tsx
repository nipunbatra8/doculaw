import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, isLoading, needsOnboarding, user } = useAuth();
  const location = useLocation();
  const [hasExpiredToken, setHasExpiredToken] = useState(false);

  // Check for token validity
  useEffect(() => {
    const checkTokenValidity = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error && error.message.toLowerCase().includes('expired')) {
          setHasExpiredToken(true);
        }
      } catch (error) {
        console.error("Error checking token validity", error);
      }
    };
    
    checkTokenValidity();
  }, []);

  // Check for cached onboarding status to prevent unwanted redirects during loading
  const hasCompletedOnboarding = user && localStorage.getItem(`doculaw_onboarding_${user.id}`) === 'completed';

  // If token is expired, redirect to expired link page
  if (hasExpiredToken) {
    return <Navigate to="/expired-link" replace />;
  }

  // Allow access to reset-password page without authentication
  if (location.pathname === "/reset-password") {
    return <>{children}</>;
  }
  
  // Only redirect if not loading
  if (!isLoading) {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user needs onboarding and is not already on the onboarding page
    if (isAuthenticated && needsOnboarding && location.pathname !== "/onboarding" && !hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Either loading or authenticated and doesn't need onboarding
  return <>{children}</>;
};

export default ProtectedRoute;
