import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export interface StationPrice {
  id: string;
  station_id: string;
  product_id: string;
  selling_price: number;
  effective_date: string;
  omc_user_id: string;
  status: 'active' | 'pending' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface PriceCap {
  id: string;
  product_id: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SetPriceRequest {
  stationId: string;
  productId: string;
  sellingPrice: number;
  effectiveDate: string;
  changeReason: string;
}

export interface PriceCapCreateData {
  product_id: string;
  price_cap: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
}

export interface PriceFilters {
  station_id?: string;
  product_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  omc_id?: string;
}

export class PriceService extends BaseService {
  async setStationPrice(priceData: SetPriceRequest): Promise<ApiResponse<StationPrice>> {
    return this.handleRequest(
      'set_station_price',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Only OMC users and admin can set prices
        if (!['admin', 'omc'].includes(userProfile.role)) {
          throw new Error('You do not have permission to set station prices');
        }

        // OMC users can only set prices for their stations
        if (userProfile.role === 'omc') {
          const canManage = await this.canManageStation(userProfile, priceData.stationId);
          if (!canManage) {
            throw new Error('You can only set prices for your OMC stations');
          }
        }

        // Get current price cap for validation
        const currentPriceCap = await this.getCurrentPriceCap(priceData.productId);
        if (currentPriceCap && priceData.sellingPrice > currentPriceCap.price_cap) {
          throw new Error(`Selling price (${priceData.sellingPrice}) exceeds current price cap (${currentPriceCap.price_cap})`);
        }

        // Get current active price for history
        const { data: currentPrice } = await supabase
          .from('station_prices')
          .select('selling_price')
          .eq('station_id', priceData.stationId)
          .eq('product_id', priceData.productId)
          .eq('status', 'active')
          .single();

        // Deactivate current active price
        if (currentPrice) {
          await supabase
            .from('station_prices')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('station_id', priceData.stationId)
            .eq('product_id', priceData.productId)
            .eq('status', 'active');
        }

        // Create new price record
        const { data, error } = await supabase
          .from('station_prices')
          .insert({
            station_id: priceData.stationId,
            product_id: priceData.productId,
            selling_price: priceData.sellingPrice,
            effective_date: priceData.effectiveDate,
            omc_user_id: user.id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select(`
            *,
            stations (name),
            products (name, unit)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to set station price: ${error.message}`);
        }

        // Create pricing history record
        await this.createPricingHistory({
          station_id: priceData.stationId,
          product_id: priceData.productId,
          previous_price: currentPrice?.selling_price || null,
          new_price: priceData.sellingPrice,
          price_cap_at_time: currentPriceCap?.price_cap || 0,
          changed_by_user_id: user.id,
          change_reason: priceData.changeReason
        });

        await this.logActivity('price_set', { 
          station_id: priceData.stationId,
          product_id: priceData.productId,
          new_price: priceData.sellingPrice 
        });

        return data as StationPrice;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getStationPrices(filters: PriceFilters = {}): Promise<PaginatedResponse<StationPrice>> {
    return this.handleRequest(
      'get_station_prices',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('station_prices')
          .select(`
            *,
            stations (name, omc_id),
            products (name, unit)
          `, { count: 'exact' })
          .order('effective_date', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.start_date) {
          query = query.gte('effective_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('effective_date', filters.end_date);
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

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch station prices: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as StationPrice[],
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

  async setPriceCap(priceCapData: PriceCapCreateData): Promise<ApiResponse<PriceCap>> {
    return this.handleRequest(
      'set_price_cap',
      async () => {
        const user = await this.requireAuth();
        const userProfile = await this.getUserProfile(user.id);

        // Only admin and NPA can set price caps
        if (!['admin', 'npa'].includes(userProfile.role)) {
          throw new Error('You do not have permission to set price caps');
        }

        const { data, error } = await supabase
          .from('price_caps')
          .insert({
            product_id: priceCapData.product_id,
            cap_price: priceCapData.price_cap,
            effective_from: priceCapData.effective_date,
            effective_to: priceCapData.end_date || null,
            notes: priceCapData.notes || null,
            created_by: user.id,
            created_at: new Date().toISOString()
          })
          .select('*, products(name)')
          .single();

        if (error) {
          throw new Error(`Failed to set price cap: ${error.message}`);
        }

        await this.logActivity('price_cap_set', { 
          product_id: priceCapData.product_id,
          price_cap: priceCapData.price_cap 
        });

        return data as PriceCap;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getPriceCaps(): Promise<ApiResponse<PriceCap[]>> {
    return this.handleRequest(
      'get_price_caps',
      async () => {
        const { data, error } = await supabase
          .from('price_caps')
          .select(`
            *,
            products!inner (name, unit, code)
          `)
          .order('effective_from', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch price caps: ${error.message}`);
        }

        const mappedData = data?.map(cap => ({
          id: cap.id,
          product_id: cap.product_id,
          product_name: cap.products?.name || 'Unknown Product',
          price_cap: cap.cap_price,
          effective_date: cap.effective_from,
          end_date: cap.effective_to,
          status: this.calculatePriceCapStatus(cap.effective_from, cap.effective_to),
          notes: cap.notes,
          created_by: cap.created_by,
          created_at: cap.created_at,
          updated_at: cap.updated_at
        })) || [];

        return mappedData;
      },
      { requireAuth: true }
    );
  }

  async getCurrentPriceCaps(): Promise<ApiResponse<PriceCap[]>> {
    return this.handleRequest(
      'get_current_price_caps',
      async () => {
        const currentDate = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('price_caps')
          .select('*, products(name, unit)')
          .lte('effective_from', currentDate)
          .order('effective_from', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch current price caps: ${error.message}`);
        }

        // Get the most recent price cap for each product
        const currentCaps = data?.reduce((acc: any[], cap) => {
          if (!acc.find(item => item.product_id === cap.product_id)) {
            acc.push(cap);
          }
          return acc;
        }, []);

        return currentCaps || [];
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private async getCurrentPriceCap(productId: string): Promise<PriceCap | null> {
    const currentDate = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('price_caps')
      .select('*')
      .eq('product_id', productId)
      .lte('effective_from', currentDate)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    return data as PriceCap | null;
  }

  private async createPricingHistory(historyData: {
    station_id: string;
    product_id: string;
    previous_price: number | null;
    new_price: number;
    price_cap_at_time: number;
    changed_by_user_id: string;
    change_reason: string;
  }): Promise<void> {
    await supabase
      .from('pricing_history')
      .insert({
        ...historyData,
        created_at: new Date().toISOString()
      });
  }

  private calculatePriceCapStatus(effectiveFrom: string, effectiveTo?: string): 'active' | 'expired' | 'pending' {
    const today = new Date().toISOString().split('T')[0];
    const effectiveDate = new Date(effectiveFrom).toISOString().split('T')[0];
    
    if (effectiveDate > today) return 'pending';
    if (effectiveTo && new Date(effectiveTo).toISOString().split('T')[0] < today) return 'expired';
    return 'active';
  }

  private async canManageStation(userProfile: any, stationId: string): Promise<boolean> {
    if (userProfile.role === 'admin') return true;

    if (userProfile.role === 'omc') {
      const { data: station } = await supabase
        .from('stations')
        .select('omc_id')
        .eq('id', stationId)
        .single();

      return station?.omc_id === userProfile.omc_id;
    }

    return false;
  }
}