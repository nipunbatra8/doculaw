import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  onboarding_completed: boolean | null;
  referral_source: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  updateUserMetadata: (metadata: { name?: string; phone?: string; title?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
        
        // Fetch user profile when auth state changes
        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setNeedsOnboarding(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if user needs to complete onboarding
  useEffect(() => {
    if (!user) return;
    
    // Check if this is a client user based on metadata
    const isClient = 
      (user.user_metadata && user.user_metadata.user_type === 'client') || 
      (user.app_metadata && user.app_metadata.role === 'client');
    
    // Clients don't need onboarding, so set needsOnboarding to false for them
    if (isClient) {
      console.log('User is a client, skipping onboarding check');
      setNeedsOnboarding(false);
      return;
    }
    
    // For non-client users (lawyers), check profile and onboarding status
    if (profile) {
      // If profile exists but onboarding is not completed, user needs to complete onboarding
      setNeedsOnboarding(!profile.onboarding_completed);
    } else {
      // If user exists but profile doesn't exist, user needs to complete onboarding
      setNeedsOnboarding(true);
    }
  }, [user, profile]);

  const fetchProfile = async (userId: string) => {
    try {
      // First check if this user is a client based on session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const isClient = 
          (user.user_metadata && user.user_metadata.user_type === 'client') || 
          (user.app_metadata && user.app_metadata.role === 'client');
        
        // If this is a client user, skip profile fetching
        if (isClient) {
          console.log('User is a client, skipping profile fetch');
          setNeedsOnboarding(false); // Clients don't need onboarding
          return;
        }
      }
      
      // For non-client users, fetch profile as usual
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Only set needsOnboarding to true if it's a "not found" error
        if (error.code === 'PGRST116') {
          setNeedsOnboarding(true);
        } else {
          // For other errors, don't change the onboarding state
          console.error('Database error when fetching profile:', error);
        }
        return;
      }

      setProfile(data as Profile);
      // Set onboarding flag based on profile status
      setNeedsOnboarding(data ? !data.onboarding_completed : true);

      // Store onboarding status in localStorage for persistence across refreshes
      if (data && data.onboarding_completed) {
        localStorage.setItem(`doculaw_onboarding_${userId}`, 'completed');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Don't automatically set needsOnboarding for unexpected errors
    }
  };

  // Use cached onboarding status while profile is being fetched
  useEffect(() => {
    if (user && isLoading) {
      const cachedOnboardingStatus = localStorage.getItem(`doculaw_onboarding_${user.id}`);
      if (cachedOnboardingStatus === 'completed') {
        setNeedsOnboarding(false);
      }
    }
  }, [user, isLoading]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // First, delete user data from profiles table if it exists
      // TODO
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
        
      if (profileError) {
        console.error('Error deleting profile:', profileError);
        // Continue with account deletion even if profile deletion fails
      }
      
      // In a production app, you would use a secure server-side endpoint or
      // Supabase Edge Function to delete the user account, as the client SDK
      // doesn't provide a direct method for users to delete their own accounts.
      
      // For this demo, we'll simulate account deletion by signing out
      // and showing a success message to the user
      await supabase.auth.signOut();
      
      // In a real implementation, you would make an API call to your backend:
      // await fetch('/api/delete-account', {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${session?.access_token}`
      //   }
      // });
    } catch (error) {
      console.error('Delete account failed:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      // If onboarding was just completed, update the flag and localStorage
      if (data.onboarding_completed) {
        setNeedsOnboarding(false);
        localStorage.setItem(`doculaw_onboarding_${user.id}`, 'completed');
      }
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  };

  const updateUserMetadata = async (metadata: { name?: string; phone?: string; title?: string }) => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata
      });

      if (error) throw error;
      
      // Refresh the user data to include the updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Update user metadata failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding,
        login,
        signup,
        logout,
        deleteAccount,
        updateProfile,
        updateUserMetadata,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
