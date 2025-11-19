import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export interface Violation {
  id: string;
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  fine_amount: number;
  violation_date: string;
  reported_by: string;
  status: 'open' | 'appealed' | 'under_review' | 'resolved' | 'cancelled';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_url?: string;
  notes?: string;
  appeal_reason?: string;
  appeal_submitted_at?: string;
  appeal_submitted_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ViolationCreateData {
  station_id: string;
  product_id: string;
  actual_price: number;
  price_cap: number;
  litres_sold: number;
  violation_date: string;
  reported_by: string;
  evidence_url?: string;
  notes?: string;
}

export interface ViolationFilters {
  page?: number;
  limit?: number;
  station_id?: string;
  omc_id?: string;
  status?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  product_id?: string;
}

export class ViolationService extends BaseService {
  async getViolations(filters: ViolationFilters = {}): Promise<PaginatedResponse<Violation>> {
    return this.handleRequest(
      'get_violations',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('compliance_violations')
          .select(`
            *,
            stations (name, omcs(name)),
            products (name, unit),
            profiles (full_name)
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.severity) {
          query = query.eq('severity', filters.severity);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }
        if (filters.start_date) {
          query = query.gte('violation_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('violation_date', filters.end_date);
        }

        // Apply OMC filter through station relationship
        if (filters.omc_id) {
          const { data: stationIds } = await supabase
            .from('stations')
            .select('id')
            .eq('omc_id', filters.omc_id);

          if (stationIds && stationIds.length > 0) {
            query = query.in('station_id', stationIds.map(s => s.id));
          }
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch violations: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as Violation[],
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

  async getViolationById(violationId: string): Promise<ApiResponse<Violation>> {
    return this.handleRequest(
      'get_violation_by_id',
      async () => {
        if (!this.isValidUUID(violationId)) {
          throw new Error('Invalid violation ID format');
        }

        const { data: violation, error } = await supabase
          .from('compliance_violations')
          .select(`
            *,
            stations (name, omcs(name)),
            products (name, unit),
            profiles (full_name)
          `)
          .eq('id', violationId)
          .single();

        if (error || !violation) {
          throw new Error('Violation not found');
        }

        return violation as Violation;
      },
      { requireAuth: true }
    );
  }

  async createViolation(violationData: ViolationCreateData): Promise<ApiResponse<Violation>> {
    return this.handleRequest(
      'create_violation',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!violationData.station_id || !violationData.product_id) {
          throw new Error('Station and product are required');
        }

        // Calculate fine and severity
        const fineAmount = this.calculateFine(
          violationData.actual_price,
          violationData.price_cap,
          violationData.litres_sold
        );

        const severity = this.calculateSeverity(
          violationData.actual_price,
          violationData.price_cap,
          violationData.litres_sold
        );

        const violationPayload = {
          ...violationData,
          fine_amount: fineAmount,
          severity,
          status: 'open',
          reported_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('compliance_violations')
          .insert(violationPayload)
          .select(`
            *,
            stations (name, omcs(name)),
            products (name, unit)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create violation: ${error.message}`);
        }

        // Log violation activity
        await this.logViolationActivity(violationData.station_id, 'violation_created', {
          violation_id: data.id,
          severity,
          fine_amount: fineAmount
        });

        await this.logActivity('violation_created', { 
          violation_id: data.id, 
          station_id: violationData.station_id 
        });

        return data as Violation;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async appealViolation(violationId: string, appealData: {
    reason: string;
    evidence_urls?: string[];
    contact_info?: {
      name: string;
      phone: string;
      email: string;
    };
  }): Promise<ApiResponse<Violation>> {
    return this.handleRequest(
      'appeal_violation',
      async () => {
        const user = await this.requireAuth();

        // Check if user can appeal this violation
        const canAppeal = await this.canAppealViolation(violationId, user.id);
        if (!canAppeal) {
          throw new Error('You do not have permission to appeal this violation');
        }

        const updateData: any = {
          status: 'appealed',
          appeal_reason: appealData.reason,
          appeal_submitted_at: new Date().toISOString(),
          appeal_submitted_by: user.id,
          updated_at: new Date().toISOString()
        };

        if (appealData.evidence_urls && appealData.evidence_urls.length > 0) {
          updateData.appeal_evidence_urls = appealData.evidence_urls;
        }

        if (appealData.contact_info) {
          updateData.appeal_contact_person = appealData.contact_info.name;
          updateData.appeal_contact_phone = appealData.contact_info.phone;
          updateData.appeal_contact_email = appealData.contact_info.email;
        }

        const { data, error } = await supabase
          .from('compliance_violations')
          .update(updateData)
          .eq('id', violationId)
          .select(`
            *,
            stations (name, omcs(name)),
            products (name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to submit appeal: ${error.message}`);
        }

        await this.logViolationActivity(violationId, 'appeal_submitted', {
          reason: appealData.reason,
          evidence_count: appealData.evidence_urls?.length || 0
        });

        await this.logActivity('violation_appealed', { violation_id: violationId });

        return data as Violation;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async resolveViolation(violationId: string, resolutionData: {
    resolution: string;
    final_fine_amount?: number;
    notes?: string;
  }): Promise<ApiResponse<Violation>> {
    return this.handleRequest(
      'resolve_violation',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Check if user can resolve violations
        if (!['admin', 'npa', 'supervisor'].includes(userProfile.role)) {
          throw new Error('You do not have permission to resolve violations');
        }

        const updateData: any = {
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionData.notes,
          updated_at: new Date().toISOString()
        };

        if (resolutionData.final_fine_amount !== undefined) {
          updateData.fine_amount = resolutionData.final_fine_amount;
        }

        const { data, error } = await supabase
          .from('compliance_violations')
          .update(updateData)
          .eq('id', violationId)
          .select(`
            *,
            stations (name, omcs(name)),
            products (name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to resolve violation: ${error.message}`);
        }

        await this.logViolationActivity(violationId, 'violation_resolved', {
          resolution: resolutionData.resolution,
          final_fine: resolutionData.final_fine_amount
        });

        await this.logActivity('violation_resolved', { violation_id: violationId });

        return data as Violation;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getViolationStats(filters: {
    station_id?: string;
    omc_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<ApiResponse<any>> {
    return this.handleRequest(
      'get_violation_stats',
      async () => {
        await this.requireAuth();

        let query = supabase.from('compliance_violations').select('*');

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.start_date) {
          query = query.gte('violation_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('violation_date', filters.end_date);
        }

        // Apply OMC filter
        if (filters.omc_id) {
          const { data: stationIds } = await supabase
            .from('stations')
            .select('id')
            .eq('omc_id', filters.omc_id);

          if (stationIds && stationIds.length > 0) {
            query = query.in('station_id', stationIds.map(s => s.id));
          }
        }

        const { data: violations, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch violation statistics: ${error.message}`);
        }

        const stats = {
          total_violations: violations?.length || 0,
          open_cases: violations?.filter(v => v.status === 'open').length || 0,
          appealed_cases: violations?.filter(v => v.status === 'appealed').length || 0,
          resolved_cases: violations?.filter(v => v.status === 'resolved').length || 0,
          total_fines: violations?.reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0,
          collected_fines: violations
            ?.filter(v => v.status === 'resolved')
            .reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0,
          by_severity: {
            critical: violations?.filter(v => v.severity === 'critical').length || 0,
            high: violations?.filter(v => v.severity === 'high').length || 0,
            medium: violations?.filter(v => v.severity === 'medium').length || 0,
            low: violations?.filter(v => v.severity === 'low').length || 0,
          }
        };

        return stats;
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private calculateFine(actualPrice: number, priceCap: number, litresSold: number): number {
    const priceDifference = actualPrice - priceCap;
    const percentageOver = (priceDifference / priceCap) * 100;
    
    let fine = priceDifference * litresSold * 0.1;
    
    // Severity multipliers
    if (percentageOver > 20) {
      fine *= 2;
    } else if (percentageOver > 15) {
      fine *= 1.5;
    } else if (percentageOver > 10) {
      fine *= 1.25;
    }
    
    return Math.max(fine, 50);
  }

  private calculateSeverity(actualPrice: number, priceCap: number, litresSold: number): 'low' | 'medium' | 'high' | 'critical' {
    const priceDifference = actualPrice - priceCap;
    const percentageOver = (priceDifference / priceCap) * 100;
    const totalOvercharge = priceDifference * litresSold;

    if (percentageOver > 20 || totalOvercharge > 5000) return 'critical';
    if (percentageOver > 15 || totalOvercharge > 2000) return 'high';
    if (percentageOver > 10 || totalOvercharge > 1000) return 'medium';
    return 'low';
  }

  private async canAppealViolation(violationId: string, userId: string): Promise<boolean> {
    // Get violation details
    const { data: violation } = await supabase
      .from('compliance_violations')
      .select('station_id, stations(omc_id), status')
      .eq('id', violationId)
      .single();

    if (!violation || violation.status === 'resolved') {
      return false;
    }

    // Get user profile
    const userProfile = await this.getUserProfile(userId);

    // Check permissions based on role
    switch (userProfile.role) {
      case 'admin':
      case 'npa':
      case 'supervisor':
        return true;
      
      case 'omc':
        return userProfile.omc_id === violation.stations?.omc_id;
      
      case 'dealer':
        const { data: dealerStations } = await supabase
          .from('stations')
          .select('id')
          .eq('dealer_id', userProfile.dealer_id);
        
        return dealerStations?.some(station => station.id === violation.station_id) || false;
      
      case 'station_manager':
        return userProfile.station_id === violation.station_id;
      
      default:
        return false;
    }
  }

  private async logViolationActivity(violationId: string, action: string, details: any = {}): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('violation_activities')
        .insert({
          violation_id: violationId,
          action,
          description: `${action}: ${JSON.stringify(details)}`,
          performed_by: user.id,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log violation activity:', error);
    }
  }
}