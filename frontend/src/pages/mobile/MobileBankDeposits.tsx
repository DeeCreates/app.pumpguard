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
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
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
  Filter,
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
  MoreVertical
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../hooks/use-auth';

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
  omc_name?: string;
  profiles?: {
    full_name: string;
  };
}

interface BankDepositsProps {
  stationId?: string;
  stationName?: string;
  compact?: boolean;
  showAllStations?: boolean;
}

// Enhanced export function with multiple formats
const exportData = (data: any, filename: string, format: 'json' | 'csv' = 'json') => {
  let blob: Blob;
  let mimeType: string;
  
  if (format === 'csv') {
    const headers = ['ID', 'Station', 'Amount', 'Bank', 'Account Number', 'Reference', 'Deposited By', 'Status', 'Date', 'Notes'];
    const csvData = data.deposits.map((deposit: any) => [
      deposit.id,
      deposit.station_name || deposit.station_id,
      deposit.amount,
      deposit.bank_name,
      deposit.account_number,
      deposit.reference_number,
      deposit.deposited_by,
      deposit.status,
      new Date(deposit.created_at).toLocaleDateString(),
      deposit.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any) => row.map((field: any) => `"${field}"`).join(','))
    ].join('\n');
    
    blob = new Blob([csvContent], { type: 'text/csv' });
    mimeType = 'text/csv';
  } else {
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    mimeType = 'application/json';
  }
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Mobile-optimized Bottom Sheet Component
const BottomSheet = React.memo(({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children,
  className = ""
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`fixed bottom-0 left-0 right-0 mx-auto max-h-[90vh] rounded-t-2xl rounded-b-none border-0 shadow-2xl flex flex-col p-0 ${className}`}>
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl font-semibold text-black">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-gray-600">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

BottomSheet.displayName = 'BottomSheet';

// Mobile Action Sheet Component
const ActionSheet = React.memo(({
  open,
  onOpenChange,
  title,
  actions,
  destructiveIndex
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: { label: string; action: () => void; icon?: React.ReactNode }[];
  destructiveIndex?: number;
}) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="max-w-lg"
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.action();
              onOpenChange(false);
            }}
            className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors ${
              index === destructiveIndex
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {action.icon}
              {action.label}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center p-4 rounded-xl text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
});

ActionSheet.displayName = 'ActionSheet';

export function BankDeposits({ stationId, stationName, compact = false, showAllStations = false }: BankDepositsProps) {
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<BankDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30days');
  const [exporting, setExporting] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedDeposit, setExpandedDeposit] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // FIXED: Use useCallback to memoize form state initialization
  const initializeForm = useCallback(() => ({
    station_id: stationId || (availableStations.length > 0 ? availableStations[0].id : ''),
    amount: '',
    bank_name: 'GCB Bank',
    account_number: '',
    reference_number: '',
    deposited_by: '',
    notes: '',
    deposit_date: new Date().toISOString().split('T')[0]
  }), [stationId, availableStations]);

  const [form, setForm] = useState(initializeForm);
  const [editForm, setEditForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    reference_number: '',
    deposited_by: '',
    notes: '',
    deposit_date: ''
  });

  // Available banks in Ghana
  const availableBanks = [
    'GCB Bank',
    'Ecobank Ghana',
    'Stanbic Bank',
    'Standard Chartered',
    'Zenith Bank',
    'Fidelity Bank',
    'Absa Bank',
    'Consolidated Bank',
    'Cal Bank',
    'First National Bank',
    'Republic Bank',
    'Universal Merchant Bank',
    'Bank of Africa',
    'Prudential Bank',
    'OmniBSIC Bank'
  ];

  useEffect(() => {
    initializeData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [deposits, selectedStation, statusFilter, dateRange, searchTerm, sortField, sortDirection]);

  // FIXED: Reset form when dialog opens/closes
  useEffect(() => {
    if (showDialog) {
      setForm(initializeForm());
    }
  }, [showDialog, initializeForm]);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Set default station for station managers
      if (user?.role === 'station_manager' && user.station_id) {
        setSelectedStation(user.station_id);
      }

      // Load stations and deposits in parallel
      await Promise.all([
        loadDeposits(),
        loadAvailableStations()
      ]);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to load bank deposit data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStations = async () => {
    try {
      let stationsResponse;
      
      if (user?.role === 'omc' && user.omc_id) {
        // OMC can view only their stations
        stationsResponse = await api.getStationsByOMC(user.omc_id);
      } else if (user?.role === 'station_manager' && user.station_id) {
        // Station managers can only view their station
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.id === user.station_id) || []
          };
        }
      } else if (user?.role === 'dealer' && user.dealer_id) {
        // Dealers can view only their stations
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.dealer_id === user.dealer_id) || []
          };
        }
      } else if (user?.role === 'admin') {
        // Admin can view all stations
        stationsResponse = await api.getAllStations();
      } else {
        // Default to empty for other roles
        stationsResponse = { success: true, data: [] };
      }

      if (stationsResponse?.success && stationsResponse.data) {
        setAvailableStations(stationsResponse.data);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadDeposits = async () => {
    try {
      // Build filters based on user role and selected station
      const filters: any = {};
      
      if (selectedStation !== 'all') {
        filters.station_id = selectedStation;
      } else if (user?.role === 'omc' && user.omc_id) {
        filters.omc_id = user.omc_id;
      } else if (user?.role === 'station_manager' && user.station_id) {
        filters.station_id = user.station_id;
      } else if (user?.role === 'dealer' && user.dealer_id) {
        filters.dealer_id = user.dealer_id;
      }

      // Apply date range filter
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          filters.start_date = startDate.toISOString();
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          filters.start_date = startDate.toISOString();
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          filters.start_date = startDate.toISOString();
          break;
      }

      const response = await api.getBankDeposits(filters);
      
      if (response.success) {
        let depositsData = response.data || [];
        
        // Additional filtering for dealers with multiple stations
        if (user?.role === 'dealer' && user.dealer_id && selectedStation === 'all') {
          const dealerStationIds = availableStations
            .filter(s => s.dealer_id === user.dealer_id)
            .map(s => s.id);
          depositsData = depositsData.filter((deposit: BankDeposit) => 
            dealerStationIds.includes(deposit.station_id)
          );
        } // FIXED: Added missing closing brace here
        
        setDeposits(depositsData);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load deposits",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load bank deposits",
        variant: "destructive"
      });
    }
  };

  const applyFilters = () => {
    let filtered = deposits;

    // Apply station filter
    if (selectedStation !== 'all') {
      filtered = filtered.filter(deposit => deposit.station_id === selectedStation);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deposit => deposit.status === statusFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter(deposit => new Date(deposit.created_at) >= startDate);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(deposit =>
        deposit.reference_number.toLowerCase().includes(term) ||
        deposit.bank_name.toLowerCase().includes(term) ||
        deposit.account_number.toLowerCase().includes(term) ||
        deposit.deposited_by.toLowerCase().includes(term) ||
        deposit.station_name?.toLowerCase().includes(term) ||
        deposit.amount.toString().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof BankDeposit];
      let bValue: any = b[sortField as keyof BankDeposit];

      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDeposits(filtered);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // FIXED: Stable form handlers
  const handleFormChange = useCallback((field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleEditFormChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      
      // Enhanced validation
      if (!form.amount || !form.bank_name || !form.account_number || !form.reference_number || !form.deposited_by || !form.station_id) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid amount greater than 0",
          variant: "destructive"
        });
        return;
      }

      if (form.account_number.length < 8) {
        toast({
          title: "Validation Error",
          description: "Account number must be at least 8 characters",
          variant: "destructive"
        });
        return;
      }

      const depositData = {
        station_id: form.station_id,
        amount: amount,
        bank_name: form.bank_name,
        account_number: form.account_number,
        reference_number: form.reference_number,
        deposited_by: form.deposited_by,
        notes: form.notes || undefined,
        deposit_date: form.deposit_date
      };

      const response = await api.createBankDeposit(depositData);
      
      if (response.success) {
        // Reload deposits to include the new one
        await loadDeposits();
        
        setShowDialog(false);
        setForm(initializeForm());

        toast({
          title: "Success",
          description: "Bank deposit recorded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to record deposit",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record bank deposit",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;

    try {
      setFormSubmitting(true);

      const amount = parseFloat(editForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid amount greater than 0",
          variant: "destructive"
        });
        return;
      }

      const updateData = {
        amount: amount,
        bank_name: editForm.bank_name,
        account_number: editForm.account_number,
        reference_number: editForm.reference_number,
        deposited_by: editForm.deposited_by,
        notes: editForm.notes || undefined
      };

      const response = await api.updateBankDeposit(selectedDeposit.id, updateData);
      
      if (response.success) {
        await loadDeposits();
        setShowEditDialog(false);
        toast({
          title: "Success",
          description: "Deposit updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update deposit",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error updating deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update deposit",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeposit) return;

    try {
      setFormSubmitting(true);
      const response = await api.deleteBankDeposit(selectedDeposit.id);
      
      if (response.success) {
        await loadDeposits();
        setShowDeleteDialog(false);
        toast({
          title: "Success",
          description: "Deposit deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete deposit",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error deleting deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete deposit",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: 'pending' | 'confirmed' | 'reconciled') => {
    try {
      const response = await api.updateBankDeposit(id, { status });
      
      if (response.success) {
        // Reload deposits to reflect the updated status
        await loadDeposits();
        
        toast({
          title: "Success",
          description: `Deposit status updated to ${status}`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update deposit status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating deposit status:', error);
      toast({
        title: "Error",
        description: "Failed to update deposit status",
        variant: "destructive"
      });
    }
  };

  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExporting(true);
      
      const exportData = {
        deposits: filteredDeposits,
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.full_name || user?.email,
          total_records: filteredDeposits.length,
          filters: {
            station: selectedStation,
            status: statusFilter,
            date_range: dateRange,
            search_term: searchTerm
          }
        }
      };

      const stationName = selectedStation === 'all' 
        ? 'all-stations' 
        : availableStations.find(s => s.id === selectedStation)?.name || 'unknown';
      
      exportData(exportData, `bank-deposits-${stationName}-${new Date().toISOString().split('T')[0]}`, format);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredDeposits.length} deposits as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export deposit data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const openEditDialog = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    setEditForm({
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
    setShowDeleteDialog(true);
  };

  const openDetailsDialog = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    setShowDetailsDialog(true);
  };

  const toggleExpandDeposit = (depositId: string) => {
    setExpandedDeposit(expandedDeposit === depositId ? null : depositId);
  };

  const openDepositActions = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    setShowActionSheet(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'reconciled':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-orange-50 text-orange-700 border border-orange-200';
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

  const canCreateDeposit = () => {
    if (!user) return false;
    
    // Basic role check - allow these roles to create deposits
    const allowedRoles = ['admin', 'omc', 'dealer', 'station_manager'];
    if (!allowedRoles.includes(user.role)) {
      return false;
    }

    // For admin, always allow (they can select any station)
    if (user.role === 'admin') {
      return true;
    }

    // For other roles, check if they have at least one station available
    if (availableStations.length > 0) {
      return true;
    }

    return false;
  };

  const canManageDeposits = () => {
    if (!user) return false;
    return ['admin', 'omc', 'dealer'].includes(user.role);
  };

  const canEditDelete = (deposit: BankDeposit) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (deposit.status !== 'pending') return false;
    return ['admin', 'omc', 'dealer'].includes(user.role);
  };

  const displayDeposits = filteredDeposits.length > 0 ? filteredDeposits : deposits;

  // Calculations
  const totalDeposits = displayDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const confirmedDeposits = displayDeposits.filter(d => d.status === 'confirmed' || d.status === 'reconciled');
  const totalConfirmed = confirmedDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const pendingDeposits = displayDeposits.filter(d => d.status === 'pending');
  const totalPending = pendingDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const todayDeposits = displayDeposits.filter(d => 
    new Date(d.created_at).toDateString() === new Date().toDateString()
  );
  const todayTotal = todayDeposits.reduce((sum, dep) => sum + dep.amount, 0);

  // FIXED: Memoized Deposit Form Component
  const DepositForm = React.memo(({ isEdit = false }: { isEdit?: boolean }) => {
    const currentForm = isEdit ? editForm : form;
    const currentStationId = isEdit ? selectedDeposit?.station_id : form.station_id;

    const handleFieldChange = (field: string, value: string) => {
      if (isEdit) {
        handleEditFormChange(field, value);
      } else {
        handleFormChange(field, value);
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          <div className="space-y-4">
            {/* Station Selection */}
            {(user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer') && (
              <div className="space-y-2">
                <Label htmlFor="station" className="text-base font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Station <span className="text-red-500">*</span>
                </Label>
                <select
                  id="station"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors touch-manipulation"
                  value={currentStationId}
                  onChange={(e) => !isEdit && handleFieldChange('station_id', e.target.value)}
                  disabled={isEdit}
                  required
                >
                  <option value="">Select Station</option>
                  {availableStations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name} {station.omcs?.name ? `(${station.omcs.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Amount (₵) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={currentForm.amount}
                onChange={(e) => handleFieldChange('amount', e.target.value)}
                placeholder="0.00"
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                required
              />
            </div>

            {/* Deposit Date */}
            <div className="space-y-2">
              <Label htmlFor="deposit_date" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Deposit Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_date"
                type="date"
                value={currentForm.deposit_date}
                onChange={(e) => handleFieldChange('deposit_date', e.target.value)}
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                required
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_name" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <select
                id="bank_name"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors touch-manipulation"
                value={currentForm.bank_name}
                onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                required
              >
                {availableBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account_number" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="account_number"
                value={currentForm.account_number}
                onChange={(e) => handleFieldChange('account_number', e.target.value)}
                placeholder="1234567890"
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                required
                minLength={8}
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference_number" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reference Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reference_number"
                value={currentForm.reference_number}
                onChange={(e) => handleFieldChange('reference_number', e.target.value)}
                placeholder="REF-123456"
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                required
              />
            </div>

            {/* Deposited By */}
            <div className="space-y-2">
              <Label htmlFor="deposited_by" className="text-base font-medium text-gray-700 flex items-center gap-2">
                <User className="w-5 h-5" />
                Deposited By <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposited_by"
                value={currentForm.deposited_by}
                onChange={(e) => handleFieldChange('deposited_by', e.target.value)}
                placeholder="Staff name"
                className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white transition-colors touch-manipulation"
              rows={4}
              value={currentForm.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional details, remarks, or special instructions..."
            />
          </div>
        </div>

        {/* Form Actions - Always visible at the bottom */}
        <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-200 bg-white sticky bottom-0">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => isEdit ? setShowEditDialog(false) : setShowDialog(false)}
              className="flex-1 border-gray-300 hover:bg-gray-50 text-base py-3 rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={isEdit ? handleEdit : handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors text-base"
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {isEdit ? 'Updating...' : 'Recording...'}
                </div>
              ) : (
                isEdit ? 'Update Deposit' : 'Record Deposit'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  });

  DepositForm.displayName = 'DepositForm';

  // Mobile-optimized Stats Cards
  const StatsCard = ({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
  }) => (
    <Card className="p-4 bg-white rounded-2xl shadow-sm border border-gray-200 touch-manipulation active:scale-95 transition-transform">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-600 text-sm mb-1 truncate">{title}</p>
          <p className="text-2xl text-black font-semibold truncate">{value}</p>
          <p className={`text-xs ${color} mt-1 truncate`}>{subtitle}</p>
        </div>
        <div className={`w-10 h-10 ${color.includes('blue') ? 'bg-blue-50' : color.includes('green') ? 'bg-green-50' : color.includes('orange') ? 'bg-orange-50' : 'bg-purple-50'} rounded-xl flex items-center justify-center border ${color.includes('blue') ? 'border-blue-100' : color.includes('green') ? 'border-green-100' : color.includes('orange') ? 'border-orange-100' : 'border-purple-100'}`}>
          <Icon className={`w-5 h-5 ${color.includes('blue') ? 'text-blue-600' : color.includes('green') ? 'text-green-600' : color.includes('orange') ? 'text-orange-600' : 'text-purple-600'}`} />
        </div>
      </div>
    </Card>
  );

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="w-10 h-10 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );

  const DepositSkeleton = () => (
    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );

  // Mobile-optimized compact view
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-black">Bank Deposits</h4>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg touch-manipulation active:scale-95"
            onClick={() => setShowDialog(true)}
            disabled={!canCreateDeposit()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100 touch-manipulation active:scale-95 transition-transform">
            <p className="text-gray-600 text-xs">Today</p>
            <p className="text-lg text-black font-semibold">₵{todayTotal.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100 touch-manipulation active:scale-95 transition-transform">
            <p className="text-gray-600 text-xs">Pending</p>
            <p className="text-lg text-black font-semibold">{pendingDeposits.length}</p>
          </div>
        </div>

        {/* Mobile-optimized Bottom Sheet for Deposit Creation */}
        <BottomSheet 
          open={showDialog} 
          onOpenChange={setShowDialog}
          title="Record Bank Deposit"
          description="Enter bank deposit details for cash flow tracking"
        >
          <DepositForm />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20"> {/* Added padding for bottom navigation */}
      {/* Mobile-optimized Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-black truncate">Bank Deposits</h3>
          <p className="text-gray-600 text-sm truncate">
            {user ? `${user.role} View` : 'Cash Management'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={initializeData}
            disabled={loading}
            className="h-10 w-10 p-0 touch-manipulation active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 w-10 p-0 touch-manipulation active:scale-95"
          >
            <Filter className="w-4 h-4" />
          </Button>

          <Button 
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation active:scale-95"
            onClick={() => setShowDialog(true)}
            disabled={!canCreateDeposit()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search deposits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 py-3 text-base border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <Card className="bg-white border border-gray-200 animate-in slide-in-from-top duration-200">
          <CardContent className="p-4 space-y-4">
            {/* Station Filter */}
            {(user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer') && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Station</Label>
                <select
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                >
                  <option value="all">All Stations</option>
                  {availableStations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Status</Label>
                <select
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="reconciled">Reconciled</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Period</Label>
                <select
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedStation !== 'all' || statusFilter !== 'all' || dateRange !== 'today') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStation(stationId || 'all');
                  setStatusFilter('all');
                  setDateRange('today');
                }}
                className="w-full border-gray-300 hover:bg-gray-50 touch-manipulation active:scale-95"
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile-optimized Stats Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            title="Total"
            value={`₵${totalDeposits.toLocaleString()}`}
            subtitle={`${displayDeposits.length} records`}
            icon={DollarSign}
            color="text-blue-600"
          />
          <StatsCard
            title="Confirmed"
            value={`₵${totalConfirmed.toLocaleString()}`}
            subtitle={`${confirmedDeposits.length} verified`}
            icon={CheckCircle}
            color="text-green-600"
          />
          <StatsCard
            title="Pending"
            value={`₵${totalPending.toLocaleString()}`}
            subtitle={`${pendingDeposits.length} awaiting`}
            icon={Clock}
            color="text-orange-600"
          />
          <StatsCard
            title="Today"
            value={`₵${todayTotal.toLocaleString()}`}
            subtitle={`${todayDeposits.length} deposits`}
            icon={TrendingUp}
            color="text-purple-600"
          />
        </div>
      )}

      {/* Mobile-optimized Deposits List */}
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Deposit History</span>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-sm">
              {displayDeposits.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <DepositSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {displayDeposits.map((deposit) => (
                <div 
                  key={deposit.id} 
                  className="p-3 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-200 border border-gray-200 touch-manipulation active:scale-95"
                  onClick={() => toggleExpandDeposit(deposit.id)}
                >
                  {/* Main Content */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        deposit.status === 'reconciled' ? 'bg-blue-50 border-blue-200' :
                        deposit.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                        'bg-orange-50 border-orange-200'
                      }`}>
                        <Building2 className={`w-6 h-6 ${
                          deposit.status === 'reconciled' ? 'text-blue-600' :
                          deposit.status === 'confirmed' ? 'text-green-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-black font-semibold text-base truncate">
                            {deposit.bank_name}
                          </h5>
                          <Badge className={`text-xs ${getStatusColor(deposit.status)}`}>
                            {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm truncate">
                          {deposit.reference_number} • {deposit.account_number}
                        </p>
                        <p className="text-black font-semibold text-lg mt-1">
                          ₵{deposit.amount.toLocaleString()}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(deposit.created_at).toLocaleDateString()} • {deposit.deposited_by}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDepositActions(deposit);
                      }}
                      className="h-8 w-8 p-0 touch-manipulation"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {expandedDeposit === deposit.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 text-xs">Station</p>
                          <p className="text-black font-medium truncate">{deposit.station_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Created By</p>
                          <p className="text-black font-medium truncate">{deposit.profiles?.full_name || 'System'}</p>
                        </div>
                      </div>

                      {deposit.notes && (
                        <div>
                          <p className="text-gray-600 text-xs mb-1">Notes</p>
                          <p className="text-gray-700 text-sm bg-white p-2 rounded-lg border border-gray-200">
                            {deposit.notes}
                          </p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2">
                        {deposit.status === 'pending' && canManageDeposits() && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(deposit.id, 'confirmed');
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 touch-manipulation active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {displayDeposits.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No bank deposits found</p>
                  <p className="text-sm text-gray-400 px-4">
                    {searchTerm || statusFilter !== 'all' || selectedStation !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Record your first bank deposit'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile-optimized Bottom Sheets */}
      <BottomSheet 
        open={showDialog} 
        onOpenChange={setShowDialog}
        title="Record Bank Deposit"
        description="Enter bank deposit details for cash flow tracking"
      >
        <DepositForm />
      </BottomSheet>

      <BottomSheet 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        title="Edit Bank Deposit"
        description="Update deposit details below"
      >
        <DepositForm isEdit={true} />
      </BottomSheet>

      {/* Action Sheet for Deposit Actions */}
      <ActionSheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        title="Deposit Actions"
        actions={[
          {
            label: 'View Details',
            action: () => selectedDeposit && openDetailsDialog(selectedDeposit),
            icon: <Eye className="w-5 h-5" />
          },
          ...(selectedDeposit && canEditDelete(selectedDeposit) ? [{
            label: 'Edit Deposit',
            action: () => selectedDeposit && openEditDialog(selectedDeposit),
            icon: <Edit className="w-5 h-5" />
          }] : []),
          ...(selectedDeposit && canEditDelete(selectedDeposit) ? [{
            label: 'Delete Deposit',
            action: () => selectedDeposit && openDeleteDialog(selectedDeposit),
            icon: <Trash2 className="w-5 h-5" />
          }] : []),
          ...(selectedDeposit && selectedDeposit.status === 'pending' && canManageDeposits() ? [{
            label: 'Confirm Deposit',
            action: () => selectedDeposit && updateStatus(selectedDeposit.id, 'confirmed'),
            icon: <CheckCircle className="w-5 h-5" />
          }] : []),
          ...(selectedDeposit && selectedDeposit.status === 'confirmed' && canManageDeposits() ? [{
            label: 'Mark Reconciled',
            action: () => selectedDeposit && updateStatus(selectedDeposit.id, 'reconciled'),
            icon: <CheckCircle className="w-5 h-5" />
          }] : [])
        ]}
        destructiveIndex={selectedDeposit && canEditDelete(selectedDeposit) ? 2 : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Deposit
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The deposit record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-800 truncate">
                  ₵{selectedDeposit?.amount.toLocaleString()} • {selectedDeposit?.bank_name}
                </p>
                <p className="text-sm text-red-600 truncate">
                  {selectedDeposit?.reference_number}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 border-gray-300 hover:bg-gray-50 py-2.5 rounded-xl touch-manipulation active:scale-95"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={formSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 py-2.5 rounded-xl touch-manipulation active:scale-95"
            >
              {formSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md mx-4 rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Deposit Details
            </DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    selectedDeposit.status === 'reconciled' ? 'bg-blue-50 border-blue-200' :
                    selectedDeposit.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      selectedDeposit.status === 'reconciled' ? 'text-blue-600' :
                      selectedDeposit.status === 'confirmed' ? 'text-green-600' :
                      'text-orange-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">₵{selectedDeposit.amount.toLocaleString()}</h3>
                    <p className="text-gray-600">{selectedDeposit.bank_name}</p>
                  </div>
                </div>
                <Badge className={`text-sm ${getStatusColor(selectedDeposit.status)}`}>
                  {selectedDeposit.status.charAt(0).toUpperCase() + selectedDeposit.status.slice(1)}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium">{selectedDeposit.reference_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account:</span>
                  <span className="font-medium">{selectedDeposit.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposited By:</span>
                  <span className="font-medium">{selectedDeposit.deposited_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Station:</span>
                  <span className="font-medium">{selectedDeposit.station_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(selectedDeposit.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedDeposit.notes && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-700">{selectedDeposit.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                  className="flex-1 border-gray-300 hover:bg-gray-50 py-2.5 rounded-xl touch-manipulation active:scale-95"
                >
                  Close
                </Button>
                {canEditDelete(selectedDeposit) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      openEditDialog(selectedDeposit);
                    }}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl touch-manipulation active:scale-95"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Action Button for Mobile */}
      {canCreateDeposit() && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg touch-manipulation active:scale-95 transition-transform"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default BankDeposits;