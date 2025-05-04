
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  needsOnboarding: boolean;
  setNeedsOnboarding: (value: boolean) => void;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut for compatibility
  updateUserMetadata: (metadata: { [key: string]: any }) => Promise<void>;
  updateProfile: (data: { [key: string]: any }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  needsOnboarding: true,
  setNeedsOnboarding: () => {},
  signOut: async () => {},
  login: async () => {},
  logout: async () => {},
  updateUserMetadata: async () => {},
  updateProfile: async () => {},
  deleteAccount: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  
  // Wrap the setNeedsOnboarding function to avoid re-renders
  const updateNeedsOnboarding = (value: boolean) => {
    setNeedsOnboarding(value);
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        // Set session and authentication status
        setSession(data.session);
        setIsAuthenticated(!!data.session);
        setUser(data.session?.user || null);
        
        // Check if user has completed onboarding
        if (data.session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", data.session.user.id)
            .single();
            
          if (!profileError && profile) {
            setNeedsOnboarding(!profile.onboarding_completed);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
      setSession(session);
      
      // Check onboarding status when auth state changes
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();
            
          if (!profileError && profile) {
            setNeedsOnboarding(!profile.onboarding_completed);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
      
      if (event === "SIGNED_OUT") {
        setNeedsOnboarding(true);
      }
      
      setIsLoading(false);
    });

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      setNeedsOnboarding(true);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  // Alias for signOut for compatibility
  const logout = signOut;

  const updateUserMetadata = async (metadata: { [key: string]: any }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata
      });
      
      if (error) throw error;
      
      // Update local user state with new metadata
      if (user) {
        setUser({
          ...user,
          user_metadata: { ...user.user_metadata, ...metadata }
        });
      }
    } catch (error) {
      console.error("Error updating user metadata:", error);
      throw error;
    }
  };

  const updateProfile = async (data: { [key: string]: any }) => {
    try {
      if (!user) throw new Error("No user logged in");
      
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);
      
      if (error) throw error;
      
      // If updating onboarding status, also update local state
      if (data.hasOwnProperty('onboarding_completed')) {
        setNeedsOnboarding(!data.onboarding_completed);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(
        user?.id as string
      );
      
      if (error) throw error;
      
      // Sign out after deletion
      await signOut();
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        session,
        needsOnboarding,
        setNeedsOnboarding: updateNeedsOnboarding,
        signOut,
        login,
        logout,
        updateUserMetadata,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
