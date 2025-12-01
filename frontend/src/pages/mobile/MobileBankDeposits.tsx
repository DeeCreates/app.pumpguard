// src/pages/mobile/MobileBankDeposits.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import {
  Building2,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Download,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Banknote,
  CreditCard,
  User,
  FileText,
  Filter,
  MoreVertical,
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Menu,
  Home,
  Bell,
  BarChart,
  Wallet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../hooks/use-auth';
import { useNavigate } from 'react-router-dom';

interface BankDeposit {
  id: string;
  station_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  reference_number: string;
  deposited_by: string;
  status: 'pending' | 'confirmed' | 'reconciled';
  notes?: string;
  reconciliation_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  station_name?: string;
  profiles?: {
    full_name: string;
  };
}

interface MobileBankDepositsProps {
  stationId?: string;
  stationName?: string;
  compact?: boolean;
  showAllStations?: boolean;
}

// Mobile-specific components
const MobileStatusBar = ({ isOnline, pendingSync }: { 
  isOnline: boolean; 
  pendingSync: number;
}) => (
  <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-700">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-orange-600" />
            <span className="text-xs text-orange-700">Offline</span>
          </div>
        )}
        {pendingSync > 0 && (
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
            {pendingSync} pending
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  </div>
);

const MobileQuickAction = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "default",
  disabled = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning";
  disabled?: boolean;
}) => {
  const variantClasses = {
    default: "bg-gray-100 hover:bg-gray-200 border-gray-200",
    primary: "bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700",
    success: "bg-green-100 hover:bg-green-200 border-green-200 text-green-700",
    warning: "bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border ${variantClasses[variant]} active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const MobileStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  onClick 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  onClick?: () => void;
}) => {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600"
  };

  return (
    <Card 
      className="active:scale-98 transition-transform"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileDepositItem = ({ 
  deposit,
  onView,
  onEdit,
  onDelete
}: { 
  deposit: BankDeposit;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'reconciled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'reconciled':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-xl mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className={getStatusColor(deposit.status)}>
              {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
            </Badge>
            {getStatusIcon(deposit.status)}
          </div>
          <h3 className="font-bold text-lg text-gray-900">
            {deposit.bank_name}
          </h3>
          <p className="text-sm text-gray-600">
            Ref: {deposit.reference_number}
          </p>
          {deposit.station_name && (
            <p className="text-xs text-gray-500 mt-1">
              {deposit.station_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onView}
            className="h-8 w-8 p-0"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="font-bold text-green-600">
            ₵{deposit.amount.toLocaleString()}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500">Date</p>
          <p className="font-semibold">
            {new Date(deposit.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Account:</span>
          <span className="font-medium">{deposit.account_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">By:</span>
          <span className="font-medium">{deposit.deposited_by}</span>
        </div>
      </div>

      {deposit.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{deposit.notes}</p>
        </div>
      )}
    </div>
  );
};

const PullToRefresh = ({ onRefresh, refreshing }: { 
  onRefresh: () => void; 
  refreshing: boolean;
}) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshingState, setRefreshingState] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY > 0) {
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    const pullDistance = currentY - startY;
    if (pullDistance > 100 && !refreshing) {
      setRefreshingState(true);
      onRefresh();
      setTimeout(() => setRefreshingState(false), 1000);
    }
    setStartY(0);
    setCurrentY(0);
  };

  const pullDistance = Math.max(0, currentY - startY);
  const progress = Math.min(100, (pullDistance / 100) * 100);

  if (refreshing || refreshingState) {
    return (
      <div className="flex items-center justify-center py-3 bg-blue-50">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-blue-600">Refreshing...</span>
      </div>
    );
  }

  if (pullDistance > 0) {
    return (
      <div 
        className="flex items-center justify-center py-3"
        style={{
          height: `${Math.min(100, pullDistance)}px`,
          background: `linear-gradient(to bottom, rgba(59, 130, 246, ${progress/100}), white)`
        }}
      >
        <RefreshCw className="w-5 h-5 text-blue-600" style={{ transform: `rotate(${progress * 3.6}deg)` }} />
        <span className="ml-2 text-sm text-blue-600">
          {progress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    );
  }

  return null;
};

// Available banks
const availableBanks = [
  'GCB Bank',
  'Ecobank Ghana',
  'Stanbic Bank',
  'Standard Chartered',
  'Zenith Bank',
  'Fidelity Bank',
  'Absa Bank',
  'Consolidated Bank',
  'Other Bank'
];

export default function MobileBankDeposits({ stationId, stationName, compact = false }: MobileBankDepositsProps) {
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [showNewDepositDialog, setShowNewDepositDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'reports'>('overview');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [depositForm, setDepositForm] = useState({
    station_id: stationId || '',
    amount: '',
    bank_name: 'GCB Bank',
    account_number: '',
    reference_number: '',
    deposited_by: '',
    notes: '',
    deposit_date: new Date().toISOString().split('T')[0]
  });

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data
  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'station_manager' && user.station_id) {
        setSelectedStation(user.station_id);
      }

      await Promise.all([
        loadDeposits(),
        loadAvailableStations()
      ]);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to load bank deposit data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStations = async () => {
    try {
      let stationsResponse;
      
      if (user?.role === 'omc' && user.omc_id) {
        stationsResponse = await api.getStationsByOMC(user.omc_id);
      } else if (user?.role === 'station_manager' && user.station_id) {
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.id === user.station_id) || []
          };
        }
      } else {
        stationsResponse = await api.getAllStations();
      }

      if (stationsResponse?.success && stationsResponse.data) {
        setAvailableStations(stationsResponse.data);
        
        if (!depositForm.station_id && stationsResponse.data.length > 0 && user?.role !== 'station_manager') {
          setDepositForm(prev => ({ ...prev, station_id: stationsResponse.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadDeposits = async () => {
    try {
      const filters: any = {};
      
      if (selectedStation) {
        filters.station_id = selectedStation;
      }

      const response = await api.getBankDeposits(filters);
      
      if (response.success) {
        setDeposits(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load deposits",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load bank deposits",
        variant: "destructive",
      });
    }
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await loadDeposits();
    setRefreshing(false);
  };

  // Filter deposits
  const filteredDeposits = deposits.filter(deposit => {
    if (statusFilter !== 'all' && deposit.status !== statusFilter) return false;
    if (searchTerm && !deposit.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !deposit.bank_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate totals
  const totalDeposits = filteredDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const confirmedDeposits = filteredDeposits.filter(d => d.status === 'confirmed' || d.status === 'reconciled');
  const totalConfirmed = confirmedDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const pendingDeposits = filteredDeposits.filter(d => d.status === 'pending');
  const totalPending = pendingDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const todayDeposits = filteredDeposits.filter(d => 
    new Date(d.created_at).toDateString() === new Date().toDateString()
  );
  const todayTotal = todayDeposits.reduce((sum, dep) => sum + dep.amount, 0);

  // Permission checks
  const canCreateDeposit = () => {
    if (!user) return false;
    const allowedRoles = ['admin', 'omc', 'station_manager'];
    return allowedRoles.includes(user.role);
  };

  const canManageDeposits = () => {
    if (!user) return false;
    return ['admin', 'omc'].includes(user.role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateDeposit()) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create deposits",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      if (!depositForm.amount || !depositForm.bank_name || !depositForm.account_number || 
          !depositForm.reference_number || !depositForm.deposited_by) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(depositForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid amount greater than 0",
          variant: "destructive",
        });
        return;
      }

      const depositData = {
        station_id: depositForm.station_id,
        amount: amount,
        bank_name: depositForm.bank_name,
        account_number: depositForm.account_number,
        reference_number: depositForm.reference_number,
        deposited_by: depositForm.deposited_by,
        notes: depositForm.notes || undefined,
        deposit_date: depositForm.deposit_date
      };

      const response = await api.createBankDeposit(depositData);
      
      if (response.success) {
        await loadDeposits();
        setShowNewDepositDialog(false);
        resetForm();
        toast({
          title: "Success",
          description: "Bank deposit recorded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to record deposit",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Error",
        description: "Failed to record bank deposit",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;

    try {
      setSubmitting(true);

      const amount = parseFloat(depositForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid amount greater than 0",
          variant: "destructive",
        });
        return;
      }

      const updateData = {
        amount: amount,
        bank_name: depositForm.bank_name,
        account_number: depositForm.account_number,
        reference_number: depositForm.reference_number,
        deposited_by: depositForm.deposited_by,
        notes: depositForm.notes || undefined
      };

      const response = await api.updateBankDeposit(selectedDeposit.id, updateData);
      
      if (response.success) {
        await loadDeposits();
        setShowEditDialog(false);
        resetForm();
        toast({
          title: "Success",
          description: "Deposit updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update deposit",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error updating deposit:', error);
      toast({
        title: "Error",
        description: "Failed to update deposit",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeposit) return;

    try {
      setSubmitting(true);
      const response = await api.deleteBankDeposit(selectedDeposit.id);
      
      if (response.success) {
        await loadDeposits();
        toast({
          title: "Success",
          description: "Deposit deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete deposit",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error deleting deposit:', error);
      toast({
        title: "Error",
        description: "Failed to delete deposit",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: 'pending' | 'confirmed' | 'reconciled') => {
    try {
      const response = await api.updateBankDeposit(id, { status });
      
      if (response.success) {
        await loadDeposits();
        toast({
          title: "Success",
          description: `Deposit status updated to ${status}`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update deposit status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating deposit status:', error);
      toast({
        title: "Error",
        description: "Failed to update deposit status",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        deposits: filteredDeposits,
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.full_name || user?.email,
          total_records: filteredDeposits.length,
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-deposits-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredDeposits.length} deposits`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export deposit data",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    const defaultStation = stationId || (availableStations.length > 0 ? availableStations[0].id : '');
    
    setDepositForm({
      station_id: defaultStation,
      amount: '',
      bank_name: 'GCB Bank',
      account_number: '',
      reference_number: '',
      deposited_by: '',
      notes: '',
      deposit_date: new Date().toISOString().split('T')[0]
    });
  };

  const openEditDialog = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    setDepositForm({
      station_id: deposit.station_id,
      amount: deposit.amount.toString(),
      bank_name: deposit.bank_name,
      account_number: deposit.account_number,
      reference_number: deposit.reference_number,
      deposited_by: deposit.deposited_by,
      notes: deposit.notes || '',
      deposit_date: deposit.created_at.split('T')[0]
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    if (confirm(`Delete deposit ${deposit.reference_number}? This action cannot be undone.`)) {
      handleDelete();
    }
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <MobileStatCard
          title="Total Deposits"
          value={`₵${totalDeposits.toLocaleString()}`}
          icon={DollarSign}
          subtitle={`${filteredDeposits.length} records`}
        />
        <MobileStatCard
          title="Today"
          value={`₵${todayTotal.toLocaleString()}`}
          icon={Calendar}
          subtitle={`${todayDeposits.length} deposits`}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            <MobileQuickAction
              icon={Plus}
              label="New Deposit"
              onClick={() => setShowNewDepositDialog(true)}
              variant="primary"
            />
            <MobileQuickAction
              icon={Filter}
              label="Filter"
              onClick={() => setShowFilterSheet(true)}
              variant="default"
            />
            <MobileQuickAction
              icon={Download}
              label="Export"
              onClick={handleExport}
              variant="warning"
              disabled={filteredDeposits.length === 0}
            />
            <MobileQuickAction
              icon={RefreshCw}
              label="Refresh"
              onClick={refreshAllData}
              variant="default"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Deposits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Deposits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredDeposits.slice(0, 3).map((deposit) => (
            <MobileDepositItem
              key={deposit.id}
              deposit={deposit}
              onView={() => {}}
              onEdit={() => openEditDialog(deposit)}
              onDelete={() => openDeleteDialog(deposit)}
            />
          ))}
          {filteredDeposits.length === 0 && (
            <div className="text-center py-6">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deposits found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDeposits = () => (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search deposits..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilterSheet(true)}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Deposits List */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {filteredDeposits.map((deposit) => (
            <MobileDepositItem
              key={deposit.id}
              deposit={deposit}
              onView={() => {}}
              onEdit={() => openEditDialog(deposit)}
              onDelete={() => openDeleteDialog(deposit)}
            />
          ))}
          {filteredDeposits.length === 0 && (
            <div className="text-center py-6">
              <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deposits match your search</p>
              <Button 
                onClick={() => setShowNewDepositDialog(true)}
                className="mt-3 bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Deposit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deposit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Deposits</span>
              <span className="font-bold">₵{totalDeposits.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Confirmed & Reconciled</span>
              <span className="font-bold text-green-600">₵{totalConfirmed.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-bold text-orange-600">₵{totalPending.toLocaleString()}</span>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Confirmed</p>
                <p className="text-xl font-bold">{confirmedDeposits.length}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Pending</p>
                <p className="text-xl font-bold">{pendingDeposits.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Button
            onClick={handleExport}
            disabled={filteredDeposits.length === 0}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Bank Deposits</h4>
          {canCreateDeposit() && (
            <Button 
              size="sm"
              onClick={() => setShowNewDepositDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Deposit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600">Today</p>
            <p className="text-lg font-bold">₵{todayTotal.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600">Pending</p>
            <p className="text-lg font-bold">{pendingDeposits.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 safe-area-padding">
      {/* Status Bar */}
      <MobileStatusBar isOnline={isOnline} pendingSync={pendingSync} />

      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bank Deposits</h1>
            <div className="flex items-center gap-2 mt-1">
              {stationName && (
                <span className="text-xs text-gray-600">{stationName}</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowActionsSheet(true)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Pull to refresh */}
        <PullToRefresh onRefresh={refreshAllData} refreshing={refreshing} />

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-gray-200 mb-4">
          {['overview', 'deposits', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'deposits' && 'Deposits'}
              {tab === 'reports' && 'Reports'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'deposits' && renderDeposits()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Floating Action Button */}
      {canCreateDeposit() && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewDepositDialog(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* New Deposit Dialog */}
      <Dialog open={showNewDepositDialog} onOpenChange={setShowNewDepositDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Bank Deposit</DialogTitle>
            <DialogDescription>Enter deposit details</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {(user?.role === 'admin' || user?.role === 'omc') && (
                <div>
                  <Label>Station</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={depositForm.station_id}
                    onChange={(e) => setDepositForm(prev => ({ ...prev, station_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Station</option>
                    {availableStations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label>Amount (₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label>Bank Name</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={depositForm.bank_name}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, bank_name: e.target.value }))}
                  required
                >
                  {availableBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Account Number</Label>
                <Input
                  value={depositForm.account_number}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  value={depositForm.reference_number}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="REF-123456"
                  required
                />
              </div>

              <div>
                <Label>Deposited By</Label>
                <Input
                  value={depositForm.deposited_by}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, deposited_by: e.target.value }))}
                  placeholder="Staff name"
                  required
                />
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={depositForm.deposit_date}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, deposit_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={2}
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Deposit
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] bg-white p-4 rounded-2xl mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Deposit</DialogTitle>
            <DialogDescription>Update deposit details</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Amount (₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label>Bank Name</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={depositForm.bank_name}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, bank_name: e.target.value }))}
                  required
                >
                  {availableBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Account Number</Label>
                <Input
                  value={depositForm.account_number}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  value={depositForm.reference_number}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="REF-123456"
                  required
                />
              </div>

              <div>
                <Label>Deposited By</Label>
                <Input
                  value={depositForm.deposited_by}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, deposited_by: e.target.value }))}
                  placeholder="Staff name"
                  required
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={2}
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Deposit
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Sheet */}
      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter Deposits</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Status</Label>
              <select
                className="w-full p-2 border rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>

            {(user?.role === 'admin' || user?.role === 'omc') && (
              <div>
                <Label className="mb-2 block">Station</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                >
                  <option value="">All Stations</option>
                  {availableStations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Date Range</Label>
              <select
                className="w-full p-2 border rounded-lg"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <Button
              onClick={() => {
                setShowFilterSheet(false);
                refreshAllData();
              }}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Actions Sheet */}
      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Actions</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                refreshAllData();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-3" />
              Refresh Data
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setShowActionsSheet(false);
                handleExport();
              }}
            >
              <Download className="w-4 h-4 mr-3" />
              Export Data
            </Button>
            {canCreateDeposit() && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setShowActionsSheet(false);
                  setShowNewDepositDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-3" />
                New Deposit
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}