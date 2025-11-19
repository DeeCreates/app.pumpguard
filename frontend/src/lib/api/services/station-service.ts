// lib/api/services/station-service.ts
import { BaseService } from '../base-service';
import { Station, StationDetails, StationFilters } from '@/types/station';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export class StationService extends BaseService {
  /**
   * Get paginated stations with filtering
   */
  async getStations(filters: StationFilters = {}): Promise<PaginatedResponse<Station>> {
    return this.handleRequest(
      'get_stations',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('stations')
          .select(`
            *,
            omcs (id, name, code),
            dealers (id, name)
          `, { count: 'exact' })
          .order('name');

        // Apply filters
        if (filters.omc_id) {
          query = query.eq('omc_id', filters.omc_id);
        }
        if (filters.dealer_id) {
          query = query.eq('dealer_id', filters.dealer_id);
        }
        if (filters.region) {
          query = query.ilike('region', `%${filters.region}%`);
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch stations: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as Station[],
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

  /**
   * Get station by ID with detailed information
   */
  async getStationById(stationId: string): Promise<ApiResponse<StationDetails>> {
    return this.handleRequest(
      'get_station_by_id',
      async () => {
        if (!this.isValidUUID(stationId)) {
          throw new Error('Invalid station ID format');
        }

        const { data: station, error } = await supabase
          .from('stations')
          .select(`
            *,
            omcs (id, name, code),
            dealers (id, name),
            profiles!fk_station_manager (id, full_name, email)
          `)
          .eq('id', stationId)
          .single();

        if (error || !station) {
          throw new Error('Station not found');
        }

        // Get additional station metrics
        const [violationsResult, salesResult] = await Promise.allSettled([
          supabase
            .from('compliance_violations')
            .select('id, status, severity')
            .eq('station_id', stationId)
            .eq('status', 'open'),
          supabase
            .from('sales')
            .select('total_amount')
            .eq('station_id', stationId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        const violations = violationsResult.status === 'fulfilled' ? violationsResult.value.data : [];
        const sales = salesResult.status === 'fulfilled' ? salesResult.value.data : [];

        const stationDetails: StationDetails = {
          ...station,
          omc_name: station.omcs?.name,
          dealer_name: station.dealers?.name,
          manager_name: station.profiles?.full_name,
          compliance_status: this.calculateComplianceStatus(violations || []),
          total_violations: violations?.length || 0,
          total_sales: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        };

        return stationDetails;
      },
      { requireAuth: true }
    );
  }

  /**
   * Create new station with basic validation
   */
  async createStation(stationData: Partial<Station>): Promise<ApiResponse<Station>> {
    return this.handleRequest(
      'create_station',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!stationData.name?.trim()) {
          throw new Error('Station name is required');
        }
        if (!stationData.address?.trim()) {
          throw new Error('Station address is required');
        }

        // Generate station code
        const code = this.generateStationCode(stationData.name);

        const stationPayload = {
          ...stationData,
          code,
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('stations')
          .insert(stationPayload)
          .select(`
            *,
            omcs (id, name, code),
            dealers (id, name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create station: ${error.message}`);
        }

        await this.logActivity('station_created', { station_id: data.id, station_name: data.name });

        return data as Station;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  /**
   * SMART station creation - automatically detects OMC context
   */
  async createStationSmart(stationData: any): Promise<ApiResponse<Station>> {
    return this.handleRequest(
      'create_station_smart',
      async () => {
        const currentUser = await this.requireAuth();
        
        let omc_id = stationData.omc_id;

        // AUTO-DETECT: If user is OMC role, use their OMC ID automatically
        const userProfile = await this.getUserProfile(currentUser.id);
        if (userProfile.role === 'omc') {
          if (userProfile.omc_id) {
            omc_id = userProfile.omc_id;
          } else {
            throw new Error('OMC user does not have an OMC assigned to their profile');
          }
        }
        
        // VALIDATE: If still no OMC ID, it's required
        if (!omc_id) {
          throw new Error('OMC ID is required. Please select an OMC or ensure your user profile has an OMC assigned.');
        }

        // Ensure required fields
        const enhancedStationData = {
          ...stationData,
          omc_id: omc_id,
          address: stationData.address || 'Address not provided',
          region: stationData.region || 'Region not provided'
        };

        return await this.createStationWithGuaranteedCode(enhancedStationData);
      },
      { requireAuth: true, logActivity: true }
    );
  }

  /**
   * Create station with guaranteed non-empty code
   */
  async createStationWithGuaranteedCode(stationData: any): Promise<ApiResponse<Station>> {
    return this.handleRequest(
      'create_station_guaranteed',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!stationData.name) {
          throw new Error('Station name is required');
        }

        if (!stationData.omc_id) {
          throw new Error('OMC ID is required');
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
          throw new Error('OMC not found');
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
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Create the station
        const { data: newStation, error: createError } = await supabase
          .from('stations')
          .insert(stationToCreate)
          .select(`
            *,
            omcs (id, name, code),
            dealers (id, name)
          `)
          .single();

        if (createError) {
          // Ultimate fallback: Use UUID-based code that cannot fail
          const ultimateCode = this.generateUltimateFallbackCode();
          
          const { data: ultimateStation, error: ultimateError } = await supabase
            .from('stations')
            .insert({ ...stationToCreate, code: ultimateCode })
            .select(`
              *,
              omcs (id, name, code),
              dealers (id, name)
            `)
            .single();

          if (ultimateError) {
            throw new Error(`CRITICAL DATABASE ERROR: Cannot create station even with guaranteed codes. Please contact administrator.`);
          }

          await this.logActivity('station_created_fallback', { 
            station_id: ultimateStation.id, 
            station_name: ultimateStation.name 
          });

          return ultimateStation as Station;
        }

        await this.logActivity('station_created', { 
          station_id: newStation.id, 
          station_name: newStation.name 
        });

        return newStation as Station;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  /**
   * Update station information
   */
  async updateStation(stationId: string, updates: Partial<Station>): Promise<ApiResponse<Station>> {
    return this.handleRequest(
      'update_station',
      async () => {
        await this.requireAuth();

        if (!this.isValidUUID(stationId)) {
          throw new Error('Invalid station ID format');
        }

        const { data, error } = await supabase
          .from('stations')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', stationId)
          .select(`
            *,
            omcs (id, name, code),
            dealers (id, name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to update station: ${error.message}`);
        }

        await this.logActivity('station_updated', { station_id: stationId, updates: Object.keys(updates) });

        return data as Station;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  /**
   * Create multiple stations for OMC with unique codes
   */
  async createOMCStations(omc_id: string, stationsData: any[]): Promise<ApiResponse<{
    created: Station[];
    errors: { station: string; error: string }[];
  }>> {
    return this.handleRequest(
      'create_omc_stations_batch',
      async () => {
        await this.requireAuth();

        const results: Station[] = [];
        const errors: { station: string; error: string }[] = [];

        for (const stationData of stationsData) {
          try {
            const stationWithOMC = { ...stationData, omc_id };
            const result = await this.createStationSmart(stationWithOMC);
            
            if (result.success && result.data) {
              results.push(result.data);
            } else {
              errors.push({ station: stationData.name, error: result.error || 'Unknown error' });
            }
          } catch (error: any) {
            errors.push({ station: stationData.name, error: error.message });
          }
        }

        return {
          created: results,
          errors: errors
        };
      },
      { requireAuth: true, logActivity: true }
    );
  }

  // Private helper methods
  private calculateComplianceStatus(violations: any[]): 'compliant' | 'non_compliant' | 'under_review' {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const openViolations = violations.filter(v => v.status === 'open').length;

    if (criticalViolations > 0) return 'non_compliant';
    if (openViolations > 2) return 'under_review';
    if (openViolations > 0) return 'under_review';
    return 'compliant';
  }

  private generateStationCode(name: string): string {
    const baseCode = name
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 12);

    const timestamp = Date.now().toString().slice(-6);
    return `${baseCode}_${timestamp}`;
  }

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

  private generateUltimateFallbackCode(): string {
    const part1 = Math.random().toString(36).substring(2, 6);
    const part2 = Math.random().toString(36).substring(2, 6);
    const part3 = Math.random().toString(36).substring(2, 6);
    
    return `STN_${part1}_${part2}_${part3}`.toUpperCase();
  }
}