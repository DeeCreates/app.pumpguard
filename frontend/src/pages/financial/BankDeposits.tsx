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
  FileText
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

export function BankDeposits({ stationId, stationName, compact = false, showAllStations = false }: BankDepositsProps) {
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<BankDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
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
        }
        
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
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Station Selection */}
            {(user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer') && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="station" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  Station <span className="text-red-500">*</span>
                </Label>
                <select
                  id="station"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
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
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
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
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {/* Deposit Date */}
            <div className="space-y-2">
              <Label htmlFor="deposit_date" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Deposit Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_date"
                type="date"
                value={currentForm.deposit_date}
                onChange={(e) => handleFieldChange('deposit_date', e.target.value)}
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Banknote className="w-4 h-4" />
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <select
                id="bank_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
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
              <Label htmlFor="account_number" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="account_number"
                value={currentForm.account_number}
                onChange={(e) => handleFieldChange('account_number', e.target.value)}
                placeholder="1234567890"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
                minLength={8}
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference_number" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Reference Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reference_number"
                value={currentForm.reference_number}
                onChange={(e) => handleFieldChange('reference_number', e.target.value)}
                placeholder="REF-123456"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {/* Deposited By */}
            <div className="space-y-2">
              <Label htmlFor="deposited_by" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <User className="w-4 h-4" />
                Deposited By <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposited_by"
                value={currentForm.deposited_by}
                onChange={(e) => handleFieldChange('deposited_by', e.target.value)}
                placeholder="Staff name"
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white transition-colors"
              rows={4}
              value={currentForm.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional details, remarks, or special instructions..."
            />
          </div>
        </div>

        {/* Form Actions - Always visible at the bottom */}
        <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-200">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => isEdit ? setShowEditDialog(false) : setShowDialog(false)}
              className="flex-1 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={isEdit ? handleEdit : handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
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

  // Loading skeletons (keep the same as before)
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );

  const DepositSkeleton = () => (
    <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg text-black">Bank Deposits</h4>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowDialog(true)}
            disabled={!canCreateDeposit()}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deposit
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-gray-600">Today</p>
            <p className="text-lg text-black font-semibold">₵{todayTotal.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-gray-600">Pending</p>
            <p className="text-lg text-black font-semibold">{pendingDeposits.length}</p>
          </div>
        </div>

        {/* Deposit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Record Bank Deposit
              </DialogTitle>
              <DialogDescription>
                Enter the complete details of the bank deposit for accurate tracking and reconciliation.
              </DialogDescription>
            </DialogHeader>
            <DepositForm />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl text-black mb-1">Bank Deposits</h3>
          <p className="text-gray-600">
            {user ? `${user.role} View - ` : ''}
            Cash Management & Banking Operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={initializeData}
            disabled={loading}
            className="gap-2 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting || filteredDeposits.length === 0}
            className="gap-2 border-gray-300 hover:bg-gray-50"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
            Export CSV
          </Button>

          {/* FIXED: Main Deposit Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!canCreateDeposit()}
              >
                <Plus className="w-4 h-4" />
                New Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0 pb-4">
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Record Bank Deposit
                </DialogTitle>
                <DialogDescription>
                  Enter bank deposit details for cash flow tracking and reconciliation
                </DialogDescription>
              </DialogHeader>
              <DepositForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Search Deposits</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by reference, bank, amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Station Filter */}
            {(user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer') && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Station</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Date Range</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

          {/* Active Filters Display */}
          {(searchTerm || selectedStation !== 'all' || statusFilter !== 'all' || dateRange !== '30days') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedStation !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Station: {availableStations.find(s => s.id === selectedStation)?.name}
                  <button onClick={() => setSelectedStation('all')} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {dateRange !== '30days' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {dateRange}
                  <button onClick={() => setDateRange('30days')} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStation(stationId || 'all');
                  setStatusFilter('all');
                  setDateRange('30days');
                }}
                className="ml-auto text-xs h-7"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Deposits</p>
                <p className="text-3xl text-black">₵{totalDeposits.toLocaleString()}</p>
                <p className="text-sm text-green-600">{displayDeposits.length} records</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Confirmed</p>
                <p className="text-3xl text-black">₵{totalConfirmed.toLocaleString()}</p>
                <p className="text-sm text-green-600">{confirmedDeposits.length} verified</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Pending</p>
                <p className="text-3xl text-black">₵{totalPending.toLocaleString()}</p>
                <p className="text-sm text-orange-600">{pendingDeposits.length} awaiting</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Today</p>
                <p className="text-3xl text-black">₵{todayTotal.toLocaleString()}</p>
                <p className="text-sm text-blue-600">{todayDeposits.length} deposits</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

  
      {/* Deposits List */}
      <Card className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Deposit History & Reconciliation</span>
            <Badge variant="outline" className="bg-gray-50 border-gray-200">
              {displayDeposits.length} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <DepositSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header with Sorting */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 text-sm font-medium text-gray-600">
                <div className="col-span-5">Deposit Details</div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  {sortField === 'amount' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800"
                  onClick={() => handleSort('created_at')}
                >
                  Date
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              {displayDeposits.map((deposit) => (
                <div key={deposit.id} className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-all duration-300 border border-gray-200">
                  {/* Main Row */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                          deposit.status === 'reconciled' ? 'bg-blue-50 border-blue-200' :
                          deposit.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                          'bg-orange-50 border-orange-200'
                        }`}>
                          <Building2 className={`w-5 h-5 ${
                            deposit.status === 'reconciled' ? 'text-blue-600' :
                            deposit.status === 'confirmed' ? 'text-green-600' :
                            'text-orange-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-black font-semibold">{deposit.bank_name}</h5>
                            {getStatusIcon(deposit.status)}
                          </div>
                          <p className="text-sm text-gray-600">{deposit.reference_number} • {deposit.account_number}</p>
                          {(user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer') && (
                            <p className="text-xs text-gray-500 mt-1">
                              {deposit.station_name} {deposit.omc_name ? `• ${deposit.omc_name}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <p className="text-lg text-black font-semibold">₵{deposit.amount.toLocaleString()}</p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-black font-medium flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(deposit.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <Badge className={getStatusColor(deposit.status)}>
                        {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandDeposit(deposit.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedDeposit === deposit.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsDialog(deposit)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {canEditDelete(deposit) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(deposit)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedDeposit === deposit.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Deposited By</p>
                          <p className="text-black font-medium">{deposit.deposited_by}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Bank Account</p>
                          <p className="text-black font-medium">{deposit.account_number}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Created By</p>
                          <p className="text-black font-medium">{deposit.profiles?.full_name || 'System'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Last Updated</p>
                          <p className="text-black font-medium">
                            {new Date(deposit.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {deposit.notes && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Notes:
                          </p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded-lg border border-gray-200">
                            {deposit.notes}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        {deposit.status === 'pending' && canManageDeposits() && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus(deposit.id, 'confirmed')}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm Deposit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(deposit.id, 'reconciled')}
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              Mark Reconciled
                            </Button>
                          </>
                        )}

                        {deposit.status === 'confirmed' && canManageDeposits() && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(deposit.id, 'reconciled')}
                            className="border-gray-300 hover:bg-gray-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Reconciled
                          </Button>
                        )}

                        {canEditDelete(deposit) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(deposit)}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 ml-auto"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>

                      {deposit.reconciliation_date && (
                        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Reconciled on {new Date(deposit.reconciliation_date).toLocaleDateString()} at{' '}
                          {new Date(deposit.reconciliation_date).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {displayDeposits.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No bank deposits found</p>
                  <p className="text-sm text-gray-400">
                    {searchTerm || statusFilter !== 'all' || selectedStation !== 'all' 
                      ? 'Try adjusting your filters or search terms' 
                      : 'Start by recording your first bank deposit'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Bank Deposit
            </DialogTitle>
            <DialogDescription>
              Update the deposit details below. Some fields may be restricted based on deposit status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <DepositForm isEdit={true} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Deposit
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deposit? This action cannot be undone and will permanently remove the deposit record.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">
                  ₵{selectedDeposit?.amount.toLocaleString()} • {selectedDeposit?.bank_name}
                </p>
                <p className="text-sm text-red-600">
                  {selectedDeposit?.reference_number} • {selectedDeposit?.station_name}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={formSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {formSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deleting...
                </div>
              ) : (
                'Delete Deposit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Deposit Details
            </DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Transaction Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference Number:</span>
                        <span className="font-medium">{selectedDeposit.reference_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Number:</span>
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
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {new Date(selectedDeposit.created_at).toLocaleDateString()} at{' '}
                          {new Date(selectedDeposit.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">
                          {new Date(selectedDeposit.updated_at).toLocaleDateString()} at{' '}
                          {new Date(selectedDeposit.updated_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created By:</span>
                        <span className="font-medium">{selectedDeposit.profiles?.full_name || 'System'}</span>
                      </div>
                      {selectedDeposit.reconciliation_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reconciled:</span>
                          <span className="font-medium">
                            {new Date(selectedDeposit.reconciliation_date).toLocaleDateString()} at{' '}
                            {new Date(selectedDeposit.reconciliation_date).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedDeposit.notes && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700">{selectedDeposit.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                  className="flex-1 border-gray-300 hover:bg-gray-50"
                >
                  Close
                </Button>
                {canEditDelete(selectedDeposit) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        openEditDialog(selectedDeposit);
                      }}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {selectedDeposit.status === 'pending' && canManageDeposits() && (
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          updateStatus(selectedDeposit.id, 'confirmed');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BankDeposits;