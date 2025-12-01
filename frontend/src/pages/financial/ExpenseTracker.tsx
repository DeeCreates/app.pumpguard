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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Download, Eye, Edit, Trash2, Users, CreditCard } from "lucide-react";

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
  station_name?: string;
  creator_name?: string;
  creator_role?: string;
}

interface Station {
  id: string;
  name: string;
  omc_id: string;
  dealer_id: string;
  station_manager_id: string;
  location: string;
  status: 'active' | 'inactive';
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  station_id?: string;
  dealer_id?: string;
  omc_id?: string;
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
  canManageStations: boolean;
  canViewAllStations: boolean;
  canManageUsers: boolean;
  viewScope: 'all' | 'omc' | 'dealer' | 'station' | 'own';
  approvalLimit?: number;
  maxAmount?: number;
}

export default function ExpenseTracker() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationUsers, setStationUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  
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
    station_id: "",
    category: 'operational',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    type: 'operational' as Expense['type'],
    notes: '',
    receipt_url: ''
  });

  const [filters, setFilters] = useState({
    station_id: "all",
    category: 'all',
    type: 'all',
    status: 'all',
    date_from: '',
    date_to: '',
    search: ''
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  // User form state
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    role: 'attendant',
    station_id: '',
    password: ''
  });

  // Role-based permissions with updated logic - DEALER IS VIEW ONLY
  const getRolePermissions = useCallback((): RolePermissions => {
    const role = user?.role || 'attendant';
    
    const permissions: Record<string, RolePermissions> = {
      admin: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canManageStations: true,
        canViewAllStations: true,
        canManageUsers: true,
        viewScope: 'all',
        approvalLimit: 100000,
        maxAmount: 1000000
      },
      npa: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: true,
        canManageStations: false,
        canViewAllStations: true,
        canManageUsers: false,
        viewScope: 'all',
        approvalLimit: 500000
      },
      omc: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canManageStations: true,
        canViewAllStations: false,
        canManageUsers: true,
        viewScope: 'omc',
        approvalLimit: 50000,
        maxAmount: 100000
      },
      dealer: {
        canView: true,
        canCreate: false,  // DEALER CANNOT CREATE
        canEdit: false,    // DEALER CANNOT EDIT
        canDelete: false,  // DEALER CANNOT DELETE
        canApprove: false, // DEALER CANNOT APPROVE
        canManageStations: false, // DEALER CANNOT MANAGE STATIONS
        canViewAllStations: false,
        canManageUsers: false, // DEALER CANNOT MANAGE USERS
        viewScope: 'dealer',
        maxAmount: 0
      },
      station_manager: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canManageStations: false,
        canViewAllStations: false,
        canManageUsers: false,
        viewScope: 'station',
        approvalLimit: 5000,
        maxAmount: 20000
      },
      supervisor: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canManageStations: false,
        canViewAllStations: false,
        canManageUsers: false,
        viewScope: 'station'
      },
      attendant: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canManageStations: false,
        canViewAllStations: false,
        canManageUsers: false,
        viewScope: 'own'
      }
    };

    return permissions[role] || permissions.attendant;
  }, [user?.role]);

  const permissions = getRolePermissions();

  // Load accessible stations based on role
  const loadStations = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('stations')
        .select('*')
        .order('name');

      // Apply role-based filtering for stations
      if (permissions.viewScope === 'omc' && user.omc_id) {
        query = query.eq('omc_id', user.omc_id);
      } else if (permissions.viewScope === 'dealer' && user.dealer_id) {
        query = query.eq('dealer_id', user.dealer_id);
      } else if (permissions.viewScope === 'station' && user.station_id) {
        query = query.eq('id', user.station_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to load stations:', error);
        toast.error('Failed to load stations');
        return;
      }

      setStations(data || []);
      
      // Set default station for non-admin users
      if (!permissions.canViewAllStations && data && data.length > 0) {
        if (permissions.viewScope === 'station' && user.station_id) {
          setSelectedStationId(user.station_id);
          setFilters(prev => ({ ...prev, station_id: user.station_id }));
        } else if (data[0].id) {
          setSelectedStationId(data[0].id);
          setFilters(prev => ({ ...prev, station_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
      toast.error('Failed to load stations');
    }
  }, [user?.id, user?.omc_id, user?.dealer_id, user?.station_id, permissions.viewScope, permissions.canViewAllStations]);

  // Load users for current station/scope (only for OMC and Admin)
  const loadUsers = useCallback(async () => {
    if (!user?.id || !permissions.canManageUsers) return;

    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('full_name');

      // Apply role-based filtering for users
      if (permissions.viewScope === 'omc' && user.omc_id) {
        query = query.eq('omc_id', user.omc_id);
      } else if (permissions.viewScope === 'dealer' && user.dealer_id) {
        // Dealers cannot manage users, so this shouldn't be called
        setStationUsers([]);
        return;
      } else if (permissions.viewScope === 'station' && user.station_id) {
        query = query.eq('station_id', user.station_id);
      } else if (!permissions.canViewAllStations) {
        // For non-admin, only show users in accessible stations
        const stationIds = stations.map(s => s.id);
        if (stationIds.length > 0) {
          query = query.in('station_id', stationIds);
        } else {
          setStationUsers([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to load users:', error);
        toast.error('Failed to load users');
        return;
      }

      setStationUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  }, [user?.id, user?.omc_id, user?.dealer_id, user?.station_id, stations, permissions.viewScope, permissions.canManageUsers, permissions.canViewAllStations]);

  // Load expenses with proper role-based filtering
  const loadExpenses = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First, get accessible station IDs based on role
      let accessibleStationIds: string[] = [];
      
      if (permissions.viewScope === 'all') {
        // Admin can see all stations
        accessibleStationIds = stations.map(s => s.id);
      } else if (permissions.viewScope === 'omc' && user.omc_id) {
        accessibleStationIds = stations.filter(s => s.omc_id === user.omc_id).map(s => s.id);
      } else if (permissions.viewScope === 'dealer' && user.dealer_id) {
        // Dealer can only view their stations
        accessibleStationIds = stations.filter(s => s.dealer_id === user.dealer_id).map(s => s.id);
      } else if (permissions.viewScope === 'station' && user.station_id) {
        accessibleStationIds = [user.station_id];
      }

      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      // Apply role-based filtering
      if (permissions.viewScope !== 'all' && accessibleStationIds.length > 0) {
        if (permissions.viewScope === 'own') {
          // Attendants can only see their own expenses
          query = query.eq('created_by', user.id);
        } else {
          // Others can see expenses from accessible stations
          query = query.in('station_id', accessibleStationIds);
        }
      }

      // Apply additional filters
      if (filters.station_id !== 'all') {
        query = query.eq('station_id', filters.station_id);
      }
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

      const { data: expensesData, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        // If expenses table doesn't exist, use empty data
        if (error.code === 'PGRST204' || error.code === '42P01') {
          console.log('Expenses table not found, using demo mode');
          setExpenses([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Now fetch station names and creator names separately
      const expensesWithDetails = await Promise.all(
        (expensesData || []).map(async (expense) => {
          let stationName = 'Unknown Station';
          let creatorName = 'Unknown User';
          let creatorRole = 'Unknown';

          // Get station name
          if (expense.station_id) {
            try {
              const { data: stationData } = await supabase
                .from('stations')
                .select('name')
                .eq('id', expense.station_id)
                .single();
              
              if (stationData) {
                stationName = stationData.name;
              }
            } catch (err) {
              console.error('Error fetching station:', err);
            }
          }

          // Get creator info
          if (expense.created_by) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('full_name, role')
                .eq('id', expense.created_by)
                .single();
              
              if (userData) {
                creatorName = userData.full_name || 'Unknown';
                creatorRole = userData.role || 'Unknown';
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }

          return {
            ...expense,
            station_name: stationName,
            creator_name: creatorName,
            creator_role: creatorRole
          };
        })
      );

      setExpenses(expensesWithDetails);
      calculateStats(expensesWithDetails);
    } catch (error: any) {
      console.error('Failed to load expenses:', error);
      toast.error('Failed to load expenses. Please check your database setup.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.omc_id, user?.dealer_id, user?.station_id, stations, permissions.viewScope, filters]);

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

  // Create expense with role-based validation
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canCreate) {
      toast.error('You do not have permission to create expenses');
      return;
    }

    // For dealers who can only view, show error
    if (user?.role === 'dealer') {
      toast.error('Dealers can only view expenses, not create them');
      return;
    }

    // Validate station access
    const stationId = expenseForm.station_id || user?.station_id;
    if (!stationId) {
      toast.error('Please select a station');
      return;
    }

    // Check if user has access to the selected station
    if (permissions.viewScope === 'station' && stationId !== user?.station_id) {
      toast.error('You can only create expenses for your station');
      return;
    }

    // Check if dealer has access to the selected station
    if (permissions.viewScope === 'dealer') {
      const isAccessible = stations.some(s => s.id === stationId && s.dealer_id === user?.dealer_id);
      if (!isAccessible) {
        toast.error('You can only create expenses for your stations');
        return;
      }
    }

    // Check amount limit
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (permissions.maxAmount && amount > permissions.maxAmount) {
      toast.error(`Amount exceeds your maximum limit of ₵${permissions.maxAmount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const expenseData = {
        station_id: stationId,
        category: expenseForm.category,
        description: expenseForm.description,
        amount: amount,
        expense_date: expenseForm.expense_date,
        type: expenseForm.type,
        notes: expenseForm.notes,
        receipt_url: expenseForm.receipt_url,
        created_by: user?.id,
        status: permissions.canApprove && amount <= (permissions.approvalLimit || 0) ? 'approved' : 'pending'
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        console.error('Create expense error:', error);
        // If table doesn't exist, show success message but don't save
        if (error.code === 'PGRST204' || error.code === '42P01') {
          toast.success('Expense recorded (demo mode - table not found)');
          setShowAddDialog(false);
          resetExpenseForm();
          return;
        }
        throw error;
      }

      toast.success('Expense recorded successfully!');
      setShowAddDialog(false);
      resetExpenseForm();
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      toast.error(`Failed to record expense: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Create new user (for OMCs and Admin with permission)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageUsers) {
      toast.error('You do not have permission to manage users');
      return;
    }

    setSubmitting(true);
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: userForm.full_name,
            role: userForm.role,
            station_id: userForm.station_id || null,
            omc_id: permissions.viewScope === 'omc' ? user?.omc_id : undefined,
            dealer_id: permissions.viewScope === 'dealer' ? user?.dealer_id : undefined
          }
        }
      });

      if (authError) throw authError;

      // Then create user record in users table
      const userData = {
        id: authData.user?.id,
        email: userForm.email,
        full_name: userForm.full_name,
        role: userForm.role,
        station_id: userForm.station_id || null,
        omc_id: permissions.viewScope === 'omc' ? user?.omc_id : undefined,
        dealer_id: permissions.viewScope === 'dealer' ? user?.dealer_id : undefined
      };

      const { error: userError } = await supabase
        .from('users')
        .insert([userData]);

      if (userError) {
        console.error('Create user record error:', userError);
        if (userError.code === 'PGRST204' || userError.code === '42P01') {
          toast.success('User created (demo mode - users table not found)');
          setShowAddUserDialog(false);
          resetUserForm();
          return;
        }
        throw userError;
      }

      toast.success('User created successfully!');
      setShowAddUserDialog(false);
      resetUserForm();
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Update expense status with approval limits
  const handleUpdateStatus = async (expenseId: string, status: Expense['status']) => {
    if (!permissions.canApprove) {
      toast.error('You do not have permission to approve expenses');
      return;
    }

    // Dealers cannot approve
    if (user?.role === 'dealer') {
      toast.error('Dealers cannot approve expenses');
      return;
    }

    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
      toast.error('Expense not found');
      return;
    }

    // Check approval limit
    if (expense.amount > (permissions.approvalLimit || 0)) {
      toast.error(`Amount exceeds your approval limit of ₵${permissions.approvalLimit?.toLocaleString()}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ 
          status, 
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) {
        console.error('Update status error:', error);
        if (error.code === 'PGRST204' || error.code === '42P01') {
          toast.success(`Expense ${status} (demo mode)`);
          await loadExpenses();
          return;
        }
        throw error;
      }

      toast.success(`Expense ${status} successfully`);
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense status');
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!permissions.canDelete) {
      toast.error('You do not have permission to delete expenses');
      return;
    }

    // Dealers cannot delete
    if (user?.role === 'dealer') {
      toast.error('Dealers cannot delete expenses');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        console.error('Delete expense error:', error);
        if (error.code === 'PGRST204' || error.code === '42P01') {
          toast.success('Expense deleted (demo mode)');
          await loadExpenses();
          return;
        }
        throw error;
      }

      toast.success('Expense deleted successfully');
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Reset forms
  const resetExpenseForm = () => {
    const defaultStationId = selectedStationId || 
      (permissions.viewScope === 'station' ? user?.station_id : 
       stations.length > 0 ? stations[0].id : "");

    setExpenseForm({
      station_id: defaultStationId,
      category: 'operational',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      type: 'operational',
      notes: '',
      receipt_url: ''
    });
  };

  const resetUserForm = () => {
    const defaultStationId = selectedStationId || 
      (permissions.viewScope === 'station' ? user?.station_id : 
       stations.length > 0 ? stations[0].id : "");

    setUserForm({
      email: '',
      full_name: '',
      role: 'attendant',
      station_id: defaultStationId,
      password: ''
    });
  };

  // Export expenses
  const handleExport = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const csvContent = [
      ['Date', 'Station', 'Category', 'Description', 'Amount', 'Type', 'Status', 'Created By'],
      ...expenses.map(expense => [
        expense.expense_date,
        expense.station_name || 'Unknown',
        expense.category,
        expense.description,
        expense.amount.toString(),
        expense.type,
        expense.status,
        expense.creator_name || 'Unknown'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Expenses exported successfully');
  };

  // Initialize forms with default values
  useEffect(() => {
    if (stations.length > 0) {
      const defaultStationId = selectedStationId || 
        (permissions.viewScope === 'station' ? user?.station_id : 
         stations[0].id);

      if (defaultStationId && !expenseForm.station_id) {
        setExpenseForm(prev => ({ ...prev, station_id: defaultStationId }));
      }
    }
  }, [stations, selectedStationId, user?.station_id, permissions.viewScope, expenseForm.station_id]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (stations.length > 0) {
      loadExpenses();
      if (permissions.canManageUsers) {
        loadUsers();
      }
    }
  }, [stations, loadExpenses, loadUsers, permissions.canManageUsers]);

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

  // Determine if tabs should be shown (only show Users tab for Admin/OMC)
  const showUsersTab = permissions.canManageUsers && (user?.role === 'admin' || user?.role === 'omc');
  const showTabs = showUsersTab;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management System</h1>
          <p className="text-gray-600">
            {permissions.viewScope === 'all' ? 'All Stations' : 
             permissions.viewScope === 'omc' ? 'OMC Stations' :
             permissions.viewScope === 'dealer' ? 'My Stations (View Only)' :
             permissions.viewScope === 'station' ? 'My Station' : 'My Expenses'}
            {user?.role && ` • ${user.role.toUpperCase()}`}
            {user?.role === 'dealer' && ' (View Only)'}
          </p>
        </div>
        <div className="flex space-x-2">
          {activeTab === "expenses" && (
            <>
              <Button variant="outline" onClick={handleExport} disabled={expenses.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {permissions.canCreate && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={resetExpenseForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateExpense} className="space-y-4">
                      {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                        <div className="space-y-2">
                          <Label htmlFor="station">Station</Label>
                          <Select
                            value={expenseForm.station_id}
                            onValueChange={(value) => setExpenseForm({ ...expenseForm, station_id: value })}
                            disabled={user?.role === 'dealer'} // Dealers can't select station
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select station" />
                            </SelectTrigger>
                            <SelectContent>
                              {stations.map(station => (
                                <SelectItem key={station.id} value={station.id}>
                                  {station.name} - {station.location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={expenseForm.category}
                            onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                            disabled={user?.role === 'dealer'} // Dealers can't create
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
                            disabled={user?.role === 'dealer'} // Dealers can't create
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
                          disabled={user?.role === 'dealer'} // Dealers can't create
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₵)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0.00"
                            required
                            disabled={user?.role === 'dealer'} // Dealers can't create
                          />
                          {permissions.maxAmount ? (
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              Max: ₵{permissions.maxAmount.toLocaleString()}
                            </span>
                          ) : user?.role === 'dealer' && (
                            <span className="text-sm text-red-500 whitespace-nowrap">
                              View Only
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={expenseForm.expense_date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                          required
                          disabled={user?.role === 'dealer'} // Dealers can't create
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Input
                          id="notes"
                          value={expenseForm.notes}
                          onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                          placeholder="Additional notes"
                          disabled={user?.role === 'dealer'} // Dealers can't create
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={submitting || user?.role === 'dealer'}
                      >
                        {user?.role === 'dealer' ? 'View Only - Cannot Create' : 
                         submitting ? 'Recording...' : 'Record Expense'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs for different views - Only show if needed */}
      {showTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: showUsersTab ? '1fr 1fr' : '1fr' }}>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Expenses
            </TabsTrigger>
            {showUsersTab && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
            )}
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
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
                  {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                    <div className="space-y-2">
                      <Label>Station</Label>
                      <Select 
                        value={filters.station_id} 
                        onValueChange={(value) => setFilters({ ...filters, station_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stations</SelectItem>
                          {stations.map(station => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
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
                        {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                          <TableHead>Station</TableHead>
                        )}
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        {permissions.canApprove && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                            <TableCell className="font-medium">
                              {expense.station_name || 'Unknown'}
                            </TableCell>
                          )}
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
                          <TableCell>
                            {expense.creator_name || 'Unknown'}
                            <p className="text-xs text-gray-500">{expense.creator_role}</p>
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
                                      disabled={expense.amount > (permissions.approvalLimit || 0) || user?.role === 'dealer'}
                                      title={user?.role === 'dealer' ? 'Dealers cannot approve expenses' : 
                                             expense.amount > (permissions.approvalLimit || 0) ? `Exceeds your ₵${permissions.approvalLimit?.toLocaleString()} limit` : ''}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleUpdateStatus(expense.id, 'rejected')}
                                      disabled={user?.role === 'dealer'}
                                      title={user?.role === 'dealer' ? 'Dealers cannot reject expenses' : ''}
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
                                    disabled={user?.role === 'dealer'}
                                    title={user?.role === 'dealer' ? 'Dealers cannot delete expenses' : ''}
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
          </TabsContent>

          {/* Users Tab - Only for Admin and OMC */}
          {showUsersTab && (
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Users Management</h2>
                <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={resetUserForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          placeholder="user@example.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={userForm.full_name}
                          onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          placeholder="********"
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="attendant">Attendant</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="station_manager">Station Manager</SelectItem>
                            {user?.role === 'admin' && (
                              <>
                                <SelectItem value="dealer">Dealer</SelectItem>
                                <SelectItem value="omc">OMC</SelectItem>
                                <SelectItem value="npa">NPA</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </>
                            )}
                            {user?.role === 'omc' && (
                              <>
                                <SelectItem value="dealer">Dealer</SelectItem>
                                <SelectItem value="station_manager">Station Manager</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="attendant">Attendant</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {userForm.role !== 'admin' && userForm.role !== 'npa' && userForm.role !== 'omc' && (
                        <div className="space-y-2">
                          <Label htmlFor="station_id">Station</Label>
                          <Select
                            value={userForm.station_id}
                            onValueChange={(value) => setUserForm({ ...userForm, station_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select station" />
                            </SelectTrigger>
                            <SelectContent>
                              {stations.map(station => (
                                <SelectItem key={station.id} value={station.id}>
                                  {station.name} - {station.location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={submitting}
                      >
                        {submitting ? 'Creating...' : 'Create User'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-6">
                  {stationUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No users found</p>
                      <Button 
                        className="mt-2 bg-blue-600 hover:bg-blue-700"
                        onClick={() => setShowAddUserDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First User
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Station</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stationUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-medium">{userItem.full_name}</TableCell>
                            <TableCell>{userItem.email}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 capitalize">
                                {userItem.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {userItem.station_id ? 
                                stations.find(s => s.id === userItem.station_id)?.name || 'Unknown' : 
                                'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        /* No tabs - Just show expenses content */
        <div className="space-y-6">
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
                {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                  <div className="space-y-2">
                    <Label>Station</Label>
                    <Select 
                      value={filters.station_id} 
                      onValueChange={(value) => setFilters({ ...filters, station_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stations</SelectItem>
                        {stations.map(station => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                      {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                        <TableHead>Station</TableHead>
                      )}
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      {permissions.canApprove && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                          <TableCell className="font-medium">
                            {expense.station_name || 'Unknown'}
                          </TableCell>
                        )}
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
                        <TableCell>
                          {expense.creator_name || 'Unknown'}
                          <p className="text-xs text-gray-500">{expense.creator_role}</p>
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
                                    disabled={expense.amount > (permissions.approvalLimit || 0) || user?.role === 'dealer'}
                                    title={user?.role === 'dealer' ? 'Dealers cannot approve expenses' : 
                                           expense.amount > (permissions.approvalLimit || 0) ? `Exceeds your ₵${permissions.approvalLimit?.toLocaleString()} limit` : ''}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleUpdateStatus(expense.id, 'rejected')}
                                    disabled={user?.role === 'dealer'}
                                    title={user?.role === 'dealer' ? 'Dealers cannot reject expenses' : ''}
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
                                  disabled={user?.role === 'dealer'}
                                  title={user?.role === 'dealer' ? 'Dealers cannot delete expenses' : ''}
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
      )}
    </div>
  );
}