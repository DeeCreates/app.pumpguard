import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ActionSheet } from "@/components/ui/action-sheet";
import { toast } from "sonner";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building,
  User,
  Wrench,
  Settings,
  FileText
} from "lucide-react";

interface Expense {
  id: string;
  station_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  type: 'operational' | 'fixed' | 'staff' | 'maintenance' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  notes?: string;
}

interface ExpenseStats {
  total_expenses: number;
  operational: number;
  fixed: number;
  staff: number;
  maintenance: number;
  other: number;
  pending_approval: number;
}

interface RolePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  viewScope: 'all' | 'station' | 'own';
  approvalLimit?: number;
}

// Memoized Components
const ExpenseCard = React.memo(({ 
  expense, 
  onView, 
  onApprove, 
  onReject, 
  onDelete, 
  permissions 
}: {
  expense: Expense;
  onView: (expense: Expense) => void;
  onApprove: (expenseId: string) => void;
  onReject: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  permissions: RolePermissions;
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: Expense['type']) => {
    switch (type) {
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'fixed': return 'bg-purple-100 text-purple-800';
      case 'staff': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-cyan-100 text-cyan-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Expense['type']) => {
    switch (type) {
      case 'operational': return Building;
      case 'fixed': return Settings;
      case 'staff': return User;
      case 'maintenance': return Wrench;
      case 'other': return FileText;
      default: return FileText;
    }
  };

  const TypeIcon = getTypeIcon(expense.type);

  const handleAction = (action: 'view' | 'approve' | 'reject' | 'delete') => {
    setShowActions(false);
    setTimeout(() => {
      switch (action) {
        case 'view':
          onView(expense);
          break;
        case 'approve':
          onApprove(expense.id);
          break;
        case 'reject':
          onReject(expense.id);
          break;
        case 'delete':
          onDelete(expense.id);
          break;
      }
    }, 100);
  };

  return (
    <>
      <Card className="touch-manipulation active:scale-[0.98] transition-transform duration-150">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={getTypeColor(expense.type)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {expense.type}
                </Badge>
                <Badge variant="outline" className={getStatusColor(expense.status)}>
                  {expense.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                {expense.expense_date}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 touch-manipulation"
              onClick={() => setShowActions(true)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Description */}
          <div>
            <p className="font-medium text-base truncate">{expense.description}</p>
            <p className="text-sm text-gray-500 capitalize mt-1">{expense.category}</p>
          </div>

          {/* Amount and Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-lg font-bold text-red-600">
                ₵{expense.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 touch-manipulation"
                onClick={() => handleAction('view')}
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              {permissions.canApprove && expense.status === 'pending' && (
                <Button
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-700 text-white touch-manipulation"
                  onClick={() => handleAction('approve')}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Sheet */}
      <ActionSheet
        open={showActions}
        onOpenChange={setShowActions}
        title="Expense Actions"
        actions={[
          {
            label: "View Details",
            icon: Eye,
            onClick: () => handleAction('view'),
          },
          ...(permissions.canApprove && expense.status === 'pending' ? [
            {
              label: "Approve Expense",
              icon: CheckCircle,
              onClick: () => handleAction('approve'),
            },
            {
              label: "Reject Expense",
              icon: XCircle,
              destructive: true,
              onClick: () => handleAction('reject'),
            }
          ] : []),
          ...(permissions.canDelete ? [{
            label: "Delete Expense",
            icon: Trash2,
            destructive: true,
            onClick: () => handleAction('delete'),
          }] : []),
        ]}
      />
    </>
  );
});

const StatsCard = React.memo(({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down';
}) => (
  <Card className={`${color} border-0 touch-manipulation active:scale-[0.98] transition-transform duration-150`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">{title}</p>
          <p className="text-lg font-bold truncate">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {trend && (
              trend === 'up' ? 
                <TrendingUp className="w-3 h-3 text-red-500" /> : 
                <TrendingDown className="w-3 h-3 text-green-500" />
            )}
            <p className="text-xs opacity-80 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="bg-white/20 p-2 rounded-full ml-2">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
));

export default function MobileExpenseTracker() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    operational: 0,
    fixed: 0,
    staff: 0,
    maintenance: 0,
    other: 0,
    pending_approval: 0
  });
  
  // Mobile UI states
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Form state
  const [expenseForm, setExpenseForm] = useState({
    category: 'operational',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    type: 'operational' as Expense['type'],
    notes: '',
    receipt_url: ''
  });

  const [filters, setFilters] = useState({
    category: 'all',
    type: 'all',
    status: 'all',
    date_from: '',
    date_to: '',
    search: ''
  });

  // Role-based permissions
  const getRolePermissions = useCallback((): RolePermissions => {
    const role = user?.role || 'attendant';
    
    const permissions: Record<string, RolePermissions> = {
      admin: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        viewScope: 'all',
        approvalLimit: 100000
      },
      npa_supervisor: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: true,
        viewScope: 'all',
        approvalLimit: 500000
      },
      omc: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        viewScope: 'all',
        approvalLimit: 50000
      },
      dealer: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        viewScope: 'station',
        approvalLimit: 10000
      },
      station_manager: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        viewScope: 'station',
        approvalLimit: 5000
      },
      supervisor: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        viewScope: 'station'
      },
      attendant: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        viewScope: 'own'
      }
    };

    return permissions[role] || permissions.attendant;
  }, [user?.role]);

  const permissions = getRolePermissions();

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      // Apply role-based view scope
      if (permissions.viewScope === 'station' && user.station_id) {
        query = query.eq('station_id', user.station_id);
      } else if (permissions.viewScope === 'own') {
        query = query.eq('created_by', user.id);
      }

      // Apply filters
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.date_from) {
        query = query.gte('expense_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('expense_date', filters.date_to);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST204') {
          setExpenses([]);
          return;
        }
        throw error;
      }

      setExpenses(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Failed to load expenses:', error);
      toast.error('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.station_id, permissions.viewScope, filters]);

  // Calculate statistics
  const calculateStats = useCallback((expenseData: Expense[]) => {
    const stats: ExpenseStats = {
      total_expenses: 0,
      operational: 0,
      fixed: 0,
      staff: 0,
      maintenance: 0,
      other: 0,
      pending_approval: 0
    };

    expenseData.forEach(expense => {
      stats.total_expenses += expense.amount;
      stats.pending_approval += expense.status === 'pending' ? expense.amount : 0;

      switch (expense.type) {
        case 'operational':
          stats.operational += expense.amount;
          break;
        case 'fixed':
          stats.fixed += expense.amount;
          break;
        case 'staff':
          stats.staff += expense.amount;
          break;
        case 'maintenance':
          stats.maintenance += expense.amount;
          break;
        case 'other':
          stats.other += expense.amount;
          break;
      }
    });

    setStats(stats);
  }, []);

  // Create expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.station_id || !permissions.canCreate) return;

    setSubmitting(true);
    try {
      const expenseData = {
        station_id: user.station_id,
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        type: expenseForm.type,
        notes: expenseForm.notes,
        receipt_url: expenseForm.receipt_url,
        created_by: user.id,
        status: permissions.canApprove && parseFloat(expenseForm.amount) <= (permissions.approvalLimit || 0) ? 'approved' : 'pending'
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST204') {
          toast.success('Expense recorded (demo mode)');
          setShowAddSheet(false);
          resetForm();
          return;
        }
        throw error;
      }

      toast.success('Expense recorded successfully!');
      setShowAddSheet(false);
      resetForm();
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      toast.error(`Failed to record expense: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Update expense status
  const handleUpdateStatus = async (expenseId: string, status: Expense['status']) => {
    if (!permissions.canApprove) return;

    setUpdating(expenseId);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ 
          status, 
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success(`Expense ${status} successfully`);
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense status');
    } finally {
      setUpdating(null);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!permissions.canDelete) return;

    setUpdating(expenseId);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    } finally {
      setUpdating(null);
    }
  };

  const resetForm = () => {
    setExpenseForm({
      category: 'operational',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      type: 'operational',
      notes: '',
      receipt_url: ''
    });
  };

  // Export expenses
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Category', 'Description', 'Amount', 'Type', 'Status'],
      ...expenses.map(expense => [
        expense.expense_date,
        expense.category,
        expense.description,
        expense.amount.toString(),
        expense.type,
        expense.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Expenses exported successfully');
  };

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailsSheet(true);
  };

  const handleApprove = (expenseId: string) => {
    handleUpdateStatus(expenseId, 'approved');
  };

  const handleReject = (expenseId: string) => {
    handleUpdateStatus(expenseId, 'rejected');
  };

  const handleDelete = (expenseId: string) => {
    handleDeleteExpense(expenseId);
  };

  // Loading state
  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600 text-base">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* Header Section */}
      <div className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
              <p className="text-gray-600 text-base mt-1">
                {permissions.viewScope === 'all' ? 'All Stations' : 
                 permissions.viewScope === 'station' ? 'Station Expenses' : 'My Expenses'}
                {user?.role && ` • ${user.role.toUpperCase()}`}
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={loadExpenses}
              disabled={loading}
              className="h-11 min-h-[44px]"
            >
              <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search expense descriptions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 h-11 text-base"
            />
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        
        {/* Expense Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            title="Total Expenses"
            value={`₵${stats.total_expenses.toLocaleString()}`}
            subtitle="All Time"
            icon={TrendingUp}
            color="bg-red-50 text-red-900"
            trend="up"
          />
          <StatsCard
            title="Operational"
            value={`₵${stats.operational.toLocaleString()}`}
            subtitle={`${stats.total_expenses > 0 ? ((stats.operational / stats.total_expenses) * 100).toFixed(1) : 0}%`}
            icon={Building}
            color="bg-blue-50 text-blue-900"
          />
          <StatsCard
            title="Fixed Costs"
            value={`₵${stats.fixed.toLocaleString()}`}
            subtitle={`${stats.total_expenses > 0 ? ((stats.fixed / stats.total_expenses) * 100).toFixed(1) : 0}%`}
            icon={Settings}
            color="bg-purple-50 text-purple-900"
          />
          <StatsCard
            title="Pending Approval"
            value={`₵${stats.pending_approval.toLocaleString()}`}
            subtitle="Awaiting Review"
            icon={Clock}
            color="bg-yellow-50 text-yellow-900"
            trend="down"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          <Button
            variant={filters.status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, status: 'all' })}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            All
          </Button>
          <Button
            variant={filters.status === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, status: 'pending' })}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            Pending
          </Button>
          <Button
            variant={filters.status === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, status: 'approved' })}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            Approved
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="whitespace-nowrap h-9 min-h-[36px] touch-manipulation"
          >
            <Filter className="w-4 h-4 mr-1" />
            More
          </Button>
        </div>

        {/* Expenses Count */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Expense Records ({expenses.length})
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-6 text-base">
              {filters.search || filters.date_from || filters.status !== 'all' 
                ? "Try adjusting your filters" 
                : "No expenses recorded for this period"}
            </p>
            {permissions.canCreate && (
              <Button 
                onClick={() => setShowAddSheet(true)}
                className="h-11 min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onView={handleViewDetails}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                permissions={permissions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-3 z-20">
        <Button
          variant="outline"
          onClick={handleExport}
          className="flex-1 h-12 touch-manipulation active:scale-95"
          disabled={expenses.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        {permissions.canCreate && (
          <Button 
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg touch-manipulation active:scale-95"
            onClick={() => setShowAddSheet(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Expense
          </Button>
        )}
      </div>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title="Filter Expenses"
      >
        <div className="space-y-4 pb-8">
          {/* Date Range */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Date Range</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">From</label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">To</label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Category</h3>
            <Select 
              value={filters.category} 
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center justify-between w-full p-3 border rounded-lg touch-manipulation"
            >
              <span className="font-medium text-gray-900">Advanced Filters</span>
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedFilters && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Type */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Type</label>
                  <Select 
                    value={filters.type} 
                    onValueChange={(value) => setFilters({ ...filters, type: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  category: 'all',
                  type: 'all',
                  status: 'all',
                  date_from: '',
                  date_to: '',
                  search: ''
                });
                setShowFilters(false);
              }}
              className="flex-1 h-12 touch-manipulation"
            >
              Reset
            </Button>
            <Button
              onClick={() => setShowFilters(false)}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Expense Bottom Sheet */}
      <BottomSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        title="Record New Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={expenseForm.type}
                onValueChange={(value: Expense['type']) => setExpenseForm({ ...expenseForm, type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="Expense description"
              required
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₵)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0.00"
              required
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={expenseForm.expense_date}
              onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              placeholder="Additional notes"
              className="h-11 text-base"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation active:scale-95"
            disabled={submitting || !expenseForm.description || !expenseForm.amount}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Expense"
            )}
          </Button>
        </form>
      </BottomSheet>

      {/* Expense Details Bottom Sheet */}
      <BottomSheet
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        title="Expense Details"
        size="lg"
      >
        {selectedExpense && (
          <div className="space-y-6 pb-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Expense Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-base">{selectedExpense.expense_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium text-base text-right">{selectedExpense.description}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedExpense.category}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant="outline">
                      {selectedExpense.type}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={
                      selectedExpense.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedExpense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {selectedExpense.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Financial Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-red-600 text-lg">
                      ₵{selectedExpense.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedExpense.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-base">
                  {selectedExpense.notes}
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              {permissions.canApprove && selectedExpense.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      setShowDetailsSheet(false);
                      setTimeout(() => handleApprove(selectedExpense.id), 300);
                    }}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white touch-manipulation active:scale-95"
                    disabled={updating === selectedExpense.id}
                  >
                    {updating === selectedExpense.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailsSheet(false);
                      setTimeout(() => handleReject(selectedExpense.id), 300);
                    }}
                    variant="outline"
                    className="flex-1 h-12 text-red-600 border-red-200 hover:bg-red-50 touch-manipulation active:scale-95"
                    disabled={updating === selectedExpense.id}
                  >
                    {updating === selectedExpense.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDetailsSheet(false)}
                className="flex-1 h-12 touch-manipulation active:scale-95"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}