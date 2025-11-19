import { BaseService } from '../base-service';
import {
  SalesReport,
  ViolationReport,
  InventoryReport,
  FinancialReport,
  ReportFilters,
  APIResponse
} from '../../../types/api';

export class ReportService extends BaseService {

  /**
   * Generate comprehensive sales report
   */
  async generateSalesReport(filters: ReportFilters): Promise<APIResponse<SalesReport>> {
    return await this.handleRequest(async () => {
      let query = this.supabase
        .from('sales')
        .select(`
          *,
          station:stations (name, code, region, omc_id, dealer_id),
          product:products (name, category, unit),
          attendant:profiles!sales_attendant_id_fkey (full_name)
        `);

      // Apply role-based filtering
      query = await this.applyRoleBasedFiltering(query, 'station_id');

      // Apply report filters
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters.omc_id) {
        const stationIds = await this.getStationIdsByOMC(filters.omc_id);
        query = query.in('station_id', stationIds);
      }

      const { data: sales, error } = await query;
      if (error) return this.failure(error.message);

      const report = this.analyzeSalesData(sales || [], filters);
      
      await this.logActivity('sales_report_generated', {
        filters,
        record_count: sales?.length || 0
      });

      return this.success(report);
    });
  }

  /**
   * Generate violation analysis report
   */
  async generateViolationReport(filters: ReportFilters): Promise<APIResponse<ViolationReport>> {
    return await this.handleRequest(async () => {
      let query = this.supabase
        .from('compliance_violations')
        .select(`
          *,
          station:stations (name, code, region, omc_id, dealer_id),
          product:products (name, unit),
          reporter:profiles!compliance_violations_reported_by_fkey (full_name)
        `);

      // Apply role-based filtering
      query = await this.applyRoleBasedFiltering(query, 'station_id');

      // Apply report filters
      if (filters.start_date) {
        query = query.gte('violation_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('violation_date', filters.end_date);
      }
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      const { data: violations, error } = await query;
      if (error) return this.failure(error.message);

      const report = this.analyzeViolationData(violations || [], filters);

      await this.logActivity('violation_report_generated', {
        filters,
        record_count: violations?.length || 0
      });

      return this.success(report);
    });
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(filters: ReportFilters): Promise<APIResponse<InventoryReport>> {
    return await this.handleRequest(async () => {
      let query = this.supabase
        .from('tank_stocks')
        .select(`
          *,
          station:stations (name, code, region, omc_id),
          product:products (name, category, unit)
        `);

      // Apply role-based filtering
      query = await this.applyRoleBasedFiltering(query, 'station_id');

      // Apply additional filters
      if (filters.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      const { data: inventory, error } = await query;
      if (error) return this.failure(error.message);

      const report = this.analyzeInventoryData(inventory || []);

      await this.logActivity('inventory_report_generated', {
        filters,
        record_count: inventory?.length || 0
      });

      return this.success(report);
    });
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(filters: ReportFilters): Promise<APIResponse<FinancialReport>> {
    return await this.handleRequest(async () => {
      const [
        salesData,
        expenseData,
        depositData
      ] = await Promise.all([
        this.getSalesData(filters),
        this.getExpenseData(filters),
        this.getDepositData(filters)
      ]);

      const report = this.analyzeFinancialData(
        salesData,
        expenseData,
        depositData,
        filters
      );

      await this.logActivity('financial_report_generated', {
        filters,
        timeframe: `${filters.start_date} to ${filters.end_date}`
      });

      return this.success(report);
    });
  }

  /**
   * Export report data in various formats
   */
  async exportReport(reportType: string, filters: ReportFilters, format: 'csv' | 'pdf' | 'excel' = 'csv'): Promise<APIResponse<any>> {
    return await this.handleRequest(async () => {
      let reportData;

      switch (reportType) {
        case 'sales':
          reportData = await this.generateSalesReport(filters);
          break;
        case 'violations':
          reportData = await this.generateViolationReport(filters);
          break;
        case 'inventory':
          reportData = await this.generateInventoryReport(filters);
          break;
        case 'financial':
          reportData = await this.generateFinancialReport(filters);
          break;
        default:
          return this.failure('Unsupported report type');
      }

      if (!reportData.success) {
        return this.failure(reportData.error!);
      }

      const exportResult = await this.formatReportData(reportData.data!, format);

      await this.logActivity('report_exported', {
        report_type: reportType,
        format,
        filters
      });

      return this.success(exportResult);
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private analyzeSalesData(sales: any[], filters: ReportFilters): SalesReport {
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalVolume = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    
    // Group by product
    const byProduct = sales.reduce((acc, sale) => {
      const productName = sale.product?.name || 'Unknown';
      acc[productName] = {
        sales: (acc[productName]?.sales || 0) + (sale.total_amount || 0),
        volume: (acc[productName]?.volume || 0) + (sale.quantity || 0),
        transactions: (acc[productName]?.transactions || 0) + 1
      };
      return acc;
    }, {} as Record<string, any>);

    // Group by station
    const byStation = sales.reduce((acc, sale) => {
      const stationName = sale.station?.name || 'Unknown';
      acc[stationName] = {
        sales: (acc[stationName]?.sales || 0) + (sale.total_amount || 0),
        volume: (acc[stationName]?.volume || 0) + (sale.quantity || 0),
        transactions: (acc[stationName]?.transactions || 0) + 1
      };
      return acc;
    }, {} as Record<string, any>);

    // Daily trends
    const dailyTrends = sales.reduce((acc, sale) => {
      const date = sale.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, sales: 0, volume: 0, transactions: 0 };
      }
      acc[date].sales += sale.total_amount || 0;
      acc[date].volume += sale.quantity || 0;
      acc[date].transactions += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      summary: {
        total_sales,
        total_volume,
        total_transactions: sales.length,
        average_transaction: sales.length > 0 ? totalSales / sales.length : 0,
        period: `${filters.start_date} to ${filters.end_date}`
      },
      by_product: byProduct,
      by_station: byStation,
      daily_trends: Object.values(dailyTrends),
      top_performers: {
        products: Object.entries(byProduct)
          .sort(([,a], [,b]) => b.sales - a.sales)
          .slice(0, 5),
        stations: Object.entries(byStation)
          .sort(([,a], [,b]) => b.sales - a.sales)
          .slice(0, 5)
      }
    };
  }

  private analyzeViolationData(violations: any[], filters: ReportFilters): ViolationReport {
    const totalViolations = violations.length;
    const totalFines = violations.reduce((sum, violation) => sum + (violation.fine_amount || 0), 0);
    
    const bySeverity = violations.reduce((acc, violation) => {
      acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = violations.reduce((acc, violation) => {
      acc[violation.status] = (acc[violation.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStation = violations.reduce((acc, violation) => {
      const stationName = violation.station?.name || 'Unknown';
      acc[stationName] = (acc[stationName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        total_violations,
        total_fines,
        average_fine: totalViolations > 0 ? totalFines / totalViolations : 0,
        compliance_rate: this.calculateComplianceRate(violations),
        period: `${filters.start_date} to ${filters.end_date}`
      },
      by_severity: bySeverity,
      by_status: byStatus,
      by_station: byStation,
      trend_analysis: this.analyzeViolationTrends(violations),
      top_offenders: Object.entries(byStation)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  private analyzeInventoryData(inventory: any[]): InventoryReport {
    const totalCapacity = inventory.reduce((sum, item) => sum + (item.capacity || 0), 0);
    const currentStock = inventory.reduce((sum, item) => sum + (item.current_stock || 0), 0);
    const stockPercentage = totalCapacity > 0 ? (currentStock / totalCapacity) * 100 : 0;

    const byProduct = inventory.reduce((acc, item) => {
      const productName = item.product?.name || 'Unknown';
      acc[productName] = {
        current_stock: item.current_stock || 0,
        capacity: item.capacity || 0,
        stock_percentage: item.capacity > 0 ? (item.current_stock / item.capacity) * 100 : 0,
        station_count: (acc[productName]?.station_count || 0) + 1
      };
      return acc;
    }, {} as Record<string, any>);

    const lowStockItems = inventory.filter(item => {
      const percentage = item.capacity > 0 ? (item.current_stock / item.capacity) * 100 : 0;
      return percentage < 20;
    });

    return {
      summary: {
        total_capacity: totalCapacity,
        current_stock: currentStock,
        overall_stock_percentage: stockPercentage,
        low_stock_items: lowStockItems.length,
        out_of_stock_items: inventory.filter(item => item.current_stock <= 0).length
      },
      by_product: byProduct,
      low_stock_alerts: lowStockItems.map(item => ({
        product: item.product?.name,
        station: item.station?.name,
        current_stock: item.current_stock,
        capacity: item.capacity,
        stock_percentage: item.capacity > 0 ? (item.current_stock / item.capacity) * 100 : 0
      })),
      inventory_turnover: this.calculateInventoryTurnover(inventory)
    };
  }

  private analyzeFinancialData(sales: any[], expenses: any[], deposits: any[], filters: ReportFilters): FinancialReport {
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalDeposits = deposits.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);

    return {
      summary: {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        total_deposits: totalDeposits,
        net_income: totalRevenue - totalExpenses,
        cash_flow: totalDeposits - totalExpenses,
        profit_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        period: `${filters.start_date} to ${filters.end_date}`
      },
      revenue_breakdown: this.analyzeRevenueBreakdown(sales),
      expense_breakdown: this.analyzeExpenseBreakdown(expenses),
      financial_ratios: this.calculateFinancialRatios(totalRevenue, totalExpenses, totalDeposits),
      trends: this.analyzeFinancialTrends(sales, expenses, deposits)
    };
  }

  private calculateComplianceRate(violations: any[]): number {
    const total = violations.length;
    const resolved = violations.filter(v => v.status === 'resolved').length;
    return total > 0 ? (resolved / total) * 100 : 100;
  }

  private async getSalesData(filters: ReportFilters) {
    const { data } = await this.supabase
      .from('sales')
      .select('*')
      .gte('created_at', filters.start_date)
      .lte('created_at', filters.end_date);
    return data || [];
  }

  private async getExpenseData(filters: ReportFilters) {
    const { data } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('status', 'approved')
      .gte('expense_date', filters.start_date)
      .lte('expense_date', filters.end_date);
    return data || [];
  }

  private async getDepositData(filters: ReportFilters) {
    const { data } = await this.supabase
      .from('bank_deposits')
      .select('*')
      .eq('status', 'reconciled')
      .gte('deposit_date', filters.start_date)
      .lte('deposit_date', filters.end_date);
    return data || [];
  }

  private async formatReportData(data: any, format: string) {
    // Implementation for formatting report data
    return {
      format,
      data,
      generated_at: new Date().toISOString()
    };
  }

  // Additional analysis methods...
  private analyzeViolationTrends(violations: any[]) {
    // Implementation for violation trend analysis
    return {};
  }

  private calculateInventoryTurnover(inventory: any[]) {
    // Implementation for inventory turnover calculation
    return 0;
  }

  private analyzeRevenueBreakdown(sales: any[]) {
    // Implementation for revenue breakdown analysis
    return {};
  }

  private analyzeExpenseBreakdown(expenses: any[]) {
    // Implementation for expense breakdown analysis
    return {};
  }

  private calculateFinancialRatios(revenue: number, expenses: number, deposits: number) {
    // Implementation for financial ratio calculation
    return {};
  }

  private analyzeFinancialTrends(sales: any[], expenses: any[], deposits: any[]) {
    // Implementation for financial trend analysis
    return {};
  }
}