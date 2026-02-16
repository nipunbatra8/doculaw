import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Define a type for the debug information
interface DebugInfo {
  urlInfo?: {
    fullURL: string;
    search: string;
    hash: string;
    params: Record<string, string>;
  };
  initialSession?: {
    exists: boolean;
    error?: string;
    userId?: string;
  };
  tokenParams?: {
    hasToken: boolean;
    type?: string;
  };
  verification?: {
    success: boolean;
    error?: string;
  };
  postVerificationSession?: {
    exists: boolean;
    error?: string;
    userId?: string;
  };
  authenticatedUser?: {
    id?: string;
    email?: string;
    userType: string;
  };
  verificationError?: string;
  error?: string;
  finalError?: string;
}

const HandleMagicLink = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const processAuthRedirect = async () => {
      try {
        console.log("Processing auth redirect");

        // Get the URL parameters from both query string and hash
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const hashParams = hash ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
        
        // Debug info
        const urlInfo = {
          fullURL: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          params: Object.fromEntries(params.entries()),
          hashParams: Object.fromEntries(hashParams.entries())
        };
        
        console.log("URL info:", urlInfo);
        setDebugInfo(prev => ({ ...prev, urlInfo }));

        // Check for errors in hash fragment
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        
        if (error || errorCode) {
          console.error("Hash error params:", { error, errorCode });
          navigate('/expired-link', { replace: true });
          return;
        }
        
        // Check for access tokens in hash (implicit flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken || refreshToken) {
          console.log("Found auth tokens in hash");
          // With detectSessionInUrl enabled, Supabase should automatically process these
          // But let's also explicitly set the session to be sure
          try {
            console.log("Explicitly setting session from URL tokens");
            const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken as string,
              refresh_token: refreshToken as string
            });
            
            if (setSessionError) {
              console.error("Error setting session:", setSessionError);
            } else {
              console.log("Session set successfully:", !!setSessionData.session);
            }
            
            // Wait a moment for the session to be established
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error("Exception setting session:", err);
          }
        }

        // Check the session - Supabase should have processed the tokens by now
        console.log("Checking for session...");
        let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        let session = sessionData?.session;
        
        console.log("Initial session check result:", {
          hasSession: !!session,
          sessionError: sessionError?.message,
          userId: session?.user?.id
        });
        
        // If no session but we have tokens, try one more time after another delay
        if (!session && (accessToken || refreshToken)) {
          console.log("No session yet, waiting a bit more...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          const result = await supabase.auth.getSession();
          sessionData = result.data;
          sessionError = result.error;
          session = sessionData?.session;
          console.log("Second session check result:", {
            hasSession: !!session,
            sessionError: sessionError?.message,
            userId: session?.user?.id
          });
        }
        
        setDebugInfo(prev => ({ 
          ...prev, 
          initialSession: {
            exists: !!session,
            error: sessionError?.message,
            userId: session?.user?.id
          }
        }));
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }
        
        if (!session) {
          // If no session, try one more direct approach using the token from URL
          const token = params.get('token');
          const type = params.get('type');
          
          console.log("No session found, checking for token params:", { token: !!token, type });
          setDebugInfo(prev => ({ ...prev, tokenParams: { hasToken: !!token, type } }));
          
          if (token && type === 'magiclink') {
            console.log("Attempting to verify token directly");
            
            try {
              // Try direct verification
              const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink',
              });
              
              console.log("Verification result:", {
                success: !!verifyData,
                error: verifyError?.message
              });
              
              setDebugInfo(prev => ({ 
                ...prev, 
                verification: {
                  success: !!verifyData,
                  error: verifyError?.message
                }
              }));
              
              if (verifyError) {
                console.error("Token verification error:", verifyError);
                throw verifyError;
              }
              
              // Check session again after verification
              console.log("Checking for session after verification...");
              const { data: newSessionData, error: newSessionError } = await supabase.auth.getSession();
              const newSession = newSessionData?.session;
              
              console.log("New session check result:", {
                hasSession: !!newSession,
                sessionError: newSessionError?.message
              });
              
              setDebugInfo(prev => ({ 
                ...prev, 
                postVerificationSession: {
                  exists: !!newSession,
                  error: newSessionError?.message,
                  userId: newSession?.user?.id
                }
              }));
              
              if (newSessionError) {
                console.error("Failed to get session after verification:", newSessionError);
                throw newSessionError;
              }
              
              if (!newSession) {
                console.error("Verification succeeded but no session was created");
                throw new Error("Authentication succeeded but failed to establish a session");
              }
              
              console.log("Magic link login successful via direct verification");
              
              // Get user details
              const { data: userData, error: userError } = await supabase.auth.getUser();
              
              if (userError) {
                console.error("Error getting user after verification:", userError);
                throw userError;
              }
              
              const user = userData?.user;
              console.log("User details:", { 
                id: user?.id, 
                email: user?.email, 
                user_metadata: user?.user_metadata,
                app_metadata: user?.app_metadata
              });
              
              const userType = user?.user_metadata?.user_type || 
                               user?.app_metadata?.role || 
                               'client';
              
              console.log("Determined user type:", userType);
              
              // Redirect based on user type
              const redirectUrl = userType === 'client' ? '/client-dashboard' : '/dashboard';
              console.log("Redirecting to:", redirectUrl);
              
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 100);
              return;
            } catch (verificationError) {
              console.error("Error during verification process:", verificationError);
              setDebugInfo(prev => ({ 
                ...prev, 
                verificationError: verificationError instanceof Error ? verificationError.message : 'Unknown error' 
              }));
              throw verificationError;
            }
          } else {
            console.error("No session found and no token in URL");
            setDebugInfo(prev => ({ ...prev, error: "No session and no valid token params" }));
            throw new Error("Invalid or expired authentication link");
          }
        }
        
        // Session exists, user is authenticated
        console.log("User authenticated:", {
          id: session.user?.id,
          email: session.user?.email,
          user_metadata: session.user?.user_metadata,
          app_metadata: session.user?.app_metadata
        });
        
        // Determine user type from session
        const userType = session.user?.user_metadata?.user_type || 
                        session.user?.app_metadata?.role || 
                        'client'; // Default to client for magic links
        
        console.log("User type determined:", userType);
        setDebugInfo(prev => ({ 
          ...prev, 
          authenticatedUser: {
            id: session.user?.id,
            email: session.user?.email,
            userType
          }
        }));
        
        // Redirect based on user type
        const redirectUrl = userType === 'client' ? '/client-dashboard' : '/dashboard';
        console.log("Redirecting to:", redirectUrl);
        
        // Use window.location.href for a full page reload to ensure auth context is fresh
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 100);
      } catch (error) {
        console.error("Error processing auth redirect:", error);
        if (error instanceof Error) {
          setErrorMessage(error.message);
          setDebugInfo(prev => ({ ...prev, finalError: error.message }));
          
          // If expired token, navigate to expired link page
          if (error.message.toLowerCase().includes('expired') || 
              error.message.toLowerCase().includes('invalid')) {
            navigate('/expired-link', { replace: true });
            return;
          }
        }
        setIsProcessing(false);
      }
    };

    processAuthRedirect();
  }, [navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
          <Loader2 className="h-12 w-12 text-doculaw-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Authenticating...</h1>
          <p className="text-gray-600">
            Please wait while we verify your credentials.
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => navigate('/client-login')}
            className="bg-doculaw-500 hover:bg-doculaw-600 text-white px-4 py-2 rounded mb-4"
          >
            Back to Login
          </button>
          
          {debugInfo && (
            <div className="mt-8 border-t pt-4 text-left">
              <details>
                <summary className="cursor-pointer text-xs text-gray-500 mb-2">Debug information (for developers)</summary>
                <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-60 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default HandleMagicLink; 