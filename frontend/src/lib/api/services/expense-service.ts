import { BaseService } from '../base-service';
import {
  Expense,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseFilters,
  ExpenseStats,
  ExpensesResponse,
  APIResponse,
  PaginatedResponse
} from '../../../types/api';

export class ExpenseService extends BaseService {
  private readonly tableName = 'expenses';

  /**
   * Create expense with role-based auto-approval
   */
  async createExpense(expenseData: ExpenseCreateData): Promise<APIResponse<Expense>> {
    return await this.handleRequest(async () => {
      // Validate amount
      if (expenseData.amount <= 0) {
        return this.failure('Amount must be greater than 0');
      }

      // Apply role-based auto-approval logic
      const { status, approved_by } = this.calculateExpenseStatus(expenseData.amount);

      // For non-admin users, ensure they're only creating expenses for their station
      if (this.userRole !== 'admin' && this.userStationId) {
        if (expenseData.station_id !== this.userStationId) {
          return this.failure('You can only create expenses for your assigned station');
        }
      }

      const { data: expense, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...expenseData,
          created_by: this.userId,
          status,
          approved_by
        })
        .select(`
          *,
          station:stations (name, code, omc_id, dealer_id),
          creator:profiles!expenses_created_by_fkey (full_name, email),
          approver:profiles!expenses_approved_by_fkey (full_name)
        `)
        .single();

      if (error) {
        if (error.code === '42501') {
          return this.failure('You do not have permission to create expenses. Please check your role permissions.');
        }
        return this.failure(error.message);
      }

      await this.logActivity('expense_created', {
        expense_id: expense.id,
        amount: expenseData.amount,
        category: expenseData.category,
        status,
        auto_approved: status === 'approved'
      });

      const message = status === 'approved' 
        ? 'Expense recorded and auto-approved!' 
        : 'Expense recorded pending approval';

      return this.success(expense, message);
    });
  }

  /**
   * Get expenses with role-based filtering
   */
  async getExpenses(filters: ExpenseFilters = {}): Promise<PaginatedResponse<ExpensesResponse>> {
    return await this.handlePaginatedRequest(async (query) => {
      let baseQuery = this.supabase
        .from(this.tableName)
        .select(`
          *,
          station:stations (name, code, omc_id, dealer_id),
          creator:profiles!expenses_created_by_fkey (full_name, email, role),
          approver:profiles!expenses_approved_by_fkey (full_name, email)
        `, { count: 'exact' })
        .order('expense_date', { ascending: false });

      // Apply role-based filtering
      baseQuery = await this.applyRoleBasedFiltering(baseQuery, 'station_id');

      // Apply additional filters
      if (filters.station_id && filters.station_id !== 'all') {
        baseQuery = baseQuery.eq('station_id', filters.station_id);
      }
      if (filters.category && filters.category !== 'all') {
        baseQuery = baseQuery.eq('category', filters.category);
      }
      if (filters.type && filters.type !== 'all') {
        baseQuery = baseQuery.eq('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        baseQuery = baseQuery.eq('status', filters.status);
      }
      if (filters.start_date) {
        baseQuery = baseQuery.gte('expense_date', filters.start_date);
      }
      if (filters.end_date) {
        baseQuery = baseQuery.lte('expense_date', filters.end_date);
      }
      if (filters.user_id) {
        baseQuery = baseQuery.eq('created_by', filters.user_id);
      }
      if (filters.search) {
        baseQuery = baseQuery.or(`description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'expense_date';
      const sortOrder = filters.sort_order || 'desc';
      baseQuery = baseQuery.order(sortBy, { ascending: sortOrder === 'asc' });

      return query(baseQuery);
    }, filters, (data) => ({
      expenses: data,
      filters,
      summary: await this.calculateExpenseSummary(data || [])
    }));
  }

  /**
   * Update expense with permission checking
   */
  async updateExpense(expenseId: string, updates: ExpenseUpdateData): Promise<APIResponse<Expense>> {
    return await this.handleRequest(async () => {
      // Check permissions
      if (!await this.canManageExpense(expenseId)) {
        return this.failure('You do not have permission to update this expense');
      }

      const updateData: any = { ...updates };

      // If updating status to approved/rejected, set approved_by
      if (updates.status && ['approved', 'rejected'].includes(updates.status)) {
        updateData.approved_by = this.userId;
        updateData.approved_at = new Date().toISOString();
      }

      const { data: expense, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', expenseId)
        .select(`
          *,
          station:stations (name, code),
          creator:profiles!expenses_created_by_fkey (full_name, email),
          approver:profiles!expenses_approved_by_fkey (full_name, email)
        `)
        .single();

      if (error) return this.failure(error.message);

      await this.logActivity('expense_updated', {
        expense_id: expenseId,
        updates: Object.keys(updates),
        new_status: updates.status
      });

      return this.success(expense, 'Expense updated successfully');
    });
  }

  /**
   * Delete expense with permission validation
   */
  async deleteExpense(expenseId: string): Promise<APIResponse<void>> {
    return await this.handleRequest(async () => {
      if (!await this.canManageExpense(expenseId)) {
        return this.failure('You do not have permission to delete this expense');
      }

      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', expenseId);

      if (error) return this.failure(error.message);

      await this.logActivity('expense_deleted', {
        expense_id: expenseId
      });

      return this.success(undefined, 'Expense deleted successfully');
    });
  }

  /**
   * Get comprehensive expense statistics
   */
  async getExpenseStats(filters?: ExpenseFilters): Promise<APIResponse<ExpenseStats>> {
    return await this.handleRequest(async () => {
      let query = this.supabase.from(this.tableName).select('*');
      
      // Apply role-based filtering
      query = await this.applyRoleBasedFiltering(query, 'station_id');
      
      // Apply additional filters
      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }
      if (filters?.start_date) {
        query = query.gte('expense_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('expense_date', filters.end_date);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data: expenses, error } = await query;
      if (error) return this.failure(error.message);

      const stats = this.calculateExpenseStats(expenses || []);
      return this.success(stats);
    });
  }

  /**
   * Bulk approve/reject expenses
   */
  async bulkUpdateExpenseStatus(expenseIds: string[], status: 'approved' | 'rejected', reason?: string): Promise<APIResponse<any>> {
    return await this.handleRequest(async () => {
      if (!await this.canApproveExpenses()) {
        return this.failure('You do not have permission to approve expenses');
      }

      const { data: expenses, error } = await this.supabase
        .from(this.tableName)
        .update({
          status,
          approved_by: this.userId,
          approved_at: new Date().toISOString(),
          approval_notes: reason
        })
        .in('id', expenseIds)
        .select();

      if (error) return this.failure(error.message);

      await this.logActivity('expenses_bulk_updated', {
        expense_ids: expenseIds,
        new_status: status,
        count: expenses?.length || 0
      });

      return this.success({
        updated_count: expenses?.length || 0,
        expenses
      }, `${expenses?.length || 0} expenses ${status}`);
    });
  }

  /**
   * Get expense categories for dropdowns
   */
  async getExpenseCategories(): Promise<APIResponse<string[]>> {
    return await this.handleRequest(async () => {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('category')
        .order('category');

      if (error) return this.failure(error.message);

      const categories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      return this.success(categories);
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private calculateExpenseStatus(amount: number): { status: string; approved_by: string | null } {
    const rolePermissions = {
      'admin': { canAutoApprove: true, limit: 100000 },
      'station_manager': { canAutoApprove: true, limit: 5000 },
      'supervisor': { canAutoApprove: false, limit: 0 },
      'attendant': { canAutoApprove: false, limit: 0 },
      'omc': { canAutoApprove: false, limit: 0 },
      'dealer': { canAutoApprove: false, limit: 0 },
      'npa': { canAutoApprove: false, limit: 0 }
    };

    const permission = rolePermissions[this.userRole] || rolePermissions.attendant;
    
    if (permission.canAutoApprove && amount <= permission.limit) {
      return { status: 'approved', approved_by: this.userId };
    }

    return { status: 'pending', approved_by: null };
  }

  private async canManageExpense(expenseId: string): Promise<boolean> {
    if (this.userRole === 'admin') return true;

    // Get expense to check ownership
    const { data: expense } = await this.supabase
      .from(this.tableName)
      .select('station_id, created_by')
      .eq('id', expenseId)
      .single();

    if (!expense) return false;

    // Station managers can only manage expenses from their station
    if (this.userRole === 'station_manager') {
      return expense.station_id === this.userStationId;
    }

    // Users can only manage their own expenses
    return expense.created_by === this.userId;
  }

  private async canApproveExpenses(): Promise<boolean> {
    const allowedRoles = ['admin', 'station_manager', 'omc', 'dealer'];
    return allowedRoles.includes(this.userRole);
  }

  private calculateExpenseStats(expenses: any[]): ExpenseStats {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    const todayExpenses = expenses.filter(e => e.expense_date === today);
    const monthExpenses = expenses.filter(e => e.expense_date.startsWith(currentMonth));

    const stats: ExpenseStats = {
      total_expenses: expenses.length,
      total_amount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      pending_approval: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
      today_expenses: todayExpenses.length,
      today_amount: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
      monthly_expenses: monthExpenses.length,
      monthly_amount: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      average_expense: expenses.length > 0 ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length : 0,
      by_category: expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>),
      by_type: expenses.reduce((acc, expense) => {
        acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>),
      by_status: expenses.reduce((acc, expense) => {
        acc[expense.status] = (acc[expense.status] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }

  private async calculateExpenseSummary(expenses: any[]) {
    return {
      total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
      pending_amount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
      approved_amount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
    };
  }
}