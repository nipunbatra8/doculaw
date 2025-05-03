
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, isLoading, needsOnboarding, user, setNeedsOnboarding } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState<boolean>(true);

  // Check if user profile exists when the component mounts
  useEffect(() => {
    const checkUserProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (data && !error) {
            // If profile exists, update the needsOnboarding state in auth context
            setNeedsOnboarding(false);
          }
        } catch (error) {
          console.error("Error checking user profile:", error);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setCheckingProfile(false);
      }
    };

    if (isAuthenticated && needsOnboarding) {
      checkUserProfile();
    } else {
      setCheckingProfile(false);
    }
  }, [isAuthenticated, user, setNeedsOnboarding, needsOnboarding]);

  // Allow access to reset-password page without authentication
  if (location.pathname === "/reset-password") {
    return <>{children}</>;
  }
  
  // Show loading state when checking profile
  if (isLoading || (isAuthenticated && checkingProfile)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check if user is authenticated, not loading, and determine if they need to be redirected to onboarding
  if (!isAuthenticated) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs onboarding and is not already on the onboarding page
  if (isAuthenticated && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
