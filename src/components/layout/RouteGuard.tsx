import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RouteGuardProps {
  children: ReactNode;
  allowedUserTypes: string[];
}

/**
 * RouteGuard component that restricts access based on user type
 * allowedUserTypes: Array of user types allowed to access the route ('lawyer', 'client')
 */
const RouteGuard = ({ children, allowedUserTypes }: RouteGuardProps) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasExpiredToken, setHasExpiredToken] = useState(false);

  useEffect(() => {
    // Check for token expiration
    const checkTokenValidity = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error && error.message.toLowerCase().includes('expired')) {
          setHasExpiredToken(true);
          return;
        }
      } catch (error) {
        console.error("Error checking token validity", error);
      }
    };
    
    checkTokenValidity();
  }, []);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // If token is expired, redirect to expired link page
        if (hasExpiredToken) {
          navigate('/expired-link');
          return;
        }
        
        if (isLoading) return;
        
        if (!user) {
          // Not logged in, redirect to login
          navigate('/login');
          return;
        }

        // First check if this is a lawyer (from the user metadata or check profiles table)
        let userType: string | null = null;
        
        // Check user metadata first
        if (user.user_metadata && 'user_type' in user.user_metadata) {
          userType = user.user_metadata.user_type as string;
        } else {
          // Try to get from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('*')  // Select all fields to be safe
            .eq('id', user.id)
            .single();

          if (!error && data) {
            // Default to lawyer for existing users
            userType = 'lawyer';
          }
        }

        // Instead of querying clients directly (which may be restricted),
        // we can check the app_metadata which is set during authentication
        if (!userType && user.app_metadata && 'role' in user.app_metadata) {
          userType = user.app_metadata.role as string;
        }
        
        // Check email domain as fallback - clients often have personal emails
        // while lawyers might use the company domain
        if (!userType && user.email) {
          const emailLower = user.email.toLowerCase();
          
          // Check if this is a company email (customize this based on your domain)
          if (emailLower.endsWith('@doculaw.com') || 
              emailLower.endsWith('@yourfirm.com')) {
            console.log("Setting user type to lawyer based on email domain");
            userType = 'lawyer';
          }
          
          // Log for debugging
          console.log("User email check:", emailLower);
        }

        // Default to lawyer if still no type (backward compatibility)
        if (!userType) {
          console.log("No user type detected, defaulting to lawyer");
          userType = 'lawyer';
        }
        
        console.log("Determined user type:", userType);

        // Check if current user type is allowed for this route
        if (allowedUserTypes.includes(userType)) {
          setIsAuthorized(true);
        } else {
          // Redirect based on user type
          if (userType === 'lawyer') {
            navigate('/dashboard');
          } else if (userType === 'client') {
            navigate('/client-dashboard');
          } else {
            // Fallback for unknown user types
            navigate('/');
          }
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        navigate('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthorization();
  }, [user, isLoading, navigate, allowedUserTypes, hasExpiredToken]);

  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-doculaw-500"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
};

export default RouteGuard; 