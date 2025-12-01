import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger 
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  Users, 
  FileText,
  Search,
  Calendar,
  ChevronDown,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function MobileExpenseTracker() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  const [stats, setStats] = useState({
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
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canManageStations: false,
        canViewAllStations: false,
        canManageUsers: false,
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

  // Load accessible stations
  const loadStations = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('stations')
        .select('*')
        .order('name');

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
      
      // Set default station
      if (!permissions.canViewAllStations && data && data.length > 0) {
        if (permissions.viewScope === 'station' && user.station_id) {
          setExpenseForm(prev => ({ ...prev, station_id: user.station_id! }));
        } else if (data[0].id) {
          setExpenseForm(prev => ({ ...prev, station_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
      toast.error('Failed to load stations');
    }
  }, [user?.id, user?.omc_id, user?.dealer_id, user?.station_id, permissions.viewScope, permissions.canViewAllStations]);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let accessibleStationIds: string[] = [];
      
      if (permissions.viewScope === 'all') {
        accessibleStationIds = stations.map(s => s.id);
      } else if (permissions.viewScope === 'omc' && user.omc_id) {
        accessibleStationIds = stations.filter(s => s.omc_id === user.omc_id).map(s => s.id);
      } else if (permissions.viewScope === 'dealer' && user.dealer_id) {
        accessibleStationIds = stations.filter(s => s.dealer_id === user.dealer_id).map(s => s.id);
      } else if (permissions.viewScope === 'station' && user.station_id) {
        accessibleStationIds = [user.station_id];
      }

      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (permissions.viewScope !== 'all' && accessibleStationIds.length > 0) {
        if (permissions.viewScope === 'own') {
          query = query.eq('created_by', user.id);
        } else {
          query = query.in('station_id', accessibleStationIds);
        }
      }

      // Apply active tab filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
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
        if (error.code === 'PGRST204' || error.code === '42P01') {
          setExpenses([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Fetch station and creator names
      const expensesWithDetails = await Promise.all(
        (expensesData || []).map(async (expense) => {
          let stationName = 'Unknown Station';
          let creatorName = 'Unknown User';
          let creatorRole = 'Unknown';

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
      toast.error('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.omc_id, user?.dealer_id, user?.station_id, stations, permissions.viewScope, filters, activeTab]);

  // Calculate statistics
  const calculateStats = useCallback((expenseData: Expense[]) => {
    const stats = {
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
    if (!permissions.canCreate) {
      toast.error('You do not have permission to create expenses');
      return;
    }

    if (user?.role === 'dealer') {
      toast.error('Dealers can only view expenses');
      return;
    }

    const stationId = expenseForm.station_id || user?.station_id;
    if (!stationId) {
      toast.error('Please select a station');
      return;
    }

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
        if (error.code === 'PGRST204' || error.code === '42P01') {
          toast.success('Expense recorded (demo mode)');
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

  // Update expense status
  const handleUpdateStatus = async (expenseId: string, status: Expense['status']) => {
    if (!permissions.canApprove) {
      toast.error('You do not have permission to approve expenses');
      return;
    }

    if (user?.role === 'dealer') {
      toast.error('Dealers cannot approve expenses');
      return;
    }

    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
      toast.error('Expense not found');
      return;
    }

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

    if (user?.role === 'dealer') {
      toast.error('Dealers cannot delete expenses');
      return;
    }

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
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

  const resetExpenseForm = () => {
    const defaultStationId = expenseForm.station_id || 
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

  // Initialize
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (stations.length > 0) {
      loadExpenses();
    }
  }, [stations, loadExpenses]);

  const getStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Expense['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeIcon = (type: Expense['type']) => {
    switch (type) {
      case 'operational': return <Building className="w-4 h-4" />;
      case 'fixed': return <FileText className="w-4 h-4" />;
      case 'staff': return <Users className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'other': return <MoreVertical className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Wrench icon component
  const Wrench = ({ className }: { className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {permissions.viewScope === 'all' ? 'All Stations' : 
               permissions.viewScope === 'omc' ? 'OMC Stations' :
               permissions.viewScope === 'dealer' ? 'My Stations' :
               permissions.viewScope === 'station' ? 'My Station' : 'My Expenses'}
              {user?.role === 'dealer' && ' (View Only)'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(true)}
              className="h-10 w-10"
            >
              <Filter className="w-4 h-4" />
            </Button>
            {permissions.canCreate && user?.role !== 'dealer' && (
              <Button
                size="sm"
                onClick={() => {
                  resetExpenseForm();
                  setShowAddDialog(true);
                }}
                className="h-10 px-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-sm">Add</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards (Horizontal Scroll on Mobile) */}
      <div className="px-4 py-4">
        <div className="flex space-x-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Card className="min-w-[280px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.total_expenses)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">All Time</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-[280px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Operational</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.operational)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.total_expenses > 0 
                      ? `${((stats.operational / stats.total_expenses) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Variable
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-[280px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Pending Approval</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.pending_approval)}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Awaiting Review</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="px-4 py-2">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-shrink-0",
              activeTab === 'all' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            All
          </Button>
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-shrink-0",
              activeTab === 'pending' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Button>
          <Button
            variant={activeTab === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('approved')}
            className={cn(
              "flex-shrink-0",
              activeTab === 'approved' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Button>
          <Button
            variant={activeTab === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "flex-shrink-0",
              activeTab === 'rejected' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-gray-600">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No expenses found</p>
            {permissions.canCreate && user?.role !== 'dealer' && (
              <Button
                onClick={() => {
                  resetExpenseForm();
                  setShowAddDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      {getTypeIcon(expense.type)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {expense.category}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Badge className={cn("text-xs", getStatusColor(expense.status))}>
                        <span className="flex items-center">
                          {getStatusIcon(expense.status)}
                          <span className="ml-1 capitalize">{expense.status}</span>
                        </span>
                      </Badge>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 h-8 w-8"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-xl">
                          <SheetHeader className="mb-4">
                            <SheetTitle>Expense Actions</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-2">
                            {expense.status === 'pending' && permissions.canApprove && user?.role !== 'dealer' && (
                              <>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50"
                                  onClick={() => handleUpdateStatus(expense.id, 'approved')}
                                  disabled={expense.amount > (permissions.approvalLimit || 0)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleUpdateStatus(expense.id, 'rejected')}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {permissions.canDelete && user?.role !== 'dealer' && (
                              <Button
                                variant="outline"
                                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => {
                                // Navigate to expense detail
                                toast.info('Expense detail view coming soon');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>

                  <p className="text-gray-800 mb-3 line-clamp-2">
                    {expense.description}
                  </p>

                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-600">
                        {formatDate(expense.expense_date)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {expense.creator_name} • {expense.creator_role}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>

                  {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                    <div className="flex items-center text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      <Building className="w-3 h-3 mr-1" />
                      {expense.station_name || 'Unknown Station'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
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
                  disabled={user?.role === 'dealer'}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                  disabled={user?.role === 'dealer'}
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
                  disabled={user?.role === 'dealer'}
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
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Expense description"
                disabled={user?.role === 'dealer'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₵)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  disabled={user?.role === 'dealer'}
                />
                {permissions.maxAmount && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Max: {formatCurrency(permissions.maxAmount)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                disabled={user?.role === 'dealer'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="Additional notes"
                disabled={user?.role === 'dealer'}
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

      {/* Filters Drawer */}
      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Filter Expenses</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-4 overflow-y-auto">
            <div className="space-y-4">
              {(permissions.canViewAllStations || permissions.viewScope === 'omc' || permissions.viewScope === 'dealer') && (
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Select
                    value={filters.station_id}
                    onValueChange={(value) => setFilters({ ...filters, station_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Stations" />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
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
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters({ ...filters, type: value })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFilters({
                    station_id: "all",
                    category: 'all',
                    type: 'all',
                    status: 'all',
                    date_from: '',
                    date_to: '',
                    search: ''
                  })}
                >
                  Clear Filters
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowFilters(false);
                    loadExpenses();
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}