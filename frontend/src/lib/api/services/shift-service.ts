import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export type ShiftStatus = 'active' | 'closed' | 'pending_reconciliation' | 'cancelled';
export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'premium_petrol';

export interface Shift {
  id: string;
  station_id: string;
  user_id: string;
  pump_id: string;
  fuel_type: FuelType;
  price_per_liter: number;
  start_time: string;
  end_time?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  opening_meter: number;
  closing_meter?: number;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  discrepancy?: number;
  total_sales?: number;
  total_volume?: number;
  efficiency_rate?: number;
  status: ShiftStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ShiftActivity {
  id: string;
  shift_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
  user_id?: string;
  metadata?: any;
}

export interface CreateShiftRequest {
  station_id: string;
  user_id: string;
  pump_id: string;
  fuel_type: FuelType;
  price_per_liter: number;
  opening_meter: number;
  opening_cash: number;
  scheduled_start?: string;
  scheduled_end?: string;
  notes?: string;
}

export interface EndShiftRequest {
  closing_meter: number;
  closing_cash: number;
  notes?: string;
}

export interface ShiftFilters {
  station_id?: string;
  user_id?: string;
  status?: ShiftStatus | 'all';
  start_date?: string;
  end_date?: string;
  pump_id?: string;
  page?: number;
  limit?: number;
}

export interface ShiftStats {
  total_shifts: number;
  active_shifts: number;
  pending_reconciliation: number;
  today_volume: number;
  today_revenue: number;
  average_efficiency: number;
  by_status: Record<ShiftStatus, number>;
  weekly_trend: { date: string; shifts: number; volume: number; revenue: number }[];
}

export interface ShiftsResponse {
  shifts: Shift[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: ShiftFilters;
  stats: ShiftStats;
}

export class ShiftService extends BaseService {
  async getShifts(filters: ShiftFilters = {}): Promise<ApiResponse<ShiftsResponse>> {
    return this.handleRequest(
      'get_shifts',
      async () => {
        const user = await this.requireAuth();
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('shifts')
          .select(`
            *,
            user:profiles!shifts_user_id_fkey (full_name, email),
            station:stations (name, code),
            approver:profiles!shifts_approved_by_fkey (full_name)
          `, { count: 'exact' })
          .order('start_time', { ascending: false });

        // Apply role-based filtering
        const userProfile = await this.getUserProfile(user.id);
        if (userProfile.role === 'station_manager' && userProfile.station_id) {
          query = query.eq('station_id', userProfile.station_id);
        } else if (userProfile.role === 'attendant') {
          query = query.eq('user_id', user.id);
        }

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.user_id) {
          query = query.eq('user_id', filters.user_id);
        }
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters.pump_id) {
          query = query.eq('pump_id', filters.pump_id);
        }
        if (filters.start_date) {
          query = query.gte('start_time', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('start_time', filters.end_date);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: shifts, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch shifts: ${error.message}`);
        }

        // Get shift statistics
        const stats = await this.calculateShiftStats(filters.station_id);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        const response: ShiftsResponse = {
          shifts: shifts as Shift[],
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
          },
          filters,
          stats
        };

        await this.logActivity('shifts_viewed', undefined, {
          filters_applied: filters,
          shifts_count: shifts?.length || 0
        });

        return response;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async startShift(shiftData: CreateShiftRequest): Promise<ApiResponse<Shift>> {
    return this.handleRequest(
      'start_shift',
      async () => {
        const user = await this.requireAuth();

        // Check if user already has an active shift
        const { data: activeShift } = await supabase
          .from('shifts')
          .select('id')
          .eq('user_id', shiftData.user_id)
          .eq('status', 'active')
          .single();

        if (activeShift) {
          throw new Error('User already has an active shift');
        }

        const { data: newShift, error } = await supabase
          .from('shifts')
          .insert({
            ...shiftData,
            created_by: user.id,
            status: 'active',
            start_time: new Date().toISOString()
          })
          .select(`
            *,
            user:profiles!shifts_user_id_fkey (full_name, email),
            station:stations (name, code)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to start shift: ${error.message}`);
        }

        // Log shift activity
        await this.logShiftActivity(newShift.id, 'shift_started', {
          pump_id: shiftData.pump_id,
          fuel_type: shiftData.fuel_type,
          opening_meter: shiftData.opening_meter,
          opening_cash: shiftData.opening_cash
        });

        await this.logActivity('shift_started', undefined, {
          shift_id: newShift.id,
          pump_id: shiftData.pump_id,
          fuel_type: shiftData.fuel_type
        });

        return newShift as Shift;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async endShift(shiftId: string, endData: EndShiftRequest): Promise<ApiResponse<Shift>> {
    return this.handleRequest(
      'end_shift',
      async () => {
        const user = await this.requireAuth();

        // Get the current shift
        const { data: currentShift, error: fetchError } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', shiftId)
          .single();

        if (fetchError || !currentShift) {
          throw new Error('Shift not found');
        }

        if (currentShift.status !== 'active') {
          throw new Error('Shift is not active');
        }

        // Calculate shift metrics
        const volumeSold = endData.closing_meter - currentShift.opening_meter;
        const expectedCash = currentShift.opening_cash + (volumeSold * currentShift.price_per_liter);
        const discrepancy = endData.closing_cash - expectedCash;
        const totalSales = endData.closing_cash - currentShift.opening_cash;

        // Calculate efficiency (liters per hour)
        const startTime = new Date(currentShift.start_time);
        const endTime = new Date();
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const efficiencyRate = hoursWorked > 0 ? volumeSold / hoursWorked : 0;

        // Determine status based on discrepancy
        const status = Math.abs(discrepancy) > 50 ? 'pending_reconciliation' : 'closed';

        const { data: updatedShift, error } = await supabase
          .from('shifts')
          .update({
            end_time: endTime.toISOString(),
            closing_meter: endData.closing_meter,
            closing_cash: endData.closing_cash,
            expected_cash: expectedCash,
            discrepancy,
            total_sales: totalSales,
            total_volume: volumeSold,
            efficiency_rate: efficiencyRate,
            status,
            notes: endData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', shiftId)
          .select(`
            *,
            user:profiles!shifts_user_id_fkey (full_name, email),
            station:stations (name, code)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to end shift: ${error.message}`);
        }

        // Log shift activity
        await this.logShiftActivity(shiftId, 'shift_ended', {
          volume_sold: volumeSold,
          total_sales: totalSales,
          discrepancy,
          efficiency_rate: efficiencyRate,
          status
        });

        await this.logActivity('shift_ended', undefined, {
          shift_id: shiftId,
          status,
          volume_sold: volumeSold,
          total_sales: totalSales,
          discrepancy
        });

        return updatedShift as Shift;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getShiftActivities(shiftId: string): Promise<ApiResponse<ShiftActivity[]>> {
    return this.handleRequest(
      'get_shift_activities',
      async () => {
        await this.requireAuth();

        const { data: activities, error } = await supabase
          .from('shift_activities')
          .select(`
            *,
            user:profiles (full_name)
          `)
          .eq('shift_id', shiftId)
          .order('timestamp', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch shift activities: ${error.message}`);
        }

        return activities as ShiftActivity[];
      },
      { requireAuth: true }
    );
  }

  async getShiftStats(stationId?: string): Promise<ApiResponse<ShiftStats>> {
    return this.handleRequest(
      'get_shift_stats',
      async () => {
        const user = await this.requireAuth();
        
        let query = supabase.from('shifts').select('*');

        // Apply role-based filtering
        const userProfile = await this.getUserProfile(user.id);
        if (userProfile.role === 'station_manager' && userProfile.station_id) {
          query = query.eq('station_id', userProfile.station_id);
        } else if (userProfile.role === 'attendant') {
          query = query.eq('user_id', user.id);
        } else if (stationId) {
          query = query.eq('station_id', stationId);
        }

        const { data: shifts, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch shift statistics: ${error.message}`);
        }

        return this.calculateShiftStatsFromData(shifts || []);
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private async calculateShiftStats(stationId?: string): Promise<ShiftStats> {
    let query = supabase.from('shifts').select('*');

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data: shifts } = await query;
    return this.calculateShiftStatsFromData(shifts || []);
  }

  private calculateShiftStatsFromData(shifts: any[]): ShiftStats {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = shifts?.filter(s => s.start_time.startsWith(today)) || [];
    
    const total_shifts = shifts?.length || 0;
    const active_shifts = shifts?.filter(s => s.status === 'active').length || 0;
    const pending_reconciliation = shifts?.filter(s => s.status === 'pending_reconciliation').length || 0;
    
    const today_volume = todayShifts.reduce((sum, shift) => 
      sum + (shift.total_volume || 0), 0
    );
    
    const today_revenue = todayShifts.reduce((sum, shift) => 
      sum + (shift.total_sales || 0), 0
    );

    const completedShifts = shifts?.filter(s => s.status === 'closed') || [];
    const average_efficiency = completedShifts.length > 0 
      ? completedShifts.reduce((sum, shift) => sum + (shift.efficiency_rate || 0), 0) / completedShifts.length
      : 0;

    const by_status = shifts?.reduce((acc, shift) => {
      acc[shift.status] = (acc[shift.status] || 0) + 1;
      return acc;
    }, {} as Record<ShiftStatus, number>) || {} as Record<ShiftStatus, number>;

    // Weekly trend (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyData = shifts?.filter(s => 
      new Date(s.start_time) >= weekAgo
    ) || [];

    const weekly_trend = weeklyData.reduce((acc, shift) => {
      const date = shift.start_time.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, shifts: 0, volume: 0, revenue: 0 };
      }
      acc[date].shifts += 1;
      acc[date].volume += shift.total_volume || 0;
      acc[date].revenue += shift.total_sales || 0;
      return acc;
    }, {} as Record<string, { date: string; shifts: number; volume: number; revenue: number }>);

    return {
      total_shifts,
      active_shifts,
      pending_reconciliation,
      today_volume,
      today_revenue,
      average_efficiency,
      by_status,
      weekly_trend: Object.values(weekly_trend).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  private async logShiftActivity(shiftId: string, activityType: string, metadata: any = {}): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('shift_activities')
        .insert({
          shift_id: shiftId,
          activity_type,
          description: `${activityType}: ${JSON.stringify(metadata)}`,
          user_id: user.id,
          metadata,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log shift activity:', error);
    }
  }
}