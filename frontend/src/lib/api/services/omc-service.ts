import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export interface OMC {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OMCCreateData {
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  logo_url?: string;
  brand_color?: string;
}

export interface OMCFilters {
  page?: number;
  limit?: number;
  search?: string;
  region?: string;
  is_active?: boolean;
}

export class OMCService extends BaseService {
  async getOMCs(filters: OMCFilters = {}): Promise<PaginatedResponse<OMC>> {
    return this.handleRequest(
      'get_omcs',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('omcs')
          .select('*', { count: 'exact' })
          .order('name');

        // Apply filters
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters.region) {
          query = query.eq('region', filters.region);
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch OMCs: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as OMC[],
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

  async getOMCById(omcId: string): Promise<ApiResponse<OMC>> {
    return this.handleRequest(
      'get_omc_by_id',
      async () => {
        if (!this.isValidUUID(omcId)) {
          throw new Error('Invalid OMC ID format');
        }

        const { data: omc, error } = await supabase
          .from('omcs')
          .select('*')
          .eq('id', omcId)
          .single();

        if (error || !omc) {
          throw new Error('OMC not found');
        }

        return omc as OMC;
      },
      { requireAuth: true }
    );
  }

  async createOMC(omcData: OMCCreateData): Promise<ApiResponse<OMC>> {
    return this.handleRequest(
      'create_omc',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Only admin can create OMCs
        if (userProfile.role !== 'admin') {
          throw new Error('Only administrators can create OMCs');
        }

        // Validate required fields
        if (!omcData.name?.trim()) {
          throw new Error('OMC name is required');
        }

        const omcPayload = {
          ...omcData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('omcs')
          .insert(omcPayload)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create OMC: ${error.message}`);
        }

        await this.logActivity('omc_created', { 
          omc_id: data.id, 
          omc_name: data.name 
        });

        return data as OMC;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async updateOMC(omcId: string, updates: Partial<OMCCreateData>): Promise<ApiResponse<OMC>> {
    return this.handleRequest(
      'update_omc',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Only admin can update OMCs
        if (userProfile.role !== 'admin') {
          throw new Error('Only administrators can update OMCs');
        }

        if (!this.isValidUUID(omcId)) {
          throw new Error('Invalid OMC ID format');
        }

        const { data, error } = await supabase
          .from('omcs')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', omcId)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update OMC: ${error.message}`);
        }

        await this.logActivity('omc_updated', { 
          omc_id: omcId, 
          updates: Object.keys(updates) 
        });

        return data as OMC;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async deleteOMC(omcId: string): Promise<ApiResponse> {
    return this.handleRequest(
      'delete_omc',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Only admin can delete OMCs
        if (userProfile.role !== 'admin') {
          throw new Error('Only administrators can delete OMCs');
        }

        // Check for dependencies
        const dependencies = await this.checkOMCDependencies(omcId);
        if (dependencies.length > 0) {
          throw new Error(`Cannot delete OMC. It has: ${dependencies.join(', ')}`);
        }

        // Soft delete
        const { error } = await supabase
          .from('omcs')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
            deleted_at: new Date().toISOString()
          })
          .eq('id', omcId);

        if (error) {
          throw new Error(`Failed to delete OMC: ${error.message}`);
        }

        await this.logActivity('omc_deleted', { omc_id: omcId });

        return { message: 'OMC deleted successfully' };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getOMCDashboard(omcId: string): Promise<ApiResponse<any>> {
    return this.handleRequest(
      'get_omc_dashboard',
      async () => {
        await this.requireAuth();

        if (!this.isValidUUID(omcId)) {
          throw new Error('Invalid OMC ID format');
        }

        // Get OMC details
        const { data: omc, error: omcError } = await supabase
          .from('omcs')
          .select('*')
          .eq('id', omcId)
          .single();

        if (omcError || !omc) {
          throw new Error('OMC not found');
        }

        // Get all stations under this OMC
        const { data: stations, error: stationsError } = await supabase
          .from('stations')
          .select('*')
          .eq('omc_id', omcId);

        if (stationsError) {
          throw new Error(`Failed to fetch stations: ${stationsError.message}`);
        }

        // Get all dealers under this OMC
        const { data: dealers, error: dealersError } = await supabase
          .from('dealers')
          .select('*')
          .eq('omc_id', omcId);

        if (dealersError) {
          throw new Error(`Failed to fetch dealers: ${dealersError.message}`);
        }

        // Get user counts
        const stationIds = stations?.map(s => s.id) || [];
        const dealerIds = dealers?.map(d => d.id) || [];
        
        let users = [];
        if (stationIds.length > 0 || dealerIds.length > 0) {
          const { data: usersData } = await supabase
            .from('profiles')
            .select('role, station_id, dealer_id')
            .or(`station_id.in.(${stationIds.join(',')}),dealer_id.in.(${dealerIds.join(',')})`);

          users = usersData || [];
        }

        const dashboardData = {
          omc,
          stats: {
            stations: stations?.length || 0,
            dealers: dealers?.length || 0,
            station_managers: users?.filter(u => u.role === 'station_manager').length || 0,
            attendants: users?.filter(u => u.role === 'attendant').length || 0,
          },
          stations,
          dealers
        };

        return dashboardData;
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private async checkOMCDependencies(omcId: string): Promise<string[]> {
    const dependencies: string[] = [];

    // Check for active stations
    const { data: stations } = await supabase
      .from('stations')
      .select('id')
      .eq('omc_id', omcId)
      .eq('status', 'active')
      .limit(1);

    if (stations && stations.length > 0) {
      dependencies.push('active stations');
    }

    // Check for active dealers
    const { data: dealers } = await supabase
      .from('dealers')
      .select('id')
      .eq('omc_id', omcId)
      .eq('is_active', true)
      .limit(1);

    if (dealers && dealers.length > 0) {
      dependencies.push('active dealers');
    }

    // Check for OMC users
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('omc_id', omcId)
      .eq('is_active', true)
      .limit(1);

    if (users && users.length > 0) {
      dependencies.push('active users');
    }

    return dependencies;
  }
}