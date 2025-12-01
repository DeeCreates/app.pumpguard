// src/lib/auth-api.ts
import { supabase } from './supabase';

export type SignUpData = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: string;
  omc_id?: string | null;
  station_id?: string | null;
  dealer_id?: string | null;
};

export type SignInData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type AuthResponse = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};

export type AppealData = {
  violation_id: string;
  appeal_reason: string;
  evidence_urls?: string[];
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
};

export type PasswordResetData = {
  token: string;
  newPassword: string;
  confirmPassword?: string;
};

class AuthAPI {
  // Define role hierarchy and permissions
  private readonly roleHierarchy = {
    admin: ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'],
    npa: ['npa', 'omc', 'dealer', 'station_manager', 'attendant'],
    omc: ['dealer', 'station_manager', 'attendant'],
    dealer: ['station_manager', 'attendant'],
    station_manager: ['attendant'],
    attendant: [],
    supervisor: ['station_manager', 'attendant']
  };

  // All valid roles in the system
  private readonly allRoles = ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'];

  // Admin email patterns that cannot reset password via public form
  private readonly adminEmailPatterns = [
    /^admin@/i,
    /@pumpguard\.com$/i,
    /administrator@/i,
    /superadmin@/i,
    /root@/i,
    /sysadmin@/i
  ];

  // Common passwords to reject
  private readonly commonPasswords = [
    'password', '123456', '12345678', '123456789', 'password123',
    'admin', 'admin123', 'qwerty', 'letmein', 'welcome',
    'monkey', 'dragon', 'baseball', 'football', 'jesus',
    'master', 'hello', 'freedom', 'whatever', 'qazwsx',
    'trustno1', 'dragon', 'sunshine', 'iloveyou', 'starwars'
  ];

  /**
   * Check if email belongs to admin account
   */
  private isAdminEmail(email: string): boolean {
    return this.adminEmailPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): { valid: boolean; error?: string } {
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
    if (this.commonPasswords.includes(password.toLowerCase())) {
      return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
    }

    return { valid: true };
  }

  /**
   * Rate limiting helper
   */
  private async checkRateLimit(key: string, maxAttempts: number = 5, windowMinutes: number = 15): Promise<boolean> {
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
  }

  /**
   * Clear rate limit for a key
   */
  private clearRateLimit(key: string): void {
    localStorage.removeItem(`rate_limit_${key}`);
  }

  /**
   * Sanitize email
   */
  private sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Check if current user can create a user with the specified role
   */
  private async canCreateRole(creatorRole: string, targetRole: string): Promise<boolean> {
    const allowedRoles = this.roleHierarchy[creatorRole as keyof typeof this.roleHierarchy];
    return allowedRoles ? allowedRoles.includes(targetRole) : false;
  }

  /**
   * Get current user's role
   */
  private async getCurrentUserRole(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile?.role || null;
    } catch (error) {
      console.error('Error getting current user role:', error);
      return null;
    }
  }

  /**
   * Format role for display
   */
  private formatRoleDisplay(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  }

  /**
   * Validate role assignment against database constraints
   */
  private validateRoleAssignment(role: string, omc_id: string | null, station_id: string | null, dealer_id: string | null): { valid: boolean; error?: string } {
    switch (role) {
      case 'admin':
      case 'supervisor':
        if (omc_id !== null || dealer_id !== null || station_id !== null) {
          const error = `${this.formatRoleDisplay(role)} must not be assigned to OMC, dealer, or station`;
          return { valid: false, error };
        }
        break;
      
      case 'omc':
        if (omc_id === null) {
          const error = 'OMC user must be assigned to an OMC';
          return { valid: false, error };
        }
        if (dealer_id !== null || station_id !== null) {
          const error = 'OMC user cannot be assigned to dealer or station';
          return { valid: false, error };
        }
        break;
      
      case 'dealer':
        if (dealer_id === null) {
          const error = 'Dealer must be assigned to a dealer';
          return { valid: false, error };
        }
        if (omc_id !== null || station_id !== null) {
          const error = 'Dealer cannot be assigned to OMC or station';
          return { valid: false, error };
        }
        break;
      
      case 'station_manager':
      case 'attendant':
        if (station_id === null) {
          const error = `${this.formatRoleDisplay(role)} must be assigned to a station`;
          return { valid: false, error };
        }
        if (omc_id !== null || dealer_id !== null) {
          const error = `${this.formatRoleDisplay(role)} cannot be assigned to OMC or dealer`;
          return { valid: false, error };
        }
        break;
      
      default:
        const error = `Unknown role: ${role}`;
        return { valid: false, error };
    }
    
    return { valid: true };
  }

  // ===== PASSWORD RESET FUNCTIONALITY =====

  /**
   * Request password reset (forgot password)
   * IMPORTANT: Admin accounts cannot reset password via this public method
   */
  async forgotPassword(email: string, resetUrl?: string): Promise<AuthResponse> {
    try {
      const sanitizedEmail = this.sanitizeEmail(email);
      
      // Rate limiting check
      const canProceed = await this.checkRateLimit(`forgot_password_${sanitizedEmail}`);
      if (!canProceed) {
        return {
          success: false,
          error: 'Too many password reset attempts. Please try again in 15 minutes.'
        };
      }

      // Check if it's an admin account
      if (this.isAdminEmail(sanitizedEmail)) {
        // Log security event but don't reveal it's an admin account
        await this.logSecurityEvent({
          type: 'ADMIN_PASSWORD_RESET_ATTEMPT',
          email: sanitizedEmail,
          action: 'BLOCKED',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });

        // Return generic success message (security through obscurity)
        return {
          success: true,
          message: 'If an account exists with this email, you will receive reset instructions shortly.'
        };
      }

      // Normal user - check if email exists in our system
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', sanitizedEmail)
        .single();

      if (userError || !existingUser) {
        // Still return success to prevent email enumeration attacks
        return {
          success: true,
          message: 'If an account exists with this email, you will receive reset instructions shortly.'
        };
      }

      // Generate secure reset token using Supabase's built-in reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        sanitizedEmail,
        {
          redirectTo: resetUrl || `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        console.error('Password reset request error:', resetError);
        return {
          success: false,
          error: 'Failed to send reset instructions. Please try again later.'
        };
      }

      // Log successful request
      await this.logSecurityEvent({
        type: 'PASSWORD_RESET_REQUESTED',
        email: sanitizedEmail,
        action: 'REQUESTED',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Password reset instructions have been sent to your email.'
      };

    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: PasswordResetData): Promise<AuthResponse> {
    try {
      const { token, newPassword, confirmPassword } = resetData;

      // Validate token exists
      if (!token) {
        return {
          success: false,
          error: 'Invalid or expired reset token.'
        };
      }

      // Check if passwords match
      if (confirmPassword && newPassword !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match.'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
        };
      }

      // First, get the user from the token
      const { data: { user }, error: tokenError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (tokenError || !user) {
        return {
          success: false,
          error: 'Invalid or expired reset token. Please request a new password reset.'
        };
      }

      // Check if this is an admin account
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profile && this.isAdminEmail(profile.email)) {
        // Admin password reset must be done through admin panel
        return {
          success: false,
          error: 'Admin password cannot be reset through this form. Please contact system administrator.'
        };
      }

      // Update password using Supabase's updateUser method
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        return {
          success: false,
          error: 'Failed to update password. Please try again.'
        };
      }

      // Clear rate limit for this email
      this.clearRateLimit(`forgot_password_${this.sanitizeEmail(user.email || '')}`);

      // Log password reset
      await this.logSecurityEvent({
        type: 'PASSWORD_RESET_COMPLETED',
        email: user.email,
        userId: user.id,
        action: 'COMPLETED',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Update password reset time in profile
      await supabase
        .from('profiles')
        .update({ 
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return {
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.',
        data: { email: user.email }
      };

    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Change password for logged-in user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
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
          error: 'Current password is incorrect'
        };
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
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
          error: 'Failed to change password. Please try again.'
        };
      }

      // Log password change
      await this.logSecurityEvent({
        type: 'PASSWORD_CHANGED',
        email: user.email,
        userId: user.id,
        action: 'CHANGED',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

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
        message: 'Password changed successfully!'
      };

    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Admin-only: Force reset user password
   */
  async adminResetPassword(userId: string, adminUserId: string): Promise<AuthResponse> {
    try {
      // Get admin profile to verify permissions
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (!adminProfile || !['admin', 'supervisor'].includes(adminProfile.role)) {
        return {
          success: false,
          error: 'You do not have permission to reset user passwords.'
        };
      }

      // Get user to reset
      const { data: userToReset } = await supabase.auth.admin.getUserById(userId);
      
      if (!userToReset || !userToReset.user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Generate temporary password
      const tempPassword = this.generateTemporaryPassword();
      
      // Update user password (admin API)
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('Admin password reset error:', updateError);
        return {
          success: false,
          error: 'Failed to reset password. Please try again.'
        };
      }

      // Log admin action
      await this.logSecurityEvent({
        type: 'ADMIN_PASSWORD_RESET',
        adminId: adminUserId,
        targetUserId: userId,
        targetEmail: userToReset.user.email,
        action: 'RESET',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Update profile
      await supabase
        .from('profiles')
        .update({ 
          password_changed_at: null, // Force password change on next login
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        success: true,
        message: 'Password has been reset successfully.',
        data: {
          email: userToReset.user.email,
          temporaryPassword: tempPassword,
          note: 'User must change password on next login'
        }
      };

    } catch (error: any) {
      console.error('Admin password reset error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Generate temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    
    // Ensure at least one of each required character type
    password += chars.charAt(Math.floor(Math.random() * 26)); // Uppercase
    password += chars.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
    password += chars.charAt(52 + Math.floor(Math.random() * 10)); // Number
    password += chars.charAt(62 + Math.floor(Math.random() * 10)); // Special
    
    // Fill remaining characters
    for (let i = 4; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(eventData: {
    type: string;
    email?: string;
    userId?: string;
    adminId?: string;
    targetUserId?: string;
    targetEmail?: string;
    action: string;
    userAgent: string;
    timestamp: string;
    details?: any;
  }): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          type: eventData.type,
          email: eventData.email,
          user_id: eventData.userId,
          admin_id: eventData.adminId,
          target_user_id: eventData.targetUserId,
          target_email: eventData.targetEmail,
          action: eventData.action,
          user_agent: eventData.userAgent,
          ip_address: 'client_ip', // In production, get from request headers
          details: eventData.details || {},
          created_at: eventData.timestamp
        });
    } catch (error) {
      console.error('Error logging security event:', error);
      // Don't throw - logging should not break main functionality
    }
  }

  // ===== ENHANCED SIGN IN WITH SECURITY MEASURES =====

  async signIn({ email, password, rememberMe = false }: SignInData): Promise<AuthResponse> {
    try {
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      const sanitizedEmail = this.sanitizeEmail(email);

      // Rate limiting check
      const canProceed = await this.checkRateLimit(`login_${sanitizedEmail}`);
      if (!canProceed) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again in 15 minutes.'
        };
      }

      // Check if account is locked
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, login_attempts, locked_until')
        .eq('email', sanitizedEmail)
        .single();

      if (profile) {
        if (!profile.is_active) {
          return {
            success: false,
            error: 'Account is deactivated. Please contact administrator.'
          };
        }

        if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
          return {
            success: false,
            error: 'Account is temporarily locked. Please try again later.'
          };
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        // Increment failed login attempts
        if (profile) {
          const newAttempts = (profile.login_attempts || 0) + 1;
          const updateData: any = {
            login_attempts: newAttempts,
            updated_at: new Date().toISOString()
          };

          // Lock account after 5 failed attempts
          if (newAttempts >= 5) {
            const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            updateData.locked_until = lockUntil.toISOString();
            updateData.login_attempts = 0; // Reset after lock
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('email', sanitizedEmail);
        }

        // Log failed attempt
        await this.logSecurityEvent({
          type: 'LOGIN_FAILED',
          email: sanitizedEmail,
          action: 'FAILED',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          details: { error: error.message }
        });

        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      // Reset login attempts on successful login
      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('email', sanitizedEmail);
      }

      // Clear rate limit for successful login
      this.clearRateLimit(`login_${sanitizedEmail}`);

      // Log successful login
      await this.logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        email: sanitizedEmail,
        userId: data.user.id,
        action: 'SUCCESS',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Set session expiration based on rememberMe
      if (rememberMe) {
        // Extend session for 30 days
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          console.error('Error setting extended session:', sessionError);
        }
      }

      return {
        success: true,
        message: 'Signed in successfully!',
        data
      };

    } catch (error: any) {
      console.error('Unexpected signin error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  // ===== ENHANCED SIGN UP WITH PASSWORD VALIDATION =====

  async signUp({ email, password, fullName, phone, role, omc_id, station_id, dealer_id }: SignUpData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
        };
      }

      if (password.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long'
        };
      }

      // Validate role
      const targetRole = role || 'attendant';
      
      if (!this.allRoles.includes(targetRole)) {
        return {
          success: false,
          error: `Invalid role '${targetRole}'. Available roles: ${this.allRoles.join(', ')}`
        };
      }

      // Auto-clean parent references for station-level roles BEFORE validation
      let cleanedOmcId = omc_id;
      let cleanedDealerId = dealer_id;
      let cleanedStationId = station_id;
      
      if (targetRole === 'station_manager' || targetRole === 'attendant') {
        cleanedOmcId = null;
        cleanedDealerId = null;
        
        if (!cleanedStationId) {
          return {
            success: false,
            error: `${this.formatRoleDisplay(targetRole)} must be assigned to a station`
          };
        }
      }

      // Enhanced role assignment validation with CLEANED values
      const assignmentValidation = this.validateRoleAssignment(
        targetRole, 
        cleanedOmcId, 
        cleanedStationId, 
        cleanedDealerId
      );
      
      if (!assignmentValidation.valid) {
        return {
          success: false,
          error: assignmentValidation.error
        };
      }

      // Check if current user has permission to create this role
      const creatorRole = await this.getCurrentUserRole();
      
      if (creatorRole && !(await this.canCreateRole(creatorRole, targetRole))) {
        return {
          success: false,
          error: `You don't have permission to create users with role '${targetRole}'. Your role: ${creatorRole}`
        };
      }

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: targetRole,
            omc_id: cleanedOmcId,
            station_id: cleanedStationId,
            dealer_id: cleanedDealerId
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          return await this.handleExistingUser(email, password, fullName, phone, targetRole, cleanedOmcId, cleanedStationId, cleanedDealerId);
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user data returned from authentication'
        };
      }

      // Build profile data according to role constraints
      const profileData: any = {
        id: data.user.id,
        email: email,
        role: targetRole,
        full_name: fullName || email.split('@')[0],
        phone: phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Set IDs according to role constraints using CLEANED values
      switch (targetRole) {
        case 'admin':
        case 'supervisor':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'omc':
          profileData.omc_id = cleanedOmcId;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'dealer':
          profileData.omc_id = null;
          profileData.dealer_id = cleanedDealerId;
          profileData.station_id = null;
          break;
        case 'station_manager':
        case 'attendant':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = cleanedStationId;
          break;
      }

      // Create profile
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        if (profileError.message.includes('valid_role_assignment')) {
          return {
            success: false,
            error: `Database constraint violation: ${this.formatRoleDisplay(targetRole)} role requires specific assignment rules. Please check that the user is properly assigned to the correct entity.`
          };
        }
        
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        };
      }

      // Log user creation
      await this.logSecurityEvent({
        type: 'USER_CREATED',
        email: email,
        userId: data.user.id,
        action: 'CREATED',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        details: { role: targetRole }
      });

      return {
        success: true,
        message: `${this.formatRoleDisplay(targetRole)} account created successfully!`,
        data: { user: data.user, profile: profileResult }
      };

    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Get current session with enhanced security
   */
  async getCurrentSession() {
    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (sessionData.session?.user) {
        // Verify session is still valid
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Session expired, clear it
          await supabase.auth.signOut();
          return { data: null, error: null };
        }
      }
      
      return { data: sessionData.session, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      return !error;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  /**
   * Sign out with security logging
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Log logout event
        await this.logSecurityEvent({
          type: 'LOGOUT',
          email: user.email,
          userId: user.id,
          action: 'LOGOUT',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Signed out successfully'
      };

    } catch (error) {
      console.error('Unexpected signout error:', error);
      return {
        success: false,
        error: 'Failed to sign out'
      };
    }
  }

  /**
   * Get current user with enhanced security
   */
  async getCurrentUser() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            omcs (*),
            stations (*),
            dealers (*)
          `)
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          return { 
            data: {
              user: authData.user,
              profile: null
            }, 
            error: null 
          };
        }

        // Check if password needs to be changed (admin reset)
        const passwordChangeRequired = !profileData.password_changed_at;
        
        return { 
          data: {
            user: authData.user,
            profile: {
              ...profileData,
              password_change_required: passwordChangeRequired
            }
          }, 
          error: null 
        };
      }

      return { data: null, error: null };
      
    } catch (error) {
      console.error('Unexpected user fetch error:', error);
      return { data: null, error };
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Translate Supabase errors to user-friendly messages
   */
  private getErrorMessage(error: any): string {
    const errorMap: { [key: string]: string } = {
      'invalid_credentials': 'Invalid email or password',
      'email_not_confirmed': 'Please confirm your email address. Check your inbox or contact administrator.',
      'user_already_exists': 'An account with this email already exists',
      'weak_password': 'Password must be at least 6 characters long',
      'invalid_email': 'Please enter a valid email address',
      'email_confirmation_required': 'Please check your email to confirm your account',
      'invalid_recovery_token': 'Invalid or expired reset token',
      'rate_limit_exceeded': 'Too many attempts. Please try again later.',
    };

    return errorMap[error.code] || error.message || 'An error occurred';
  }

  /**
   * Handle existing user - update profile if needed
   */
  private async handleExistingUser(email: string, password: string, fullName?: string, phone?: string, role?: string, omc_id?: string | null, station_id?: string | null, dealer_id?: string | null): Promise<AuthResponse> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return {
          success: false,
          error: 'Please log in first to manage existing users'
        };
      }

      return {
        success: false,
        error: 'User already exists. Please use "Forgot Password" to reset the password or contact an administrator to update the user profile.'
      };

    } catch (error: any) {
      console.error('Error handling existing user:', error);
      return {
        success: false,
        error: 'Failed to handle existing user: ' + error.message
      };
    }
  }
  // ===== EXISTING AUTH METHODS (unchanged) =====

  async signUp({ email, password, fullName, phone, role, omc_id, station_id, dealer_id }: SignUpData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        };
      }

      // Validate role
      const targetRole = role || 'attendant';
      
      if (!this.allRoles.includes(targetRole)) {
        return {
          success: false,
          error: `Invalid role '${targetRole}'. Available roles: ${this.allRoles.join(', ')}`
        };
      }

      // 🔧 CRITICAL FIX: Auto-clean parent references for station-level roles BEFORE validation
      let cleanedOmcId = omc_id;
      let cleanedDealerId = dealer_id;
      let cleanedStationId = station_id;
      
      if (targetRole === 'station_manager' || targetRole === 'attendant') {
        console.log('⚙️ Auto-clearing OMC and Dealer IDs for station-level role:', targetRole);
        cleanedOmcId = null;
        cleanedDealerId = null;
        
        // Also ensure station_id is provided for station-level roles
        if (!cleanedStationId) {
          return {
            success: false,
            error: `${this.formatRoleDisplay(targetRole)} must be assigned to a station`
          };
        }
      }

      console.log('🔍 DEBUG - After auto-clean:', {
        role: targetRole,
        omc_id: cleanedOmcId,
        dealer_id: cleanedDealerId,
        station_id: cleanedStationId
      });

      // Enhanced role assignment validation with CLEANED values
      const assignmentValidation = this.validateRoleAssignment(
        targetRole, 
        cleanedOmcId, 
        cleanedStationId, 
        cleanedDealerId
      );
      
      if (!assignmentValidation.valid) {
        return {
          success: false,
          error: assignmentValidation.error
        };
      }

      // Check if current user has permission to create this role
      const creatorRole = await this.getCurrentUserRole();
      
      if (creatorRole && !(await this.canCreateRole(creatorRole, targetRole))) {
        return {
          success: false,
          error: `You don't have permission to create users with role '${targetRole}'. Your role: ${creatorRole}`
        };
      }

      // Create auth user with CLEANED values
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: targetRole,
            omc_id: cleanedOmcId,
            station_id: cleanedStationId,
            dealer_id: cleanedDealerId
          }
        }
      });

      if (error) {
        // If it's a user exists error, try to sign in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          return await this.handleExistingUser(email, password, fullName, phone, targetRole, cleanedOmcId, cleanedStationId, cleanedDealerId);
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user data returned from authentication'
        };
      }

      // Build profile data according to role constraints
      const profileData: any = {
        id: data.user.id,
        role: targetRole,
        full_name: fullName || email.split('@')[0],
        phone: phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Set IDs according to role constraints using CLEANED values
      switch (targetRole) {
        case 'admin':
        case 'supervisor':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'omc':
          profileData.omc_id = cleanedOmcId;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'dealer':
          profileData.omc_id = null;
          profileData.dealer_id = cleanedDealerId;
          profileData.station_id = null;
          break;
        case 'station_manager':
        case 'attendant':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = cleanedStationId;
          break;
      }

      console.log('📝 Final profile data being inserted:', profileData);

      // Create profile
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        // Enhanced constraint violation detection
        if (profileError.message.includes('valid_role_assignment')) {
          return {
            success: false,
            error: `Database constraint violation: ${this.formatRoleDisplay(targetRole)} role requires specific assignment rules. Please check that the user is properly assigned to the correct entity.`
          };
        }
        
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        };
      }

      return {
        success: true,
        message: `${this.formatRoleDisplay(targetRole)} account created successfully!`,
        data: { user: data.user, profile: profileResult }
      };

    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * SMART station creation - automatically detects OMC context
   */
  async createStationSmart(stationData: any): Promise<AuthResponse> {
    try {
      // Get current user to determine context
      const { data: currentUser } = await this.getCurrentUser();
      
      if (!currentUser?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      let omc_id = stationData.omc_id;

      // AUTO-DETECT: If user is OMC role, use their OMC ID automatically
      if (currentUser.profile?.role === 'omc') {
        if (currentUser.profile.omc_id) {
          omc_id = currentUser.profile.omc_id;
        } else {
          return {
            success: false,
            error: 'OMC user does not have an OMC assigned to their profile'
          };
        }
      }
      
      // VALIDATE: If still no OMC ID, it's required
      if (!omc_id) {
        return {
          success: false,
          error: 'OMC ID is required. Please select an OMC or ensure your user profile has an OMC assigned.'
        };
      }

      // Ensure required fields
      const enhancedStationData = {
        ...stationData,
        omc_id: omc_id,
        address: stationData.address || 'Address not provided',
        region: stationData.region || 'Region not provided'
      };

      return await this.createStation(enhancedStationData);

    } catch (error: any) {
      console.error('Smart station creation error:', error);
      return {
        success: false,
        error: 'Failed to create station: ' + error.message
      };
    }
  }

  /**
   * Create station with guaranteed non-empty code
   */
  async createStation(stationData: any): Promise<AuthResponse> {
    try {
      // Validate required fields
      if (!stationData.name) {
        return {
          success: false,
          error: 'Station name is required'
        };
      }

      if (!stationData.omc_id) {
        return {
          success: false,
          error: 'OMC ID is required'
        };
      }

      // Generate guaranteed non-empty code
      const guaranteedCode = this.generateMathematicallyGuaranteedCode(stationData.name);

      // Verify OMC exists
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .select('id, name')
        .eq('id', stationData.omc_id)
        .single();

      if (omcError || !omc) {
        return {
          success: false,
          error: 'OMC not found'
        };
      }

      // Prepare station data
      const stationToCreate = {
        code: guaranteedCode,
        name: stationData.name,
        omc_id: stationData.omc_id,
        dealer_id: stationData.dealer_id || null,
        address: stationData.address || null,
        city: stationData.city || null,
        state: stationData.state || null,
        country: stationData.country || 'Ghana',
        zip_code: stationData.zip_code || null,
        contact_phone: stationData.contact_phone || null,
        contact_email: stationData.contact_email || null,
        is_active: true,
        latitude: stationData.latitude || null,
        longitude: stationData.longitude || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create the station
      const { data: newStation, error: createError } = await supabase
        .from('stations')
        .insert(stationToCreate)
        .select()
        .single();

      if (createError) {
        // Ultimate fallback: Use UUID-based code that cannot fail
        const ultimateCode = this.generateUltimateFallbackCode();
        
        const { data: ultimateStation, error: ultimateError } = await supabase
          .from('stations')
          .insert({ ...stationToCreate, code: ultimateCode })
          .select()
          .single();

        if (ultimateError) {
          return {
            success: false,
            error: `CRITICAL DATABASE ERROR: Cannot create station even with guaranteed codes. Please contact administrator.`
          };
        }

        return {
          success: true,
          message: 'Station created with fallback code!',
          data: ultimateStation
        };
      }

      return {
        success: true,
        message: 'Station created successfully!',
        data: newStation
      };

    } catch (error: any) {
      console.error('Unexpected station creation error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while creating the station.'
      };
    }
  }

  /**
   * Create OMC (Admin only)
   */
  async createOMC(omcData: any): Promise<AuthResponse> {
    try {
      // Generate unique OMC code
      const omcCode = await this.generateUniqueOMCCode(omcData.name);
      
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .insert({
          name: omcData.name,
          code: omcCode,
          contact_email: omcData.contact_email,
          contact_phone: omcData.contact_phone,
          address: omcData.address,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (omcError) {
        return {
          success: false,
          error: `Failed to create OMC: ${omcError.message}`
        };
      }

      // Create OMC admin user if provided
      if (omcData.admin_email) {
        await this.signUp({
          email: omcData.admin_email,
          password: omcData.admin_password || 'TempPassword123!',
          fullName: omcData.admin_name || `Admin of ${omcData.name}`,
          phone: omcData.contact_phone,
          role: 'omc',
          omc_id: omc.id,
          station_id: null,
          dealer_id: null
        });
      }

      return {
        success: true,
        message: 'OMC created successfully!',
        data: omc
      };

    } catch (error: any) {
      console.error('OMC creation error:', error);
      return {
        success: false,
        error: 'Failed to create OMC: ' + error.message
      };
    }
  }

  /**
   * Create Station Manager (assigned to ONE specific station)
   */
  async createStationManager(omc_id: string, station_id: string, userData: any): Promise<AuthResponse> {
    try {
      // Verify the station belongs to this OMC
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('id, name, omc_id, code')
        .eq('id', station_id)
        .eq('omc_id', omc_id)
        .single();

      if (stationError || !station) {
        return {
          success: false,
          error: 'Station not found or you do not have permission to manage this station'
        };
      }

      // Check if station already has a manager
      const { data: existingManager, error: managerCheckError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('station_id', station_id)
        .eq('role', 'station_manager')
        .eq('is_active', true)
        .maybeSingle();

      if (existingManager) {
        return {
          success: false,
          error: `Station '${station.name}' already has a manager: ${existingManager.full_name} (${existingManager.email})`
        };
      }

      // Create the station manager user
      const signUpData = {
        email: userData.email,
        password: userData.password || 'TempPassword123!',
        fullName: userData.fullName,
        phone: userData.phone,
        role: 'station_manager',
        omc_id: null, // Auto-cleared by the signUp method
        station_id: station_id,
        dealer_id: null // Auto-cleared by the signUp method
      };

      return await this.signUp(signUpData);

    } catch (error: any) {
      console.error('Station Manager creation error:', error);
      return {
        success: false,
        error: 'Failed to create station manager: ' + error.message
      };
    }
  }

  /**
   * Create Dealer (can manage MULTIPLE stations)
   */
  async createDealer(omc_id: string, dealerData: any): Promise<AuthResponse> {
    try {
      // First create the dealer entity with unique code
      const dealerCode = await this.generateUniqueDealerCode();
      const { data: dealer, error: dealerError } = await supabase
        .from('dealers')
        .insert({
          name: dealerData.name,
          code: dealerCode,
          omc_id: omc_id,
          contact_email: dealerData.contact_email,
          contact_phone: dealerData.contact_phone,
          address: dealerData.address,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dealerError) {
        return {
          success: false,
          error: 'Failed to create dealer entity: ' + dealerError.message
        };
      }

      // Create the dealer user account
      const signUpData = {
        email: dealerData.email,
        password: dealerData.password || 'TempPassword123!',
        fullName: dealerData.fullName,
        phone: dealerData.contact_phone,
        role: 'dealer',
        omc_id: null,
        station_id: null,
        dealer_id: dealer.id
      };

      const userResult = await this.signUp(signUpData);

      if (userResult.success) {
        // Assign existing stations to this dealer if specified
        if (dealerData.station_ids && dealerData.station_ids.length > 0) {
          await this.assignStationsToDealer(dealer.id, dealerData.station_ids);
        }
      }

      return userResult;

    } catch (error: any) {
      console.error('Dealer creation error:', error);
      return {
        success: false,
        error: 'Failed to create dealer: ' + error.message
      };
    }
  }

  /**
   * Create multiple stations for OMC with unique codes
   */
  async createOMCStations(omc_id: string, stationsData: any[]): Promise<AuthResponse> {
    try {
      const results = [];
      const errors = [];

      for (const stationData of stationsData) {
        try {
          const stationWithOMC = { ...stationData, omc_id };
          const result = await this.createStationSmart(stationWithOMC);
          
          if (result.success) {
            results.push(result.data);
          } else {
            errors.push({ station: stationData.name, error: result.error });
          }
        } catch (error: any) {
          errors.push({ station: stationData.name, error: error.message });
          console.error('Station creation error:', stationData.name, error);
        }
      }

      return {
        success: errors.length === 0,
        message: `Created ${results.length} stations, ${errors.length} failed`,
        data: {
          created: results,
          errors: errors
        }
      };

    } catch (error: any) {
      console.error('Batch station creation error:', error);
      return {
        success: false,
        error: 'Failed to create stations: ' + error.message
      };
    }
  }

  /**
   * Get OMC dashboard with all entities
   */
  async getOMCDashboard(omc_id: string): Promise<AuthResponse> {
    try {
      console.log('📊 Getting OMC dashboard for:', omc_id);
      
      // Get OMC details
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .select('*')
        .eq('id', omc_id)
        .single();

      if (omcError) throw omcError;

      // Get all stations under this OMC
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('*')
        .eq('omc_id', omc_id);

      if (stationsError) throw stationsError;

      // Get all dealers under this OMC
      const { data: dealers, error: dealersError } = await supabase
        .from('dealers')
        .select('*')
        .eq('omc_id', omc_id);

      if (dealersError) throw dealersError;

      // Get user counts by role under this OMC
      const stationIds = stations?.map(s => s.id) || [];
      const dealerIds = dealers?.map(d => d.id) || [];
      
      let users = [];
      if (stationIds.length > 0 || dealerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('role, station_id, dealer_id')
          .or(`station_id.in.(${stationIds.join(',')}),dealer_id.in.(${dealerIds.join(',')})`);

        if (!usersError) users = usersData || [];
      }

      const dashboardData = {
        omc,
        stats: {
          stations: stations?.length || 0,
          dealers: dealers?.length || 0,
          stationManagers: users?.filter(u => u.role === 'station_manager').length || 0,
          attendants: users?.filter(u => u.role === 'attendant').length || 0,
        },
        stations,
        dealers
      };

      console.log('📊 OMC dashboard data loaded successfully');
      
      return {
        success: true,
        data: dashboardData
      };

    } catch (error: any) {
      console.error('OMC dashboard error:', error);
      return {
        success: false,
        error: 'Failed to load OMC dashboard: ' + error.message
      };
    }
  }

  /**
   * ADMIN DASHBOARD - System Overview
   */
  async getAdminDashboard(): Promise<AuthResponse> {
    try {
      console.log('📊 Getting Admin Dashboard...');
      
      // Get all OMCs
      const { data: omcs, error: omcsError } = await supabase
        .from('omcs')
        .select('*')
        .order('name');

      if (omcsError) throw omcsError;

      // Get all stations count
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('id, omc_id, is_active');

      if (stationsError) throw stationsError;

      // Get all dealers count
      const { data: dealers, error: dealersError } = await supabase
        .from('dealers')
        .select('id, omc_id, is_active');

      if (dealersError) throw dealersError;

      // Get all users with roles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('role, is_active, created_at');

      if (usersError) throw usersError;

      const dashboardData = {
        stats: {
          omcs: omcs?.length || 0,
          stations: stations?.length || 0,
          dealers: dealers?.length || 0,
          stationManagers: users?.filter(u => u.role === 'station_manager').length || 0,
          attendants: users?.filter(u => u.role === 'attendant').length || 0,
          dealersUsers: users?.filter(u => u.role === 'dealer').length || 0,
          omcUsers: users?.filter(u => u.role === 'omc').length || 0,
          totalUsers: users?.length || 0,
        },
        omcs: omcs?.map(omc => ({
          ...omc,
          stationCount: stations?.filter(s => s.omc_id === omc.id).length || 0,
          dealerCount: dealers?.filter(d => d.omc_id === omc.id).length || 0,
        })),
        recentActivity: users?.slice(0, 10) // Last 10 users
      };

      console.log('📊 Admin dashboard data loaded successfully');
      
      return {
        success: true,
        data: dashboardData
      };

    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      return {
        success: false,
        error: 'Failed to load admin dashboard: ' + error.message
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Generate mathematically guaranteed non-empty code
   */
  private generateMathematicallyGuaranteedCode(name: string): string {
    let baseCode = name
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 15);

    if (!baseCode || baseCode === '') {
      baseCode = 'STATION';
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const guaranteedCode = `${baseCode}_${timestamp}_${random}`;

    if (!guaranteedCode || guaranteedCode.trim() === '') {
      return `STATION_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }

    return guaranteedCode;
  }

  /**
   * Ultimate fallback - uses UUID-like format that cannot be empty
   */
  private generateUltimateFallbackCode(): string {
    const part1 = Math.random().toString(36).substring(2, 6);
    const part2 = Math.random().toString(36).substring(2, 6);
    const part3 = Math.random().toString(36).substring(2, 6);
    
    return `STN_${part1}_${part2}_${part3}`.toUpperCase();
  }

  /**
   * Generate unique OMC code
   */
  private async generateUniqueOMCCode(name: string): Promise<string> {
    let baseCode = name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10);

    if (!baseCode) baseCode = 'OMC';

    let counter = 1;
    let suggestedCode = baseCode;

    while (true) {
      const { data: existing } = await supabase
        .from('omcs')
        .select('code')
        .eq('code', suggestedCode)
        .maybeSingle();

      if (!existing) {
        return suggestedCode;
      }

      counter++;
      suggestedCode = `${baseCode}_${counter}`;
      
      if (counter > 100) {
        suggestedCode = `${baseCode}_${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return suggestedCode;
  }

  /**
   * Generate unique dealer code
   */
  private async generateUniqueDealerCode(): Promise<string> {
    const baseCode = 'DLR';
    let counter = 1;
    let suggestedCode = `${baseCode}${counter.toString().padStart(3, '0')}`;

    while (true) {
      const { data: existing } = await supabase
        .from('dealers')
        .select('code')
        .eq('code', suggestedCode)
        .maybeSingle();

      if (!existing) {
        return suggestedCode;
      }

      counter++;
      suggestedCode = `${baseCode}${counter.toString().padStart(3, '0')}`;
      
      if (counter > 999) {
        suggestedCode = `${baseCode}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return suggestedCode;
  }

  /**
   * Assign stations to dealer
   */
  private async assignStationsToDealer(dealer_id: string, station_ids: string[]): Promise<void> {
    try {
      await supabase
        .from('stations')
        .update({ dealer_id: dealer_id })
        .in('id', station_ids);
    } catch (error) {
      console.error('Station assignment error:', error);
    }
  }

  /**
   * Handle existing user - update profile if needed
   */
  private async handleExistingUser(email: string, password: string, fullName?: string, phone?: string, role?: string, omc_id?: string | null, station_id?: string | null, dealer_id?: string | null): Promise<AuthResponse> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return {
          success: false,
          error: 'Please log in first to manage existing users'
        };
      }

      return {
        success: false,
        error: 'User already exists. Please use "Forgot Password" to reset the password or contact an administrator to update the user profile.'
      };

    } catch (error: any) {
      console.error('Error handling existing user:', error);
      return {
        success: false,
        error: 'Failed to handle existing user: ' + error.message
      };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      // Update last_login_at in profiles table
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
      }

      return {
        success: true,
        message: 'Signed in successfully!',
        data
      };

    } catch (error) {
      console.error('Unexpected signin error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Signed out successfully'
      };

    } catch (error) {
      console.error('Unexpected signout error:', error);
      return {
        success: false,
        error: 'Failed to sign out'
      };
    }
  }

  /**
   * Get current user with profile data
   */
  async getCurrentUser() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            omcs (*),
            stations (*),
            dealers (*)
          `)
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          return { 
            data: {
              user: authData.user,
              profile: null
            }, 
            error: null 
          };
        }

        return { 
          data: {
            user: authData.user,
            profile: profileData
          }, 
          error: null 
        };
      }

      return { data: null, error: null };
      
    } catch (error) {
      console.error('Unexpected user fetch error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get available roles for current user
   */
  async getAvailableRolesForCurrentUser(): Promise<AuthResponse> {
    try {
      const currentUserRole = await this.getCurrentUserRole();
      
      if (!currentUserRole) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const allowedRoles = this.roleHierarchy[currentUserRole as keyof typeof this.roleHierarchy] || [];
      
      return {
        success: true,
        data: {
          roles: allowedRoles,
          currentRole: currentUserRole
        }
      };

    } catch (error: any) {
      console.error('Error getting available roles:', error);
      return {
        success: false,
        error: 'Failed to get available roles: ' + error.message
      };
    }
  }

  // Add these methods back to the AuthAPI class:

  /**
   * Get all roles in the system (for reference)
   */
  async getAvailableRoles(): Promise<AuthResponse> {
    return {
      success: true,
      data: {
        roles: this.allRoles
      }
    };
  }

  /**
   * Validate if a role is valid in the system
   */
  async validateRole(role: string): Promise<boolean> {
    return this.allRoles.includes(role);
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Translate Supabase errors to user-friendly messages
   */
  private getErrorMessage(error: any): string {
    const errorMap: { [key: string]: string } = {
      'invalid_credentials': 'Invalid email or password',
      'email_not_confirmed': 'Please confirm your email address. Check your inbox or contact administrator.',
      'user_already_exists': 'An account with this email already exists',
      'weak_password': 'Password must be at least 6 characters long',
      'invalid_email': 'Please enter a valid email address',
      'email_confirmation_required': 'Please check your email to confirm your account',
      'user_not_allowed': 'Please disable email confirmation in Supabase dashboard settings',
    };

    return errorMap[error.code] || error.message || 'An error occurred';
  }
}

export const authAPI = new AuthAPI();