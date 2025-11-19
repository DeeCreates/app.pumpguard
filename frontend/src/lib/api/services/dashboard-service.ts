// lib/api/services/dashboard-service.ts
import { BaseService } from '../base-service';
import { 
  DashboardData, 
  OMCDashboardData, 
  AdminDashboardData,
  SalesAnalytics,
  ComplianceMetrics,
  FinancialSummary,
  APIResponse 
} from '@/types/api';

export class DashboardService extends BaseService {
  
  /**
   * Get comprehensive admin dashboard data
   */
  async getAdminDashboard(): Promise<APIResponse<AdminDashboardData>> {
    return this.handleRequest(
      'get_admin_dashboard',
      async () => {
        const [
          systemStats,
          recentActivities,
          complianceMetrics,
          financialSummary,
          salesAnalytics
        ] = await Promise.all([
          this.getSystemStats(),
          this.getRecentActivities(),
          this.getComplianceMetrics(),
          this.getFinancialSummary(),
          this.getSalesAnalytics('month')
        ]);

        const dashboardData: AdminDashboardData = {
          system_stats: systemStats,
          recent_activities: recentActivities,
          compliance_metrics: complianceMetrics,
          financial_summary: financialSummary,
          sales_analytics: salesAnalytics,
          alerts: await this.getSystemAlerts(),
          performance_metrics: await this.getPerformanceMetrics()
        };

        return dashboardData;
      },
      { requireAuth: true }
    );
  }

  /**
   * Get OMC-specific dashboard data
   */
  async getOMCDashboard(omcId: string): Promise<APIResponse<OMCDashboardData>> {
    return this.handleRequest(
      'get_omc_dashboard',
      async () => {
        const [
          omcDetails,
          stationStats,
          violationMetrics,
          salesPerformance,
          inventoryLevels
        ] = await Promise.all([
          this.getOMCDetails(omcId),
          this.getOMCStationStats(omcId),
          this.getOMCViolationMetrics(omcId),
          this.getOMCSalesPerformance(omcId),
          this.getOMCInventoryLevels(omcId)
        ]);

        const dashboardData: OMCDashboardData = {
          omc: omcDetails,
          station_stats: stationStats,
          violation_metrics: violationMetrics,
          sales_performance: salesPerformance,
          inventory_levels: inventoryLevels,
          recent_violations: await this.getRecentOMCViolations(omcId),
          top_performers: await this.getTopPerformingStations(omcId)
        };

        return dashboardData;
      },
      { requireAuth: true }
    );
  }

  /**
   * Get station manager dashboard
   */
  async getStationDashboard(stationId: string): Promise<APIResponse<DashboardData>> {
    return this.handleRequest(
      'get_station_dashboard',
      async () => {
        // Verify user has access to this station
        if (!await this.canAccessStation(stationId)) {
          throw new Error('Access denied to this station');
        }

        const [
          stationDetails,
          todaySales,
          currentInventory,
          activeShifts,
          pendingViolations
        ] = await Promise.all([
          this.getStationDetails(stationId),
          this.getTodaySales(stationId),
          this.getCurrentInventory(stationId),
          this.getActiveShifts(stationId),
          this.getPendingViolations(stationId)
        ]);

        const dashboardData: DashboardData = {
          station: stationDetails,
          today_sales: todaySales,
          current_inventory: currentInventory,
          active_shifts: activeShifts,
          pending_violations: pendingViolations,
          performance_metrics: await this.getStationPerformance(stationId),
          upcoming_tasks: await this.getUpcomingTasks(stationId)
        };

        return dashboardData;
      },
      { requireAuth: true }
    );
  }

  /**
   * Get global analytics for system overview
   */
  async getGlobalAnalytics(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<APIResponse<any>> {
    return this.handleRequest(
      'get_global_analytics',
      async () => {
        const [
          salesData,
          violationData,
          userActivity,
          financialData
        ] = await Promise.all([
          this.getTimeframeSales(timeframe),
          this.getTimeframeViolations(timeframe),
          this.getUserActivityMetrics(timeframe),
          this.getFinancialAnalytics(timeframe)
        ]);

        const analytics = {
          timeframe,
          sales_analytics: salesData,
          violation_trends: violationData,
          user_activity: userActivity,
          financial_metrics: financialData,
          comparison_data: await this.getComparisonData(timeframe),
          growth_metrics: await this.calculateGrowthMetrics(timeframe)
        };

        return analytics;
      },
      { requireAuth: true }
    );
  }

  // ===== PRIVATE HELPER METHODS =====

  private async getSystemStats() {
    const [
      { count: totalStations },
      { count: totalUsers },
      { count: totalOMCs },
      { data: salesData },
      { count: activeViolations }
    ] = await Promise.all([
      this.supabase.from('stations').select('*', { count: 'exact', head: true }),
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      this.supabase.from('omcs').select('*', { count: 'exact', head: true }),
      this.supabase.from('sales').select('total_amount, created_at').gte('created_at', this.getTimeframeStart('month')),
      this.supabase.from('compliance_violations').select('*', { count: 'exact', head: true }).eq('status', 'open')
    ]);

    return {
      total_stations: totalStations || 0,
      total_users: totalUsers || 0,
      total_omcs: totalOMCs || 0,
      monthly_sales: salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
      active_violations: activeViolations || 0,
      system_health: 'healthy' as const
    };
  }

  private async getRecentActivities(limit: number = 10) {
    const { data } = await this.supabase
      .from('user_activity_logs')
      .select(`
        *,
        user:profiles!user_activity_logs_user_id_fkey (full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  private async getComplianceMetrics() {
    const { data: violations } = await this.supabase
      .from('compliance_violations')
      .select('status, severity, violation_date');

    const total = violations?.length || 0;
    const open = violations?.filter(v => v.status === 'open').length || 0;
    const critical = violations?.filter(v => v.severity === 'critical').length || 0;

    return {
      total_violations: total,
      open_violations: open,
      critical_violations: critical,
      compliance_rate: total > 0 ? ((total - open) / total) * 100 : 100,
      trend: await this.getComplianceTrend()
    };
  }

  private async getFinancialSummary() {
    const [
      { data: sales },
      { data: deposits },
      { data: expenses }
    ] = await Promise.all([
      this.supabase.from('sales').select('total_amount, created_at').gte('created_at', this.getTimeframeStart('month')),
      this.supabase.from('bank_deposits').select('amount, status').gte('created_at', this.getTimeframeStart('month')),
      this.supabase.from('expenses').select('amount, status').gte('created_at', this.getTimeframeStart('month'))
    ]);

    const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const totalDeposits = deposits?.filter(d => d.status === 'reconciled').reduce((sum, d) => sum + d.amount, 0) || 0;
    const totalExpenses = expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0) || 0;

    return {
      total_revenue: totalSales,
      total_deposits: totalDeposits,
      total_expenses: totalExpenses,
      net_income: totalSales - totalExpenses,
      cash_flow: totalDeposits - totalExpenses
    };
  }

  private async getSalesAnalytics(timeframe: string): Promise<SalesAnalytics> {
    const { data: sales } = await this.supabase
      .from('sales')
      .select('*')
      .gte('created_at', this.getTimeframeStart(timeframe as any));

    const salesData = sales || [];

    return {
      total_sales: salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      total_volume: salesData.reduce((sum, s) => sum + (s.quantity || 0), 0),
      transaction_count: salesData.length,
      average_transaction: salesData.length > 0 ? 
        salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0) / salesData.length : 0,
      growth_rate: await this.calculateSalesGrowth(timeframe),
      top_products: this.calculateTopProducts(salesData),
      daily_trends: this.calculateDailyTrends(salesData)
    };
  }

  private getTimeframeStart(timeframe: 'day' | 'week' | 'month' | 'year'): string {
    const now = new Date();
    switch (timeframe) {
      case 'day': return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week': return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month': return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'year': return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default: return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }
  }

  private calculateTopProducts(sales: any[]) {
    const productMap = new Map();
    sales.forEach(sale => {
      const productId = sale.product_id;
      const productName = sale.products?.name || 'Unknown';
      const amount = sale.total_amount || 0;

      if (!productMap.has(productId)) {
        productMap.set(productId, { product_id: productId, product_name: productName, total_sales: 0 });
      }
      productMap.get(productId).total_sales += amount;
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 5);
  }

  private calculateDailyTrends(sales: any[]) {
    const dailyMap = new Map();
    sales.forEach(sale => {
      const date = sale.created_at.split('T')[0];
      const amount = sale.total_amount || 0;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, sales: 0, transactions: 0 });
      }
      dailyMap.get(date).sales += amount;
      dailyMap.get(date).transactions += 1;
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }

  private async calculateSalesGrowth(timeframe: string): Promise<number> {
    // Implementation for sales growth calculation
    return 0;
  }

  private async getSystemAlerts() {
    // Implementation for system alerts
    return [];
  }

  private async getPerformanceMetrics() {
    // Implementation for performance metrics
    return {};
  }

  // Additional helper methods for OMC dashboard...
  private async getOMCDetails(omcId: string) {
    const { data } = await this.supabase
      .from('omcs')
      .select('*')
      .eq('id', omcId)
      .single();
    return data;
  }

  private async getOMCStationStats(omcId: string) {
    const { data } = await this.supabase
      .from('stations')
      .select('id, status')
      .eq('omc_id', omcId);
    
    return {
      total: data?.length || 0,
      active: data?.filter(s => s.status === 'active').length || 0,
      inactive: data?.filter(s => s.status === 'inactive').length || 0
    };
  }

  private async canAccessStation(stationId: string): Promise<boolean> {
    // Implementation for station access check
    return true;
  }
}