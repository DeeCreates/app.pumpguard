// contexts/AuthContext.tsx - NUCLEAR OPTION
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSessionStorage } from "react-use";
import { supabase } from "../utils/supabase-client";
import { User } from "../types/app";

// Global flags to prevent multiple instances
let AUTH_INITIALIZED = false;
let SESSION_LISTENER_ACTIVE = false;

export interface SessionData {
  user: User;
  loggedInAt: string;
  lastActiveAt: string;
  isAuthenticated: boolean;
  version: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isDataLoading: boolean;
  isSetupComplete: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

const SESSION_VERSION = '2.0.0';
const SESSION_KEY = 'pumpguard-session-v2';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useSessionStorage<SessionData | null>(SESSION_KEY, null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🚀 SINGLE SOURCE OF TRUTH - use session.user directly
  const user = session?.user || null;
  const isAuthenticated = !!user;

  // Refs to prevent dependency issues
  const sessionRef = useRef(session);
  const isLoadingRef = useRef(isLoading);
  const refreshInProgressRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    sessionRef.current = session;
    isLoadingRef.current = isLoading;
  });

  const clearError = useCallback(() => setError(null), []);
  
  const removeSession = useCallback(() => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, [setSession]);

  // 🚀 OPTIMIZED: Fetch user data with caching
  const fetchUserData = useCallback(async (userId: string): Promise<User> => {
    console.time("UserDataFetch");
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData?.session?.user?.email || profile.email;

    console.timeEnd("UserDataFetch");
    return { ...profile, email } as User;
  }, []);

  // 🚀 SIMPLIFIED: Refresh data
  const refreshData = useCallback(async (): Promise<void> => {
    if (refreshInProgressRef.current || !user?.id) return;

    refreshInProgressRef.current = true;
    setIsDataLoading(true);
    
    try {
      const freshUserData = await fetchUserData(user.id);
      
      // Only update if data changed
      const hasUserChanged = JSON.stringify(user) !== JSON.stringify(freshUserData);
      
      if (hasUserChanged) {
        const updatedSession: SessionData = {
          user: freshUserData,
          loggedInAt: session?.loggedInAt || new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isAuthenticated: true,
          version: SESSION_VERSION
        };
        
        setSession(updatedSession);
      } else {
        // Just update last active time
        if (session) {
          const updatedSession: SessionData = {
            ...session,
            lastActiveAt: new Date().toISOString()
          };
          setSession(updatedSession);
        }
      }
    } catch (error) {
      console.warn("Background refresh failed:", error);
    } finally {
      refreshInProgressRef.current = false;
      setIsDataLoading(false);
    }
  }, [user, session, fetchUserData, setSession]);

  // 🚀 NUCLEAR: Initialize auth - RUNS ONCE PER APP LIFETIME
  useEffect(() => {
    if (AUTH_INITIALIZED) {
      console.log("🚫 Auth already initialized, skipping");
      setIsLoading(false);
      return;
    }

    AUTH_INITIALIZED = true;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🚀 NUCLEAR: Initializing auth system");

        // Check existing session first
        if (session?.user) {
          console.log("⚡ Using cached session");
          setIsSetupComplete(true);
          setIsLoading(false);
          return;
        }

        // Check Supabase session
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (authError) {
          console.error("Auth session error:", authError);
          removeSession();
          return;
        }

        if (authData.session?.user) {
          console.log("🔄 Creating session from Supabase");
          try {
            const userData = await fetchUserData(authData.session.user.id);
            
            const newSession: SessionData = {
              user: userData,
              loggedInAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              isAuthenticated: true,
              version: SESSION_VERSION
            };
            
            setSession(newSession);
            setIsSetupComplete(true);
          } catch (error) {
            console.error("Failed to create session:", error);
            removeSession();
          }
        } else {
          console.log("🔍 No active session found");
          removeSession();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        removeSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // 🚀 EMPTY - runs once

  // 🚀 NUCLEAR: Auth state listener - SINGLE INSTANCE
  useEffect(() => {
    if (SESSION_LISTENER_ACTIVE) {
      console.log("🚫 Session listener already active, skipping");
      return;
    }

    SESSION_LISTENER_ACTIVE = true;
    let mounted = true;

    console.log("🔧 Setting up auth state listener");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!mounted) return;
      
      console.log("🔄 Auth state change:", event);
      
      switch (event) {
        case "SIGNED_OUT":
          console.log("🔒 User signed out");
          removeSession();
          localStorage.removeItem("pumpguard_offline_user");
          localStorage.removeItem("pumpguard_offline_email");
          
          // Redirect to login
          setTimeout(() => {
            if (mounted) window.location.href = "/login";
          }, 100);
          break;

        case "SIGNED_IN":
          if (authSession?.user) {
            console.log("🔓 User signed in");
            try {
              const userData = await fetchUserData(authSession.user.id);
              const newSession: SessionData = {
                user: userData,
                loggedInAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                isAuthenticated: true,
                version: SESSION_VERSION
              };
              
              setSession(newSession);
              setIsSetupComplete(true);
              
              // Cache for offline
              localStorage.setItem("pumpguard_offline_user", JSON.stringify(userData));
              localStorage.setItem("pumpguard_offline_email", authSession.user.email!);
            } catch (error) {
              console.error("Error creating session:", error);
            }
          }
          break;

        case "TOKEN_REFRESHED":
          // 🚀 IGNORE - don't trigger any state changes
          console.log("♻️ Token refreshed (ignored)");
          break;

        case "USER_UPDATED":
          // 🚀 IGNORE - don't trigger any state changes  
          console.log("👤 User updated (ignored)");
          break;

        default:
          console.log("⚡ Auth event:", event);
      }
    });

    return () => {
      mounted = false;
      SESSION_LISTENER_ACTIVE = false;
      subscription?.unsubscribe();
    };
  }, []); // 🚀 EMPTY - runs once

  // ✅ Login method
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();

      console.log("🔄 Attempting login...");

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password.trim() 
      });
      
      if (error) {
        console.error("❌ Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials.");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email address before logging in.");
        } else {
          throw new Error(error.message || "Login failed. Please try again.");
        }
      }

      if (data.user) {
        console.log("✅ Login successful, fetching user data...");
        
        const userData = await fetchUserData(data.user.id);
        
        const newSession: SessionData = {
          user: userData,
          loggedInAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isAuthenticated: true,
          version: SESSION_VERSION
        };
        
        setSession(newSession);
        setIsSetupComplete(true);
        
        // Cache for offline mode
        localStorage.setItem("pumpguard_offline_user", JSON.stringify(userData));
        localStorage.setItem("pumpguard_offline_email", email);
        
        console.log("✅ Session created and user logged in");
      }
    } catch (err: any) {
      console.error("❌ Login error:", err.message);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Logout method
  const logout = async () => {
    try {
      console.log("🔄 Logging out...");
      setIsLoading(true);
      
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      removeSession();
      localStorage.removeItem("pumpguard_offline_user");
      localStorage.removeItem("pumpguard_offline_email");
      setIsLoading(false);
      setIsSetupComplete(false);
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    isLoading,
    isDataLoading,
    isSetupComplete,
    error,
    clearError,
    refreshData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Custom hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;