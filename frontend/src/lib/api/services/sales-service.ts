import { BaseService } from '../base-service';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { validatePagination } from '../utils';
import { supabase } from '../../supabase';

export interface Sale {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  attendant_id?: string;
  shift_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaleCreateData {
  station_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount?: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  customer_type: 'retail' | 'commercial' | 'fleet';
  attendant_id?: string;
  shift_id?: string;
  notes?: string;
}

export interface SalesFilters {
  page?: number;
  limit?: number;
  station_id?: string;
  product_id?: string;
  payment_method?: string;
  customer_type?: string;
  start_date?: string;
  end_date?: string;
  attendant_id?: string;
  shift_id?: string;
  omc_id?: string;
}

export interface SalesSummary {
  total_sales: number;
  total_volume: number;
  average_transaction: number;
  growth_rate: number;
  transaction_count: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_sales: number;
    total_volume: number;
    percentage: number;
  }>;
  daily_trends: Array<{
    date: string;
    sales: number;
    volume: number;
    transactions: number;
  }>;
}

export class SalesService extends BaseService {
  async getSales(filters: SalesFilters = {}): Promise<PaginatedResponse<Sale>> {
    return this.handleRequest(
      'get_sales',
      async () => {
        const { page, limit } = validatePagination(filters.page, filters.limit);
        const offset = (page - 1) * limit;

        let query = supabase
          .from('sales')
          .select(`
            *,
            stations (name, code, omc_id, dealer_id),
            products (name, category, unit),
            profiles!sales_attendant_id_fkey (full_name)
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.station_id) {
          query = query.eq('station_id', filters.station_id);
        }
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id);
        }
        if (filters.payment_method) {
          query = query.eq('payment_method', filters.payment_method);
        }
        if (filters.customer_type) {
          query = query.eq('customer_type', filters.customer_type);
        }
        if (filters.attendant_id) {
          query = query.eq('attendant_id', filters.attendant_id);
        }
        if (filters.shift_id) {
          query = query.eq('shift_id', filters.shift_id);
        }
        if (filters.start_date) {
          query = query.gte('created_at', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('created_at', filters.end_date);
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
          throw new Error(`Failed to fetch sales: ${error.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data as Sale[],
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

  async createSale(saleData: SaleCreateData): Promise<ApiResponse<Sale>> {
    return this.handleRequest(
      'create_sale',
      async () => {
        const user = await this.requireAuth();

        // Validate required fields
        if (!saleData.station_id || !saleData.product_id || !saleData.quantity || !saleData.unit_price) {
          throw new Error('Station, product, quantity, and unit price are required');
        }

        // Calculate total amount if not provided
        const total_amount = saleData.total_amount || saleData.quantity * saleData.unit_price;

        const salePayload = {
          ...saleData,
          total_amount,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('sales')
          .insert(salePayload)
          .select(`
            *,
            stations (name, code),
            products (name, unit),
            profiles!sales_attendant_id_fkey (full_name)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create sale: ${error.message}`);
        }

        await this.logActivity('sale_created', { 
          sale_id: data.id, 
          station_id: saleData.station_id,
          total_amount 
        });

        return data as Sale;
      },
      { requireAuth: true, logActivity: true }
    );
  }

  async getSalesSummary(filters: SalesFilters = {}): Promise<ApiResponse<SalesSummary>> {
    return this.handleRequest(
      'get_sales_summary',
      async () => {
        // Get sales data with same filters
        const salesResponse = await this.getSales({ ...filters, limit: 10000 });
        if (!salesResponse.success) {
          throw new Error(salesResponse.error || 'Failed to fetch sales data');
        }

        const sales = salesResponse.data?.data || [];
        
        // Calculate summary metrics
        const total_sales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const total_volume = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        const transaction_count = sales.length;
        const average_transaction = transaction_count > 0 ? total_sales / transaction_count : 0;

        // Calculate growth rate
        const growth_rate = await this.calculateSalesGrowthRate(filters);

        // Get top products
        const top_products = this.calculateTopProducts(sales);

        // Get daily trends
        const daily_trends = this.calculateDailyTrends(sales);

        const summary: SalesSummary = {
          total_sales,
          total_volume,
          average_transaction,
          growth_rate,
          transaction_count,
          top_products,
          daily_trends
        };

        return summary;
      },
      { requireAuth: true }
    );
  }

  async getSalesStats(filters: SalesFilters = {}): Promise<ApiResponse<any>> {
    return this.handleRequest(
      'get_sales_stats',
      async () => {
        const salesResponse = await this.getSales({ ...filters, limit: 10000 });
        if (!salesResponse.success) {
          throw new Error(salesResponse.error || 'Failed to fetch sales data');
        }

        const sales = salesResponse.data?.data || [];

        // Calculate various statistics
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const totalVolume = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        
        const byPaymentMethod = sales.reduce((acc, sale) => {
          acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_amount;
          return acc;
        }, {} as Record<string, number>);

        const byCustomerType = sales.reduce((acc, sale) => {
          acc[sale.customer_type] = (acc[sale.customer_type] || 0) + sale.total_amount;
          return acc;
        }, {} as Record<string, number>);

        const byHour = this.calculateHourlyTrends(sales);

        return {
          total_sales: totalSales,
          total_volume: totalVolume,
          transaction_count: sales.length,
          average_transaction: sales.length > 0 ? totalSales / sales.length : 0,
          by_payment_method: byPaymentMethod,
          by_customer_type: byCustomerType,
          by_hour: byHour
        };
      },
      { requireAuth: true }
    );
  }

  // Private helper methods
  private async calculateSalesGrowthRate(filters: SalesFilters): Promise<number> {
    try {
      // Get current period sales
      const currentSalesResponse = await this.getSales(filters);
      const currentSales = currentSalesResponse.success ? currentSalesResponse.data?.data || [] : [];
      const currentTotal = currentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Calculate previous period dates
      const startDate = filters.start_date ? new Date(filters.start_date) : new Date();
      const endDate = filters.end_date ? new Date(filters.end_date) : new Date();
      
      const periodDiff = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDiff);
      const previousEndDate = new Date(endDate.getTime() - periodDiff);

      // Get previous period sales
      const previousFilters = {
        ...filters,
        start_date: previousStartDate.toISOString(),
        end_date: previousEndDate.toISOString()
      };

      const previousSalesResponse = await this.getSales(previousFilters);
      const previousSales = previousSalesResponse.success ? previousSalesResponse.data?.data || [] : [];
      const previousTotal = previousSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Calculate growth rate
      if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
      return ((currentTotal - previousTotal) / previousTotal) * 100;

    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  private calculateTopProducts(sales: Sale[]): SalesSummary['top_products'] {
    const productMap = new Map();

    sales.forEach(sale => {
      if (!sale.product_id) return;

      const productId = sale.product_id;
      const productName = (sale as any).products?.name || 'Unknown Product';
      const quantity = sale.quantity || 0;
      const total = sale.total_amount || 0;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: productName,
          total_sales: 0,
          total_volume: 0
        });
      }

      const product = productMap.get(productId);
      product.total_sales += total;
      product.total_volume += quantity;
    });

    const products = Array.from(productMap.values());
    const totalSales = products.reduce((sum, product) => sum + product.total_sales, 0);

    return products
      .map(product => ({
        ...product,
        percentage: totalSales > 0 ? (product.total_sales / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 10);
  }

  private calculateDailyTrends(sales: Sale[]): SalesSummary['daily_trends'] {
    const dailyMap = new Map();

    sales.forEach(sale => {
      if (!sale.created_at) return;

      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      const quantity = sale.quantity || 0;
      const total = sale.total_amount || 0;

      if (!dailyMap.has(saleDate)) {
        dailyMap.set(saleDate, {
          date: saleDate,
          sales: 0,
          volume: 0,
          transactions: 0
        });
      }

      const day = dailyMap.get(saleDate);
      day.sales += total;
      day.volume += quantity;
      day.transactions += 1;
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }

  private calculateHourlyTrends(sales: Sale[]): any {
    const hourlyMap = new Map();

    sales.forEach(sale => {
      if (!sale.created_at) return;

      const hour = new Date(sale.created_at).getHours();
      const total = sale.total_amount || 0;

      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, {
          hour,
          sales: 0,
          transactions: 0
        });
      }

      const hourData = hourlyMap.get(hour);
      hourData.sales += total;
      hourData.transactions += 1;
    });

    // Fill in missing hours
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyMap.has(hour)) {
        result.push(hourlyMap.get(hour));
      } else {
        result.push({
          hour,
          sales: 0,
          transactions: 0
        });
      }
    }

    return result.sort((a, b) => a.hour - b.hour);
  }
}