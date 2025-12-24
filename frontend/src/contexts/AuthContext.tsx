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

// Admin email patterns
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
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
  }
  return { valid: true };
};

const rateLimitCheck = (key: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  const attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
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

// 🚀 Safe Supabase query wrapper with PKCE 404 retry
const safeQuery = async <T,>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err.message || '');
    const isPkce404 = msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('cpt1::');

    if (isPkce404 && retries > 0) {
      console.warn('🔄 PKCE 404 detected, retrying after refresh...');
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          await new Promise(r => setTimeout(r, delayMs));
          return await safeQuery(fn, retries - 1, delayMs * 2); // exponential backoff
        }
      } catch (refreshErr) {
        console.error('Failed to refresh session during safeQuery retry', refreshErr);
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
  
  const { toast } = useToast();
  
  // 🚀 SINGLE SOURCE OF TRUTH
  const user = session?.user || null;
  const isAuthenticated = !!user;

  // Refs
  const sessionRef = useRef(session);
  const isLoadingRef = useRef(isLoading);
  const refreshInProgressRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  const manualLogoutRef = useRef(false);

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

  // 🚀 Fetch user data
  const fetchUserData = useCallback(async (userId: string): Promise<User> => {
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

    return { ...profile, email } as User;
  }, []);

  // 🚀 Refresh data
  const refreshData = useCallback(async (): Promise<void> => {
    if (refreshInProgressRef.current || !user?.id) return;

    refreshInProgressRef.current = true;
    setIsDataLoading(true);
    
    try {
      const freshUserData = await fetchUserData(user.id);
      
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
      } else if (session) {
        const updatedSession: SessionData = {
          ...session,
          lastActiveAt: new Date().toISOString()
        };
        setSession(updatedSession);
      }
    } catch (error) {
      console.warn("Background refresh failed:", error);
      setIsDataStale(true);
    } finally {
      refreshInProgressRef.current = false;
      setIsDataLoading(false);
    }
  }, [user, session, fetchUserData, setSession]);

  // ==================== SUPABASE PKCE SESSION REFRESH FIX ====================
  useEffect(() => {
    if (SUPABASE_REFRESH_INSTALLED) return;

    SUPABASE_REFRESH_INSTALLED = true;
    console.log("🛠️ Installing Supabase PKCE session refresh handlers");

    const refreshSession = async () => {
      try {
        const now = Date.now();
        // Don't refresh more than once per minute
        if (now - lastRefreshTimeRef.current < 60000) return;

        console.log("🔄 Refreshing Supabase session...");
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.warn("Supabase session refresh failed:", error.message);
        } else {
          console.log("✅ Session refreshed successfully");
          lastRefreshTimeRef.current = now;
          localStorage.setItem('supabase_last_refresh', now.toString());
        }
      } catch (err) {
        console.warn("Supabase refresh error:", err);
      }
    };

    // 1️⃣ When tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible - refreshing session");
        refreshSession();
      }
    };

    // 2️⃣ When network reconnects
    const handleOnline = () => {
      console.log("🌐 Network reconnected - refreshing session");
      refreshSession();
    };

    // 3️⃣ Periodic refresh every 20 minutes
    const periodicRefresh = setInterval(() => {
      console.log("⏰ Periodic session refresh");
      refreshSession();
    }, 20 * 60 * 1000);

    // 4️⃣ Initial refresh
    refreshSession();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearInterval(periodicRefresh);
      SUPABASE_REFRESH_INSTALLED = false;
    };
  }, []);

// ==================== PASSWORD RESET ====================

const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const sanitizedEmail = email.trim().toLowerCase();
    
    // Basic email validation
    if (!sanitizedEmail || !/\S+@\S+\.\S+/.test(sanitizedEmail)) {
      return {
        success: false,
        message: 'Please enter a valid email address.'
      };
    }
    
    if (!rateLimitCheck(`forgot_password_${sanitizedEmail}`)) {
      return {
        success: false,
        message: 'Too many password reset attempts. Please try again in 15 minutes.'
      };
    }

    // Admin email handling - don't actually send reset for admin emails
    if (isAdminEmail(sanitizedEmail)) {
      console.log('Admin email detected - simulating success without Supabase call');
      // Simulate delay to match normal flow
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'If an account exists with this email, you will receive reset instructions shortly.'
      };
    }

    console.log('Sending password reset for:', sanitizedEmail, 'to domain: app.pumpguard.com');
    
    // IMPORTANT: Use your domain explicitly, not window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      sanitizedEmail,
      { 
        redirectTo: 'https://app.pumpguard.com/auth/reset-password',
        // Optional: Add captcha if configured
        // captchaToken: await getCaptchaToken(),
      }
    );

    if (resetError) {
      console.error('Password reset request error:', resetError);
      
      // Handle specific error cases
      if (resetError.message?.includes('Email not confirmed')) {
        return {
          success: false,
          message: 'Please confirm your email address before resetting password.'
        };
      }
      
      if (resetError.message?.includes('rate limit') || resetError.message?.includes('too many requests')) {
        return {
          success: false,
          message: 'Too many reset attempts. Please try again later.'
        };
      }
      
      if (resetError.status === 500) {
        console.error('Supabase 500 error - email service issue');
        return {
          success: false,
          message: 'Password reset service is temporarily unavailable. Please contact support@pumpguard.app'
        };
      }
      
      // Generic error
      return {
        success: false,
        message: resetError.message || 'Failed to send reset instructions. Please try again later.'
      };
    }

    // Success - update rate limit and log
    clearRateLimit(`forgot_password_${sanitizedEmail}`);
    console.log('Password reset email sent successfully to:', sanitizedEmail);

    return {
      success: true,
      message: 'Password reset instructions have been sent to your email. Please check your inbox and spam folder.'
    };

  } catch (error: any) {
    console.error('Forgot password unexpected error:', error);
    
    // Network errors or unexpected issues
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return {
        success: false,
        message: 'Network error. Please check your internet connection and try again.'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again or contact support@pumpguard.app'
    };
  }
}, []);

const resetPassword = useCallback(async (newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { 
        success: false, 
        message: passwordValidation.error! 
      };
    }

    // Get the current session (should be set from the reset email link)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return {
        success: false,
        message: 'Session error. Please try the reset link again.'
      };
    }

    if (!session?.user) {
      console.error('No user in session - invalid or expired reset link');
      return {
        success: false,
        message: 'Invalid or expired reset link. The link may have been used already or has expired. Please request a new password reset.'
      };
    }

    const userEmail = session.user.email;
    
    // Check if user is admin
    if (userEmail && isAdminEmail(userEmail)) {
      // Sign out admin users immediately
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Admin password cannot be reset through this form. Please contact system administrator.'
      };
    }

    console.log('Resetting password for user:', session.user.id, userEmail);

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      
      if (updateError.message?.includes('Password should be different')) {
        return {
          success: false,
          message: 'New password must be different from your current password.'
        };
      }
      
      if (updateError.message?.includes('weak_password')) {
        return {
          success: false,
          message: 'Password is too weak. Please choose a stronger password.'
        };
      }
      
      return {
        success: false,
        message: updateError.message || 'Failed to update password. Please try again.'
      };
    }

    // Update profile with password change timestamp
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (profileError) {
      console.error('Profile update error (non-critical):', profileError);
      // Don't fail the whole operation if profile update fails
    }

    // Clear session and sign out to force re-login with new password
    await supabase.auth.signOut();

    // Log successful reset
    console.log('Password reset successful for user:', session.user.id);

    return {
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    };

  } catch (error: any) {
    console.error('Reset password unexpected error:', error);
    
    // Handle specific error types
    if (error.message?.includes('JWT expired')) {
      return {
        success: false,
        message: 'Reset link has expired. Please request a new password reset.'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again or contact support@pumpguard.app'
    };
  }
}, []);

const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!user) {
      return { 
        success: false, 
        message: 'You must be logged in to change your password.' 
      };
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { 
        success: false, 
        message: passwordValidation.error! 
      };
    }

    // Don't allow same password
    if (currentPassword === newPassword) {
      return {
        success: false,
        message: 'New password must be different from your current password.'
      };
    }

    // Re-authenticate user first
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (reauthError) {
      if (reauthError.message?.includes('Invalid login credentials')) {
        return { 
          success: false, 
          message: 'Current password is incorrect.' 
        };
      }
      return { 
        success: false, 
        message: reauthError.message || 'Authentication failed. Please try again.' 
      };
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Change password error:', updateError);
      
      if (updateError.message?.includes('weak_password')) {
        return {
          success: false,
          message: 'Password is too weak. Please choose a stronger password.'
        };
      }
      
      return { 
        success: false, 
        message: updateError.message || 'Failed to change password. Please try again.' 
      };
    }

    // Update profile with password change timestamp
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error (non-critical):', profileError);
      // Don't fail the whole operation
    }

    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
      variant: "default"
    });

    // Refresh user data
    await refreshData();

    return { 
      success: true, 
      message: 'Password changed successfully!' 
    };

  } catch (error: any) {
    console.error('Change password error:', error);
    
    toast({
      title: "Error",
      description: "Failed to change password. Please try again.",
      variant: "destructive"
    });
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred. Please try again.'
    };
  }
}, [user, toast, refreshData]);

const updateUserProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
  try {
    if (!user) {
      return { 
        success: false, 
        message: 'You must be logged in to update your profile.' 
      };
    }

    // Validate input
    const updateData: any = {};
    
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName.length < 2) {
        return {
          success: false,
          message: 'Name must be at least 2 characters long.'
        };
      }
      updateData.full_name = trimmedName;
    }
    
    if (data.phone !== undefined) {
      const trimmedPhone = data.phone.trim();
      // Basic phone validation (adjust as needed)
      if (trimmedPhone && !/^[\d\s\-\+\(\)]{10,20}$/.test(trimmedPhone)) {
        return {
          success: false,
          message: 'Please enter a valid phone number.'
        };
      }
      updateData.phone = trimmedPhone || null;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: 'No changes to update.'
      };
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }

    // Refresh user data
    await refreshData();

    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
      variant: "default"
    });

    return { 
      success: true, 
      message: 'Profile updated successfully!' 
    };

  } catch (error: any) {
    console.error('Update profile error:', error);
    
    toast({
      title: "Error",
      description: "Failed to update profile.",
      variant: "destructive"
    });
    
    return {
      success: false,
      message: error.message || 'Failed to update profile. Please try again.'
    };
  }
}, [user, refreshData, toast]);

// Helper function to validate password strength (if not already defined elsewhere)
const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < 8) {
    return { 
      valid: false, 
      error: 'Password must be at least 8 characters long.' 
    };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one uppercase letter.' 
    };
  }
  
  if (!/[a-z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one lowercase letter.' 
    };
  }
  
  if (!/\d/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one number.' 
    };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one special character.' 
    };
  }
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', '12345678', 'qwerty123', 'admin123',
    'welcome123', 'monkey123', 'dragon123', 'sunshine123'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    return { 
      valid: false, 
      error: 'Password is too common. Please choose a stronger password.' 
    };
  }
  
  return { valid: true };
};

// Helper function to sanitize email
const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Helper function to check if email is admin (implement based on your logic)
const isAdminEmail = (email: string): boolean => {
  // Implement your admin email check logic
  // Example:
  const adminEmails = ['admin@pumpguard.app', 'administrator@pumpguard.app'];
  return adminEmails.includes(email.toLowerCase());
};

// Rate limiting helper functions
const rateLimitCheck = (key: string): boolean => {
  try {
    const now = Date.now();
    const lastAttempt = localStorage.getItem(`rate_limit_${key}`);
    
    if (lastAttempt) {
      const timeSinceLastAttempt = now - parseInt(lastAttempt);
      // 15 minutes cooldown
      if (timeSinceLastAttempt < 15 * 60 * 1000) {
        return false;
      }
    }
    
    localStorage.setItem(`rate_limit_${key}`, now.toString());
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Fail open on error
  }
};

const clearRateLimit = (key: string): void => {
  try {
    localStorage.removeItem(`rate_limit_${key}`);
  } catch (error) {
    console.error('Clear rate limit error:', error);
  }
};
  // ==================== FIXED LOGOUT FUNCTION ====================
  const logout = useCallback(async () => {
    try {
      console.log("🚪 Starting secure logout...");
      
      // 🚀 Set manual logout flag
      manualLogoutRef.current = true;
      sessionStorage.setItem('manual_logout', 'true');
      
      // 🚀 Clear ALL local storage immediately
      removeSession();
      localStorage.removeItem("pumpguard_offline_user");
      localStorage.removeItem("pumpguard_offline_email");
      localStorage.removeItem('supabase_last_refresh');
      localStorage.removeItem('sb-localhost-auth-token'); // Supabase token
      
      // Clear rate limits
      if (user?.email) {
        const emailKey = sanitizeEmail(user.email);
        ['login', 'forgot_password', 'password_reset'].forEach(type => {
          localStorage.removeItem(`rate_limit_${type}_${emailKey}`);
        });
      }
      
      // 🚀 Sign out from Supabase
      await supabase.auth.signOut();
      
      console.log("✅ Supabase signout complete");
      
      // 🚀 Show toast
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        duration: 2000,
      });
      
      // 🚀 Force reload to login page (NO FLASH!)
      window.location.href = "/login";
      
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  }, [removeSession, user, toast]);

  // ==================== AUTH INITIALIZATION ====================
  useEffect(() => {
    if (AUTH_INITIALIZED) {
      setIsLoading(false);
      return;
    }

    AUTH_INITIALIZED = true;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🚀 Initializing auth system");

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
  }, []);

  // ==================== AUTH STATE LISTENER ====================
  useEffect(() => {
    if (SESSION_LISTENER_ACTIVE) return;

    SESSION_LISTENER_ACTIVE = true;
    let mounted = true;

    console.log("🔧 Setting up auth state listener");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!mounted) return;
      
      console.log("🔄 Auth state change:", event);
      
      // 🚀 Skip if manual logout is in progress
      if (manualLogoutRef.current || sessionStorage.getItem('manual_logout') === 'true') {
        console.log("🚫 Skipping auth listener during manual logout");
        return;
      }
      
      switch (event) {
        case "SIGNED_OUT":
          console.log("🔒 User signed out (automatic)");
          
          if (window.location.pathname !== '/login') {
            removeSession();
            localStorage.removeItem("pumpguard_offline_user");
            localStorage.removeItem("pumpguard_offline_email");
            localStorage.removeItem('supabase_last_refresh');
            
            toast({
              title: "Session Expired",
              description: "You have been automatically logged out.",
              duration: 3000,
            });
            
            setTimeout(() => {
              if (mounted) {
                window.location.href = "/login";
              }
            }, 1500);
          }
          break;

        case "SIGNED_IN":
          console.log("🔓 User signed in");
          
          // 🚀 Block auto-login after manual logout
          if (manualLogoutRef.current) {
            console.log("🚫 Blocking auto-login after manual logout");
            return;
          }
          
          if (authSession?.user) {
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
              
              localStorage.setItem("pumpguard_offline_user", JSON.stringify(userData));
              localStorage.setItem("pumpguard_offline_email", authSession.user.email!);
            } catch (error) {
              console.error("Error creating session:", error);
            }
          }
          break;

        case "TOKEN_REFRESHED":
          console.log("♻️ Token refreshed");
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
  }, [removeSession, toast, fetchUserData, setSession]);

  // ==================== CLEANUP ====================
  useEffect(() => {
    return () => {
      // Reset manual logout flag on unmount
      manualLogoutRef.current = false;
      sessionStorage.removeItem('manual_logout');
    };
  }, []);

  // ✅ Login method
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();

      const sanitizedEmail = sanitizeEmail(email);
      
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
        
        localStorage.setItem("pumpguard_offline_user", JSON.stringify(userData));
        localStorage.setItem("pumpguard_offline_email", email);
        
        console.log("✅ Session created and user logged in");
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.name || userData.email}!`,
        });
        
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
    logout,
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

// 🚀 Export safeQuery wrapper
export { safeQuery };

export default AuthProvider;
