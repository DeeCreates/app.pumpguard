import { BaseService } from '../base-service';
import { 
  BankDeposit, 
  BankDepositCreateData, 
  BankDepositUpdateData, 
  BankDepositFilters,
  BankDepositStats,
  APIResponse,
  PaginatedResponse 
} from '../../../types/api';

export class BankDepositService extends BaseService {
  private readonly tableName = 'bank_deposits';

  /**
   * Create a new bank deposit with validation
   */
  async createDeposit(depositData: BankDepositCreateData): Promise<APIResponse<BankDeposit>> {
    return await this.handleRequest(async () => {
      // Validate required fields
      if (!depositData.station_id || !depositData.amount || !depositData.bank_name) {
        return this.failure('Station ID, amount, and bank name are required');
      }

      // Validate amount
      if (depositData.amount <= 0) {
        return this.failure('Amount must be greater than 0');
      }

      // Check for duplicate reference number
      if (depositData.reference_number) {
        const { data: existing } = await this.supabase
          .from(this.tableName)
          .select('id')
          .eq('reference_number', depositData.reference_number)
          .maybeSingle();

        if (existing) {
          return this.failure('A deposit with this reference number already exists');
        }
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...depositData,
          status: 'pending',
          created_by: this.userId
        })
        .select(`
          *,
          station:stations (name, code, omc_id),
          creator:profiles!bank_deposits_created_by_fkey (full_name)
        `)
        .single();

      if (error) return this.failure(error.message);
      
      // Log activity
      await this.logActivity('deposit_created', {
        deposit_id: data.id,
        amount: depositData.amount,
        station_id: depositData.station_id
      });

      return this.success(data, 'Bank deposit recorded successfully!');
    });
  }

  /**
   * Get bank deposits with advanced filtering
   */
  async getDeposits(filters: BankDepositFilters = {}): Promise<PaginatedResponse<BankDeposit[]>> {
    return await this.handlePaginatedRequest(async (query) => {
      let baseQuery = this.supabase
        .from(this.tableName)
        .select(`
          *,
          station:stations (name, code, omc_id, dealer_id),
          creator:profiles!bank_deposits_created_by_fkey (full_name),
          reconciler:profiles!bank_deposits_reconciled_by_fkey (full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      baseQuery = await this.applyRoleBasedFiltering(baseQuery, 'station_id');
      
      // Apply custom filters
      if (filters.station_id) {
        baseQuery = baseQuery.eq('station_id', filters.station_id);
      }
      if (filters.status) {
        baseQuery = baseQuery.eq('status', filters.status);
      }
      if (filters.start_date) {
        baseQuery = baseQuery.gte('deposit_date', filters.start_date);
      }
      if (filters.end_date) {
        baseQuery = baseQuery.lte('deposit_date', filters.end_date);
      }
      if (filters.reference_number) {
        baseQuery = baseQuery.ilike('reference_number', `%${filters.reference_number}%`);
      }

      return query(baseQuery);
    }, filters);
  }

  /**
   * Update deposit status (confirm, reconcile, etc.)
   */
  async updateDeposit(depositId: string, updates: BankDepositUpdateData): Promise<APIResponse<BankDeposit>> {
    return await this.handleRequest(async () => {
      const updateData: any = { ...updates };

      // Auto-set reconciliation date if status changed to reconciled
      if (updates.status === 'reconciled' && !updates.reconciled_at) {
        updateData.reconciled_at = new Date().toISOString();
        updateData.reconciled_by = this.userId;
      }

      // Auto-set confirmation date if status changed to confirmed
      if (updates.status === 'confirmed' && !updates.confirmed_at) {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = this.userId;
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', depositId)
        .select(`
          *,
          station:stations (name, code),
          creator:profiles!bank_deposits_created_by_fkey (full_name),
          reconciler:profiles!bank_deposits_reconciled_by_fkey (full_name)
        `)
        .single();

      if (error) return this.failure(error.message);

      // Log status change
      await this.logActivity('deposit_updated', {
        deposit_id: depositId,
        new_status: updates.status,
        previous_amount: data.amount
      });

      return this.success(data, 'Deposit updated successfully!');
    });
  }

  /**
   * Get comprehensive deposit statistics
   */
  async getDepositStats(filters?: BankDepositFilters): Promise<APIResponse<BankDepositStats>> {
    return await this.handleRequest(async () => {
      let query = this.supabase.from(this.tableName).select('*');
      
      // Apply role-based filtering
      query = await this.applyRoleBasedFiltering(query, 'station_id');
      
      // Apply additional filters
      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.start_date) {
        query = query.gte('deposit_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('deposit_date', filters.end_date);
      }

      const { data: deposits, error } = await query;
      if (error) return this.failure(error.message);

      const stats = this.calculateDepositStats(deposits || []);
      return this.success(stats);
    });
  }

  /**
   * Calculate comprehensive deposit statistics
   */
  private calculateDepositStats(deposits: any[]): BankDepositStats {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    const todayDeposits = deposits.filter(d => d.deposit_date === today);
    const monthDeposits = deposits.filter(d => d.deposit_date.startsWith(currentMonth));

    return {
      total_deposits: deposits.length,
      total_amount: deposits.reduce((sum, dep) => sum + dep.amount, 0),
      pending_deposits: deposits.filter(d => d.status === 'pending').length,
      pending_amount: deposits.filter(d => d.status === 'pending').reduce((sum, dep) => sum + dep.amount, 0),
      confirmed_deposits: deposits.filter(d => d.status === 'confirmed').length,
      confirmed_amount: deposits.filter(d => d.status === 'confirmed').reduce((sum, dep) => sum + dep.amount, 0),
      reconciled_deposits: deposits.filter(d => d.status === 'reconciled').length,
      reconciled_amount: deposits.filter(d => d.status === 'reconciled').reduce((sum, dep) => sum + dep.amount, 0),
      today_deposits: todayDeposits.length,
      today_amount: todayDeposits.reduce((sum, dep) => sum + dep.amount, 0),
      monthly_deposits: monthDeposits.length,
      monthly_amount: monthDeposits.reduce((sum, dep) => sum + dep.amount, 0),
      average_deposit: deposits.length > 0 ? deposits.reduce((sum, dep) => sum + dep.amount, 0) / deposits.length : 0,
      by_status: deposits.reduce((acc, dep) => {
        acc[dep.status] = (acc[dep.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_bank: deposits.reduce((acc, dep) => {
        acc[dep.bank_name] = (acc[dep.bank_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Export deposits data for reporting
   */
  async exportDeposits(filters: BankDepositFilters = {}): Promise<APIResponse<any>> {
    return await this.handleRequest(async () => {
      const response = await this.getDeposits({ ...filters, limit: 10000 });
      
      if (!response.success) {
        return this.failure(response.error!);
      }

      const exportData = {
        deposits: response.data?.data || [],
        metadata: {
          exported_at: new Date().toISOString(),
          filters_applied: filters,
          total_records: response.data?.data?.length || 0,
          format: 'json'
        },
        summary: await this.getDepositStats(filters)
      };

      await this.logActivity('deposits_exported', {
        record_count: exportData.metadata.total_records,
        filters_applied: filters
      });

      return this.success(exportData);
    });
  }
}