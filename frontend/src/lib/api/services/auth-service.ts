// lib/api/services/auth-service.ts
import { BaseService } from '../base-service';
import { SignUpData, SignInData, User, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { ROLE_HIERARCHY, ALL_ROLES } from '../../constants';
import { supabase } from '../../supabase';

export class AuthService extends BaseService {
  private readonly roleHierarchy = ROLE_HIERARCHY;
  private readonly allRoles = ALL_ROLES;

  /**
   * Register a new user with role-based validation
   */
  async signUp(userData: SignUpData): Promise<ApiResponse<{ user: any; profile: User }>> {
    return this.handleRequest(
      'user_signup',
      async () => {
        // Input validation
        if (!userData.email || !userData.password) {
          throw new Error('Email and password are required');
        }

        if (userData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Role validation
        const targetRole = userData.role || 'attendant';
        if (!this.allRoles.includes(targetRole)) {
          throw new Error(`Invalid role '${targetRole}'. Available roles: ${this.allRoles.join(', ')}`);
        }

        // Role assignment validation
        this.validateRoleAssignment(targetRole, userData.omc_id, userData.station_id, userData.dealer_id);

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name: userData.fullName,
              phone: userData.phone,
              role: targetRole,
              omc_id: userData.omc_id,
              station_id: userData.station_id,
              dealer_id: userData.dealer_id
            }
          }
        });

        if (authError) {
          throw new Error(this.getAuthErrorMessage(authError));
        }

        if (!authData.user) {
          throw new Error('No user data returned from authentication');
        }

        // Create user profile
        const profileData = this.buildProfileData(authData.user.id, userData, targetRole);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        return {
          user: authData.user,
          profile: profile as User
        };
      },
      { logActivity: true }
    );
  }

  /**
   * Authenticate existing user
   */
  async signIn(credentials: SignInData): Promise<ApiResponse<{ user: any; profile: User }>> {
    return this.handleRequest(
      'user_signin',
      async () => {
        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          throw new Error(this.getAuthErrorMessage(error));
        }

        // Update last login
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ 
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id);
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        return {
          user: data.user,
          profile: profile as User
        };
      },
      { logActivity: true }
    );
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<ApiResponse> {
    return this.handleRequest(
      'user_signout',
      async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw new Error(this.getAuthErrorMessage(error));
        }
        return { message: 'Signed out successfully' };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  /**
   * Get current authenticated user with profile
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: any; profile: User }>> {
    return this.handleRequest(
      'get_current_user',
      async () => {
        const user = await this.requireAuth();
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            *,
            stations (id, name, code),
            omcs (id, name, code),
            dealers (id, name)
          `)
          .eq('id', user.id)
          .single();

        if (error) {
          throw new Error('Failed to fetch user profile');
        }

        return {
          user,
          profile: profile as User
        };
      },
      { requireAuth: true }
    );
  }

  /**
   * Get available roles for current user based on role hierarchy
   */
  async getAvailableRoles(): Promise<ApiResponse<{ roles: UserRole[] }>> {
    return this.handleRequest(
      'get_available_roles',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);
        
        const allowedRoles = this.roleHierarchy[userProfile.role as keyof typeof this.roleHierarchy] || [];
        
        return { roles: allowedRoles as UserRole[] };
      },
      { requireAuth: true }
    );
  }

  /**
   * Validate if user can create accounts with specific role
   */
  async canCreateRole(targetRole: UserRole): Promise<ApiResponse<{ allowed: boolean }>> {
    return this.handleRequest(
      'can_create_role',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);
        
        const allowedRoles = this.roleHierarchy[userProfile.role as keyof typeof this.roleHierarchy] || [];
        const allowed = allowedRoles.includes(targetRole);
        
        return { allowed };
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private validateRoleAssignment(role: UserRole, omc_id?: string | null, station_id?: string | null, dealer_id?: string | null): void {
    switch (role) {
      case 'admin':
      case 'supervisor':
        if (omc_id !== null || dealer_id !== null || station_id !== null) {
          throw new Error(`${this.formatRoleDisplay(role)} must not be assigned to OMC, dealer, or station`);
        }
        break;
      
      case 'omc':
        if (omc_id === null) {
          throw new Error('OMC user must be assigned to an OMC');
        }
        if (dealer_id !== null || station_id !== null) {
          throw new Error('OMC user cannot be assigned to dealer or station');
        }
        break;
      
      case 'station_manager':
      case 'attendant':
        if (station_id === null) {
          throw new Error(`${this.formatRoleDisplay(role)} must be assigned to a station`);
        }
        if (omc_id !== null || dealer_id !== null) {
          throw new Error(`${this.formatRoleDisplay(role)} cannot be assigned to OMC or dealer`);
        }
        break;
    }
  }

  private buildProfileData(userId: string, userData: SignUpData, role: UserRole): any {
    const profileData: any = {
      id: userId,
      email: userData.email,
      role: role,
      full_name: userData.fullName || userData.email.split('@')[0],
      phone: userData.phone || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set IDs according to role constraints
    switch (role) {
      case 'admin':
      case 'supervisor':
        profileData.omc_id = null;
        profileData.dealer_id = null;
        profileData.station_id = null;
        break;
      case 'omc':
        profileData.omc_id = userData.omc_id;
        profileData.dealer_id = null;
        profileData.station_id = null;
        break;
      case 'dealer':
        profileData.omc_id = null;
        profileData.dealer_id = userData.dealer_id;
        profileData.station_id = null;
        break;
      case 'station_manager':
      case 'attendant':
        profileData.omc_id = null;
        profileData.dealer_id = null;
        profileData.station_id = userData.station_id;
        break;
    }

    return profileData;
  }

  private formatRoleDisplay(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  }

  private getAuthErrorMessage(error: any): string {
    const errorMap: { [key: string]: string } = {
      'invalid_credentials': 'Invalid email or password',
      'email_not_confirmed': 'Please confirm your email address',
      'user_already_exists': 'An account with this email already exists',
      'weak_password': 'Password must be at least 6 characters long',
      'invalid_email': 'Please enter a valid email address',
    };

    return errorMap[error.code] || error.message || 'An authentication error occurred';
  }
}