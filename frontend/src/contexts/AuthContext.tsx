// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useSessionStorage } from "react-use";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { User } from "@/types/app";

// Global flags to prevent multiple instances
let AUTH_INITIALIZED = false;
let SESSION_LISTENER_ACTIVE = false;
let SUPABASE_REFRESH_INSTALLED = false;

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
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  isDataLoading: boolean;
  isDataStale: boolean;
  isSetupComplete: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

const SESSION_VERSION = '2.0.0';
const SESSION_KEY = 'pumpguard-session-v2';

// Admin email patterns that cannot reset password via public form
const ADMIN_EMAIL_PATTERNS = [
  /^admin@/i,
  /@pumpguard\.com$/i,
  /administrator@/i,
  /superadmin@/i,
  /root@/i,
  /sysadmin@/i
];

// Common passwords to reject
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', '123456789', 'password123',
  'admin', 'admin123', 'qwerty', 'letmein', 'welcome',
  'monkey', 'dragon', 'baseball', 'football', 'jesus',
  'master', 'hello', 'freedom', 'whatever', 'qazwsx'
];

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions
const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAIL_PATTERNS.some(pattern => pattern.test(email.toLowerCase()));
};

const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
  }

  return { valid: true };
};

const rateLimitCheck = (key: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  const attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Remove attempts older than window
  const recentAttempts = attempts.filter((timestamp: number) => 
    now - timestamp < windowMinutes * 60 * 1000
  );
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  recentAttempts.push(now);
  localStorage.setItem(storageKey, JSON.stringify(recentAttempts));
  return true;
};

const clearRateLimit = (key: string): void => {
  localStorage.removeItem(`rate_limit_${key}`);
};

// 🚀 Safe Supabase query wrapper to handle PKCE 404 errors
const safeQuery = async <T,>(fn: () => Promise<T>, retryCount = 1): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const errorMessage = String(err.message || '');
    const isPkce404 = errorMessage.includes('404') || 
                      errorMessage.includes('NOT_FOUND') || 
                      errorMessage.includes('cpt1::');
    
    if (isPkce404 && retryCount > 0) {
      console.log('🔄 PKCE 404 detected, refreshing session and retrying...');
      
      try {
        // Refresh the session
        await supabase.auth.refreshSession();
        
        // Wait a moment for session to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retry the query
        return await safeQuery(fn, retryCount - 1);
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        throw err; // Throw original error
      }
    }
    
    throw err;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useSessionStorage<SessionData | null>(SESSION_KEY, null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDataStale, setIsDataStale] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // 🚀 NEW: Track logout state
  
  const { toast } = useToast();
  
  // 🚀 SINGLE SOURCE OF TRUTH - use session.user directly
  const user = session?.user || null;
  const isAuthenticated = !!user && !isLoggingOut; // 🚀 Hide user during logout

  // Refs to prevent dependency issues
  const sessionRef = useRef(session);
  const isLoadingRef = useRef(isLoading);
  const refreshInProgressRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    const { data: profile, error: profileError } = await safeQuery(() =>
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
    );

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

  // ==================== SUPABASE PKCE SESSION REFRESH FIX ====================
  // 🚀 CRITICAL: This fixes the PKCE 404 NOT_FOUND error issue
  useEffect(() => {
    if (SUPABASE_REFRESH_INSTALLED) {
      console.log("🚫 Supabase refresh handlers already installed");
      return;
    }

    SUPABASE_REFRESH_INSTALLED = true;
    console.log("🛠️ Installing Supabase PKCE session refresh handlers");

    const refreshSession = async () => {
      try {
        const now = Date.now();
        // Don't refresh more than once per minute
        if (now - lastRefreshTimeRef.current < 60000) {
          return;
        }

        console.log("🔄 Refreshing Supabase session...");
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.warn("Supabase session refresh failed:", error.message);
        } else {
          console.log("✅ Session refreshed successfully");
          lastRefreshTimeRef.current = now;
          
          // Update last refresh in localStorage for debugging
          localStorage.setItem('supabase_last_refresh', now.toString());
        }
      } catch (err) {
        console.warn("Supabase refresh error:", err);
      }
    };

    // 1️⃣ When tab becomes visible again (user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible - refreshing session");
        refreshSession();
      }
    };

    // 2️⃣ When browser reconnects after offline
    const handleOnline = () => {
      console.log("🌐 Network reconnected - refreshing session");
      refreshSession();
    };

    // 3️⃣ Periodic refresh every 25 minutes (tokens expire in 1 hour)
    const periodicRefresh = setInterval(() => {
      console.log("⏰ Periodic session refresh");
      refreshSession();
    }, 25 * 60 * 1000); // 25 minutes

    // 4️⃣ Initial refresh on mount
    refreshSession();

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Cleanup function
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearInterval(periodicRefresh);
      SUPABASE_REFRESH_INSTALLED = false;
    };
  }, []); // 🚀 Empty dependency array - runs once

  // ==================== PASSWORD RESET FUNCTIONALITY ====================

  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const sanitizedEmail = sanitizeEmail(email);
      
      // Rate limiting check
      const canProceed = rateLimitCheck(`forgot_password_${sanitizedEmail}`);
      if (!canProceed) {
        return {
          success: false,
          message: 'Too many password reset attempts. Please try again in 15 minutes.'
        };
      }

      // Check if it's an admin account
      if (isAdminEmail(sanitizedEmail)) {
        // Log security event but don't reveal it's an admin account
        console.warn(`Admin password reset attempt blocked: ${sanitizedEmail}`);
        
        // Return generic success message (security through obscurity)
        return {
          success: true,
          message: 'If an account exists with this email, you will receive reset instructions shortly.'
        };
      }

      // Use Supabase's built-in password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        sanitizedEmail,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        console.error('Password reset request error:', resetError);
        return {
          success: false,
          message: 'Failed to send reset instructions. Please try again later.'
        };
      }

      // Clear rate limit on success
      clearRateLimit(`forgot_password_${sanitizedEmail}`);

      return {
        success: true,
        message: 'Password reset instructions have been sent to your email.'
      };

    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.error!
        };
      }

      // First, verify the token and get the user
      const { data: { user }, error: tokenError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (tokenError || !user) {
        return {
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset.'
        };
      }

      // Check if this is an admin account
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profile && isAdminEmail(profile.email)) {
        // Admin password reset must be done through admin panel
        return {
          success: false,
          message: 'Admin password cannot be reset through this form. Please contact system administrator.'
        };
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        return {
          success: false,
          message: 'Failed to update password. Please try again.'
        };
      }

      // Update password change time in profile
      await supabase
        .from('profiles')
        .update({ 
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return {
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.'
      };

    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.error!
        };
      }

      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Re-authenticate with current password
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });

      if (reauthError) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Change password error:', updateError);
        return {
          success: false,
          message: 'Failed to change password. Please try again.'
        };
      }

      // Update password change time in profile
      await supabase
        .from('profiles')
        .update({ 
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });

      return {
        success: true,
        message: 'Password changed successfully!'
      };

    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }, [user, toast]);

  const updateUserProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
    try {
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          phone: data.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Refresh user data
      await refreshData();

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      return {
        success: true,
        message: 'Profile updated successfully!'
      };

    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile'
      };
    }
  }, [user, refreshData, toast]);

  // ==================== FIXED LOGOUT FUNCTION - NO FLASH ====================
const logout = useCallback(async () => {
  try {
    console.log("🚪 Starting instant logout...");
    
    // 🚀 CRITICAL: Set flag for AppContent to handle redirect
    sessionStorage.setItem('logout_redirect', 'true');
    
    // 🚀 IMMEDIATE redirect to prevent React render
    window.location.href = "/login";
    
    // 🚀 Clean up in background (fire and forget)
    setTimeout(() => {
      // Clear all storage
      removeSession();
      localStorage.removeItem("pumpguard_offline_user");
      localStorage.removeItem("pumpguard_offline_email");
      localStorage.removeItem('supabase_last_refresh');
      sessionStorage.removeItem('logout_redirect');
      
      // Clear rate limits
      if (user?.email) {
        const emailKey = sanitizeEmail(user.email);
        ['login', 'forgot_password', 'password_reset'].forEach(type => {
          localStorage.removeItem(`rate_limit_${type}_${emailKey}`);
        });
      }
      
      // Sign out from Supabase
      supabase.auth.signOut().catch(() => {});
      
      console.log("✅ Logout cleanup complete");
    }, 100);
    
  } catch (err) {
    console.error("Logout error:", err);
    // Still redirect even if there's an error
    window.location.href = "/login";
  }
}, [removeSession, user]);

  // ==================== ORIGINAL AUTH LOGIC ====================

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

  // 🚀 NUCLEAR: Auth state listener - SINGLE INSTANCE WITH LOGOUT FIX
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
      
      // 🚀 CRITICAL: Skip if this is a manual logout
      if (sessionStorage.getItem('manual_logout') === 'true') {
        console.log("🚫 Skipping auth listener during manual logout");
        // Clear the flag after processing
        setTimeout(() => {
          sessionStorage.removeItem('manual_logout');
        }, 1000);
        return;
      }
      
      console.log("🔄 Auth state change:", event);
      
      switch (event) {
        case "SIGNED_OUT":
          console.log("🔒 User signed out (automatic, not manual)");
          
          // Only handle automatic signouts (session expired, etc.)
          if (window.location.pathname !== '/login' && !isLoggingOut) {
            removeSession();
            localStorage.removeItem("pumpguard_offline_user");
            localStorage.removeItem("pumpguard_offline_email");
            localStorage.removeItem('supabase_last_refresh');
            
            toast({
              title: "Session Expired",
              description: "You have been automatically logged out.",
              duration: 3000,
            });
            
            // Redirect after a brief delay
            setTimeout(() => {
              if (mounted) {
                window.location.replace("/login");
              }
            }, 1500);
          }
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
          console.log("♻️ Token refreshed - updating last refresh time");
          lastRefreshTimeRef.current = Date.now();
          localStorage.setItem('supabase_last_refresh', lastRefreshTimeRef.current.toString());
          break;

        case "USER_UPDATED":
          console.log("👤 User updated");
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
  }, [isLoggingOut, removeSession, toast, fetchUserData, setSession]);

  // ==================== CLEANUP ON UNMOUNT ====================
  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, []);

  // ✅ Login method
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();

      const sanitizedEmail = sanitizeEmail(email);
      
      // Rate limiting check
      if (!rateLimitCheck(`login_${sanitizedEmail}`)) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.');
      }

      console.log("🔄 Attempting login...");

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: sanitizedEmail, 
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
        setIsLoggingOut(false); // 🚀 Reset logout state
        
        // Cache for offline mode
        localStorage.setItem("pumpguard_offline_user", JSON.stringify(userData));
        localStorage.setItem("pumpguard_offline_email", email);
        
        console.log("✅ Session created and user logged in");
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.name || userData.email}!`,
        });
        
        // Clear rate limit on successful login
        clearRateLimit(`login_${sanitizedEmail}`);
      }
    } catch (err: any) {
      console.error("❌ Login error:", err.message);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, fetchUserData, setSession, toast]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout, // 🚀 Now fixed - no more flash!
    forgotPassword,
    resetPassword,
    changePassword,
    updateUserProfile,
    isLoading,
    isDataLoading,
    isDataStale,
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

// 🚀 Export safeQuery wrapper for use throughout the app
export { safeQuery };

export default AuthProvider;
