import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Download, Filter, Search, Eye, Edit, Trash2 } from "lucide-react";

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

export default function ExpenseTracker() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    operational: 0,
    fixed: 0,
    staff: 0,
    maintenance: 0,
    other: 0,
    pending_approval: 0
  });
  
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

  const [showAddDialog, setShowAddDialog] = useState(false);

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
      npa: {
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
        // If expenses table doesn't exist, use empty data
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
        // If table doesn't exist, show success message but don't save
        if (error.code === 'PGRST204') {
          toast.success('Expense recorded (demo mode)');
          setShowAddDialog(false);
          resetForm();
          return;
        }
        throw error;
      }

      toast.success('Expense recorded successfully!');
      setShowAddDialog(false);
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
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!permissions.canDelete) return;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Tracker</h1>
          <p className="text-gray-600">
            {permissions.viewScope === 'all' ? 'All Stations' : 
             permissions.viewScope === 'station' ? 'Station Expenses' : 'My Expenses'}
            {user?.role && ` • ${user.role.toUpperCase()}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {permissions.canCreate && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={expenseForm.category}
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                      >
                        <SelectTrigger>
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
                        <SelectTrigger>
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Recording...' : 'Record Expense'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold">₵{stats.total_expenses.toLocaleString()}</p>
                <p className="text-sm text-red-600">All Time</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operational</p>
                <p className="text-2xl font-bold">₵{stats.operational.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {stats.total_expenses > 0 ? ((stats.operational / stats.total_expenses) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Badge variant="outline" className={getTypeColor('operational')}>
                Variable
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fixed Costs</p>
                <p className="text-2xl font-bold">₵{stats.fixed.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {stats.total_expenses > 0 ? ((stats.fixed / stats.total_expenses) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Badge variant="secondary">Monthly</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold">₵{stats.pending_approval.toLocaleString()}</p>
                <p className="text-sm text-yellow-600">Awaiting Review</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search descriptions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No expenses found</p>
              {permissions.canCreate && (
                <Button 
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Expense
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  {permissions.canApprove && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.expense_date}</TableCell>
                    <TableCell className="font-medium capitalize">{expense.category}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="font-semibold">₵{expense.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(expense.type)}>
                        {expense.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(expense.status)}>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    {permissions.canApprove && (
                      <TableCell>
                        <div className="flex space-x-2">
                          {expense.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleUpdateStatus(expense.id, 'approved')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleUpdateStatus(expense.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {permissions.canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}