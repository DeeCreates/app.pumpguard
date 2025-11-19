import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export interface TankStock {
  id: string;
  station_id: string;
  product_id: string;
  current_stock: number;
  capacity: number;
  minimum_threshold: number;
  last_delivery_date?: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  supplier: string;
  driver_name: string;
  vehicle_number?: string;
  delivery_date: string;
  received_by: string;
  notes?: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DailyTankStock {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries: number;
  sales: number;
  variance: number;
  stock_date: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  station_id?: string;
  product_id?: string;
  start_date?: string;
  end_date?: string;
}

export class InventoryService extends BaseService {
  async getTankStocks(filters: InventoryFilters = {}): Promise<PaginatedResponse<TankStock>> {
    return this.handleRequest(
      'get_tank_stocks',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('tank_stocks')
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `, { count: 'exact' })
          .order('last_updated', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch tank stocks: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as TankStock[],
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

  async getDailyStocks(filters: InventoryFilters = {}): Promise<PaginatedResponse<DailyTankStock>> {
    return this.handleRequest(
      'get_daily_stocks',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('daily_tank_stocks')
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `, { count: 'exact' })
          .order('stock_date', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }
        if (filters.start_date) {
          query = query.gte('stock_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('stock_date', filters.end_date);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch daily stocks: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as DailyTankStock[],
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

  async getDeliveries(filters: InventoryFilters = {}): Promise<PaginatedResponse<Delivery>> {
    return this.handleRequest(
      'get_deliveries',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('deliveries')
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `, { count: 'exact' })
          .order('delivery_date', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }
        if (filters.start_date) {
          query = query.gte('delivery_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('delivery_date', filters.end_date);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch deliveries: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as Delivery[],
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

  async createDelivery(deliveryData: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Delivery>> {
    return this.handleRequest(
      'create_delivery',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!deliveryData.station_id || !deliveryData.product_id || !deliveryData.quantity) {
          throw new Error('Station, product, and quantity are required');
        }

        const deliveryPayload = {
          ...deliveryData,
          received_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('deliveries')
          .insert(deliveryPayload)
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create delivery: ${error.message}`);
        }

        // Update tank stock
        await this.updateTankStockAfterDelivery(deliveryData.station_id, deliveryData.product_id, deliveryData.quantity);

        await this.logActivity('delivery_created', { 
          delivery_id: data.id, 
          station_id: deliveryData.station_id,
          quantity: deliveryData.quantity 
        });

        return data as Delivery;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async recordDailyStock(stockData: Omit<DailyTankStock, 'id' | 'created_at' | 'updated_at' | 'recorded_by'>): Promise<ApiResponse<DailyTankStock>> {
    return this.handleRequest(
      'record_daily_stock',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!stockData.station_id || !stockData.product_id || !stockData.stock_date) {
          throw new Error('Station, product, and stock date are required');
        }

        const stockPayload = {
          ...stockData,
          recorded_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('daily_tank_stocks')
          .insert(stockPayload)
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to record daily stock: ${error.message}`);
        }

        await this.logActivity('daily_stock_recorded', { 
          stock_id: data.id, 
          station_id: stockData.station_id,
          product_id: stockData.product_id 
        });

        return data as DailyTankStock;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getInventoryAlerts(stationId?: string): Promise<ApiResponse<any>> {
    return this.handleRequest(
      'get_inventory_alerts',
      async () => {
        await this.requireAuth();

        let query = supabase
          .from('tank_stocks')
          .select(`
            *,
            stations (name, code),
            products (name, unit)
          `)
          .lt('current_stock', supabase.raw('minimum_threshold'));

        if (stationId) {
          query = query.eq('station_id', stationId);
        }

        const { data: lowStock, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch inventory alerts: ${error.message}`);
        }

        const alerts = lowStock?.map(stock => ({
          id: stock.id,
          station_id: stock.station_id,
          station_name: stock.stations?.name,
          product_id: stock.product_id,
          product_name: stock.products?.name,
          current_stock: stock.current_stock,
          minimum_threshold: stock.minimum_threshold,
          deficit: stock.minimum_threshold - stock.current_stock,
          urgency: this.calculateStockUrgency(stock.current_stock, stock.minimum_threshold, stock.capacity)
        })) || [];

        return {
          low_stock_alerts: alerts,
          total_alerts: alerts.length,
          critical_alerts: alerts.filter(a => a.urgency === 'critical').length,
          warning_alerts: alerts.filter(a => a.urgency === 'warning').length
        };
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private async updateTankStockAfterDelivery(stationId: string, productId: string, quantity: number): Promise<void> {
    // Get current stock
    const { data: currentStock } = await supabase
      .from('tank_stocks')
      .select('current_stock')
      .eq('station_id', stationId)
      .eq('product_id', productId)
      .single();

    const newStock = (currentStock?.current_stock || 0) + quantity;

    // Update tank stock
    await supabase
      .from('tank_stocks')
      .update({
        current_stock: newStock,
        last_delivery_date: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .eq('station_id', stationId)
      .eq('product_id', productId);
  }

  private calculateStockUrgency(currentStock: number, minimumThreshold: number, capacity: number): 'critical' | 'warning' | 'normal' {
    const percentage = (currentStock / capacity) * 100;
    const thresholdPercentage = (minimumThreshold / capacity) * 100;

    if (currentStock < minimumThreshold) return 'critical';
    if (percentage < thresholdPercentage + 10) return 'warning';
    return 'normal';
  }
}