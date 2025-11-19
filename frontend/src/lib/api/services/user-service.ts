import { BaseService } from '../base-service';
import { User, UserRole, UserStatus, UserCreateData, UserUpdateData } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';
import { ROLE_HIERARCHY } from '../../constants';

export class UserService extends BaseService {
  async getUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole | 'all';
    status?: UserStatus | 'all';
    station_id?: string;
    omc_id?: string;
  } = {}): Promise<PaginatedResponse<User>> {
    return this.handleRequest(
      'get_users',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('profiles')
          .select(`
            *,
            stations (id, name, code),
            omcs (id, name, code),
            dealers (id, name)
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.search && filters.search.trim() !== '') {
          query = query.ilike('full_name', `%${filters.search}%`);
        }
        if (filters.role && filters.role !== 'all') {
          query = query.eq('role', filters.role);
        }
        if (filters.status && filters.status !== 'all') {
          query = query.eq('is_active', filters.status === 'active');
        }
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.omc_id) {
          query = query.eq('omc_id', filters.omc_id);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch users: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as User[],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        };
      },
      { requireAuth: true }
    );
  }

  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return this.handleRequest(
      'get_user_by_id',
      async () => {
        if (!this.isValidUUID(userId)) {
          throw new Error('Invalid user ID format');
        }

        const { data: user, error } = await supabase
          .from('profiles')
          .select(`
            *,
            stations (id, name, code),
            omcs (id, name, code),
            dealers (id, name)
          `)
          .eq('id', userId)
          .single();

        if (error || !user) {
          throw new Error('User not found');
        }

        return user as User;
      },
      { requireAuth: true }
    );
  }

  async createUser(userData: UserCreateData): Promise<ApiResponse<User>> {
    return this.handleRequest(
      'create_user',
      async () => {
        const currentUser = await this.requireAuth();
        const currentUserProfile = await this.getUserProfile(currentUser.id);

        // Check permissions
        if (!this.canManageUsers(currentUserProfile.role, userData.role)) {
          throw new Error('You do not have permission to create users with this role');
        }

        // Validate role assignment
        this.validateUserRoleAssignment(userData.role, userData.station_id, userData.omc_id, userData.dealer_id);

        // Create user in auth system
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role
          }
        });

        if (authError || !authData.user) {
          throw new Error(`Failed to create auth user: ${authError?.message}`);
        }

        // Create user profile
        const profileData = {
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone,
          station_id: userData.station_id,
          omc_id: userData.omc_id,
          dealer_id: userData.dealer_id,
          status: userData.status || 'active',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select(`
            *,
            stations (id, name, code),
            omcs (id, name, code),
            dealers (id, name)
          `)
          .single();

        if (profileError) {
          // Clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        await this.logActivity('user_created', { 
          user_id: authData.user.id, 
          role: userData.role 
        });

        return profile as User;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async updateUser(userId: string, updates: UserUpdateData): Promise<ApiResponse<User>> {
    return this.handleRequest(
      'update_user',
      async () => {
        const currentUser = await this.requireAuth();
        
        // Users can only update their own profile unless they're admin
        if (currentUser.id !== userId) {
          const currentUserProfile = await this.getUserProfile(currentUser.id);
          if (currentUserProfile.role !== 'admin') {
            throw new Error('You can only update your own profile');
          }
        }

        if (updates.role) {
          this.validateUserRoleAssignment(updates.role, updates.station_id, updates.omc_id, updates.dealer_id);
        }

        const { data: user, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select(`
            *,
            stations (id, name, code),
            omcs (id, name, code),
            dealers (id, name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to update user: ${error.message}`);
        }

        await this.logActivity('user_updated', { user_id: userId, updates: Object.keys(updates) });

        return user as User;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.handleRequest(
      'delete_user',
      async () => {
        const currentUser = await this.requireAuth();
        
        // Prevent self-deletion
        if (currentUser.id === userId) {
          throw new Error('You cannot delete your own account');
        }

        // Check for dependencies
        const dependencies = await this.checkUserDependencies(userId);
        if (dependencies.length > 0) {
          throw new Error(`Cannot delete user. User is referenced in: ${dependencies.join(', ')}`);
        }

        // Soft delete
        const { error } = await supabase
          .from('profiles')
          .update({
            status: 'inactive',
            is_active: false,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          throw new Error(`Failed to delete user: ${error.message}`);
        }

        await this.logActivity('user_deleted', { user_id: userId });

        return { message: 'User deleted successfully' };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.handleRequest(
      'get_user_stats',
      async () => {
        await this.requireAuth();

        // Get total counts
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get counts by role
        const { data: roleData } = await supabase
          .from('profiles')
          .select('role, is_active');

        const byRole = roleData?.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const byStatus = {
          active: roleData?.filter(u => u.is_active).length || 0,
          inactive: roleData?.filter(u => !u.is_active).length || 0
        };

        // Recent signups (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: recentSignups } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());

        return {
          total_users: totalUsers || 0,
          by_role: byRole,
          by_status: byStatus,
          recent_signups: recentSignups || 0
        };
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private canManageUsers(currentUserRole: UserRole, targetUserRole?: UserRole): boolean {
    if (currentUserRole === 'admin') return true;
    
    if (targetUserRole) {
      const allowedRoles = ROLE_HIERARCHY[currentUserRole as keyof typeof ROLE_HIERARCHY] || [];
      return allowedRoles.includes(targetUserRole);
    }
    
    return false;
  }

  private validateUserRoleAssignment(role: UserRole, station_id?: string | null, omc_id?: string | null, dealer_id?: string | null): void {
    switch (role) {
      case 'station_manager':
      case 'attendant':
        if (!station_id) {
          throw new Error(`${this.formatRole(role)} must be assigned to a station`);
        }
        break;
      case 'omc':
        if (!omc_id) {
          throw new Error('OMC user must be assigned to an OMC');
        }
        break;
      case 'dealer':
        if (!dealer_id) {
          throw new Error('Dealer must be assigned to a dealer');
        }
        break;
    }
  }

  private async checkUserDependencies(userId: string): Promise<string[]> {
    const dependencies: string[] = [];

    // Check if user is manager of any stations
    const { data: managedStations } = await supabase
      .from('stations')
      .select('id')
      .eq('manager_id', userId)
      .limit(1);

    if (managedStations && managedStations.length > 0) {
      dependencies.push('station management');
    }

    // Check if user has created any violations
    const { data: violations } = await supabase
      .from('compliance_violations')
      .select('id')
      .eq('reported_by', userId)
      .limit(1);

    if (violations && violations.length > 0) {
      dependencies.push('violation reports');
    }

    return dependencies;
  }

  private formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  }
}