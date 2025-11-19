// src/pages/financial/Commission.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  Building, 
  Store, 
  TrendingUp, 
  DollarSign,
  Calculator,
  Target,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  User,
  Calendar,
  Eye,
  MoreHorizontal,
  Play,
  Pause,
  Settings
} from "lucide-react";
import { api } from "@/lib/api"; // Your main API file
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Commission {
  id: string;
  station_id: string;
  dealer_id?: string;
  omc_id: string;
  period: string;
  calculation_date: string;
  total_sales: number;
  total_volume: number;
  base_commission_rate: number;
  base_commission_amount: number;
  windfall_amount: number;
  shortfall_amount: number;
  bonus_amount: number;
  total_commission: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculated_at: string;
  paid_at?: string;
  approved_by?: string;
  paid_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  station?: {
    name: string;
    code: string;
    location?: string;
    region?: string;
  };
  dealer?: {
    name: string;
  };
  omc?: {
    name: string;
  };
  approver?: {
    full_name: string;
  };
  payer?: {
    full_name: string;
  };
}

interface WindfallShortfallConfig {
  id: string;
  station_id: string;
  omc_id: string;
  type: 'windfall' | 'shortfall' | 'adjustment';
  commission_rate: number;
  threshold_amount?: number;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  station?: {
    name: string;
    code: string;
  };
  omc?: {
    name: string;
  };
  creator?: {
    full_name: string;
  };
}

interface CommissionStats {
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  by_period: Record<string, number>;
  auto_calculation_status?: boolean;
  last_auto_calculation?: string;
  next_calculation?: string;
}

interface CommissionFilters {
  station_id?: string;
  dealer_id?: string;
  omc_id?: string;
  period?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface CommissionCalculationRequest {
  period: string;
  station_ids?: string[];
  force_recalculation?: boolean;
}

interface AutoCalculationConfig {
  enabled: boolean;
  schedule_time: string;
  timezone: string;
  notify_on_completion: boolean;
  notify_on_error: boolean;
}

interface Station {
  id: string;
  name: string;
  code: string;
  omc_id: string;
  omc_name?: string;
  dealer_id?: string;
  dealer_name?: string;
  is_active: boolean;
  location?: string;
  region?: string;
  commission_rate?: number;
}

interface OMC {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface CommissionPaymentRequest {
  commission_id: string;
  payment_method: string;
  reference_number: string;
  payment_date: string;
  notes?: string;
}

export default function Commission() {
  const [activeTab, setActiveTab] = useState("summary");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [windfallShortfallConfigs, setWindfallShortfallConfigs] = useState<WindfallShortfallConfig[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [omcs, setOmcs] = useState<OMC[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  const [commissionStats, setCommissionStats] = useState<CommissionStats>({
    total_commissions: 0,
    pending_commissions: 0,
    paid_commissions: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    by_period: {}
  });

  const [autoCalculationConfig, setAutoCalculationConfig] = useState<AutoCalculationConfig>({
    enabled: false,
    schedule_time: '02:00',
    timezone: 'UTC',
    notify_on_completion: true,
    notify_on_error: true
  });

  const [filters, setFilters] = useState<CommissionFilters>({
    period: new Date().toISOString().slice(0, 7),
    status: '',
    page: 1,
    limit: 50
  });

  const [calculationRequest, setCalculationRequest] = useState<CommissionCalculationRequest>({
    period: new Date().toISOString().slice(0, 7),
    force_recalculation: false
  });

  const [windfallShortfallForm, setWindfallShortfallForm] = useState({
    station_id: '',
    type: 'windfall' as 'windfall' | 'shortfall' | 'adjustment',
    commission_rate: '',
    threshold_amount: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });

  const [paymentForm, setPaymentForm] = useState<CommissionPaymentRequest>({
    commission_id: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);
  const [showWindfallDialog, setShowWindfallDialog] = useState(false);
  const [showAutoCalcDialog, setShowAutoCalcDialog] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [recentCalculations, setRecentCalculations] = useState<any[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GH').format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'approved': return 'secondary';
      case 'calculated': return 'outline';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'calculated': return <Calculator className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const canManageCommissions = () => {
    return user?.role === 'admin' || user?.role === 'omc';
  };

  const canViewCommissions = () => {
    return user?.role === 'admin' || user?.role === 'omc' || user?.role === 'dealer' || user?.role === 'station_manager';
  };

  const canManageWindfallShortfall = () => {
    return user?.role === 'admin' || user?.role === 'omc';
  };

  // Load data on component mount
  useEffect(() => {
    initializeData();
    loadAutoCalculationConfig();
    loadRecentCalculations();
  }, []);

  // Load commissions when filters change
  useEffect(() => {
    loadCommissions();
  }, [filters]);

  // Calculate stats when commissions change
  useEffect(() => {
    calculateCommissionStats();
  }, [commissions]);

  const initializeData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStations(),
        loadOMCs(),
        loadWindfallShortfallConfigs(),
        loadCommissionStats(),
        loadCommissions()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const response = await api.getCommissions(filters);
      if (response.success && response.data) {
        setCommissions(response.data.commissions || []);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load commissions",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error loading commissions:', error);
      toast({
        title: "Error",
        description: "Failed to load commissions",
        variant: "destructive"
      });
    }
  };

  const loadCommissionStats = async () => {
    try {
      const response = await api.getCommissionStats();
      if (response.success && response.data) {
        setCommissionStats(response.data);
      }
    } catch (error) {
      console.error('Error loading commission stats:', error);
    }
  };

  const loadWindfallShortfallConfigs = async () => {
    try {
      const response = await api.getWindfallShortfallConfigs();
      if (response.success && response.data) {
        setWindfallShortfallConfigs(response.data);
      } else {
        setWindfallShortfallConfigs([]);
      }
    } catch (error) {
      console.error('Error loading windfall/shortfall configs:', error);
      setWindfallShortfallConfigs([]);
    }
  };

  const loadStations = async () => {
    try {
      // Use your existing API method for stations
      const response = await api.getStations();
      if (response.success && response.data) {
        setStations(response.data);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      setStations([]);
    }
  };

  const loadOMCs = async () => {
    try {
      // Use your existing API method for OMCs
      const response = await api.getOMCs();
      if (response.success && response.data) {
        setOmcs(response.data);
      }
    } catch (error) {
      console.error('Error loading OMCs:', error);
      setOmcs([]);
    }
  };

  const loadAutoCalculationConfig = async () => {
    try {
      // Mock implementation - replace with your actual API method
      setAutoCalculationConfig({
        enabled: false,
        schedule_time: '02:00',
        timezone: 'UTC',
        notify_on_completion: true,
        notify_on_error: true
      });
    } catch (error) {
      console.error('Error loading auto calculation config:', error);
    }
  };

  const loadRecentCalculations = async () => {
    try {
      // Mock implementation - replace with your actual API method
      // For now, use commissions as recent calculations
      setRecentCalculations(commissions.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent calculations:', error);
      setRecentCalculations([]);
    }
  };

  const calculateCommissionStats = () => {
    const stats: CommissionStats = {
      ...commissionStats,
      total_commissions: commissions.length,
      pending_commissions: commissions.filter(c => c.status === 'pending' || c.status === 'calculated').length,
      paid_commissions: commissions.filter(c => c.status === 'paid').length,
      total_amount: commissions.reduce((sum, c) => sum + c.total_commission, 0),
      paid_amount: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.total_commission, 0),
      pending_amount: commissions.filter(c => c.status === 'pending' || c.status === 'calculated').reduce((sum, c) => sum + c.total_commission, 0),
      by_period: commissions.reduce((acc, c) => {
        acc[c.period] = (acc[c.period] || 0) + c.total_commission;
        return acc;
      }, {} as Record<string, number>)
    };
    setCommissionStats(stats);
  };

  const handleCalculateCommissions = async () => {
    try {
      setCalculating(true);
      setCalculationError(null);
      
      const response = await api.calculateCommissions(calculationRequest);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || `Commissions calculated successfully for ${calculationRequest.period}`,
        });
        
        await loadCommissions();
        await loadCommissionStats();
        await loadRecentCalculations();
      } else {
        const errorMessage = response.error || "Failed to calculate commissions";
        setCalculationError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error calculating commissions:', error);
      const errorMessage = error.message || "Failed to calculate commissions";
      setCalculationError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleAutoCalculationToggle = async () => {
    try {
      setSubmitting(true);
      const newConfig = { ...autoCalculationConfig, enabled: !autoCalculationConfig.enabled };
      
      // Mock implementation - replace with your actual API method
      setAutoCalculationConfig(newConfig);
      toast({
        title: "Success",
        description: `Auto calculation ${newConfig.enabled ? 'enabled' : 'disabled'}`,
      });
      
    } catch (error: any) {
      console.error('Error updating auto calculation:', error);
      toast({
        title: "Error",
        description: "Failed to update auto calculation",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAutoCalculationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      // Mock implementation - replace with your actual API method
      setAutoCalculationConfig(autoCalculationConfig);
      toast({
        title: "Success",
        description: "Auto calculation configuration updated",
      });
      setShowAutoCalcDialog(false);
    } catch (error: any) {
      console.error('Error updating auto calculation config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunDailyCalculation = async () => {
    try {
      setCalculating(true);
      // Use your calculateCommissions method for daily calculation
      const dailyRequest = {
        period: new Date().toISOString().slice(0, 7),
        force_recalculation: false
      };
      
      const response = await api.calculateCommissions(dailyRequest);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Daily commission calculation started",
        });
        
        await loadCommissions();
        await loadCommissionStats();
        await loadRecentCalculations();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to run daily calculation",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error running daily calculation:', error);
      toast({
        title: "Error",
        description: "Failed to run daily calculation",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateCommissionStatus = async (commissionId: string, status: Commission['status'], notes?: string) => {
    try {
      setSubmitting(true);
      const response = await api.updateCommissionStatus(commissionId, { status, notes });
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || `Commission ${status} successfully`,
        });
        
        // Update local state
        setCommissions(prev => prev.map(commission => 
          commission.id === commissionId 
            ? { ...commission, status, updated_at: new Date().toISOString() }
            : commission
        ));
        
        await loadCommissionStats();
      } else {
        toast({
          title: "Error",
          description: response.error || `Failed to update commission status`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error updating commission status:', error);
      toast({
        title: "Error",
        description: "Failed to update commission status",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (commission: Commission) => {
    try {
      setSubmitting(true);
      
      const paymentData = {
        ...paymentForm,
        commission_id: commission.id
      };

      const response = await api.markCommissionAsPaid(paymentData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Commission marked as paid successfully",
        });
        
        setShowPaymentDialog(false);
        setPaymentForm({
          commission_id: '',
          payment_method: 'bank_transfer',
          reference_number: '',
          payment_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        
        await loadCommissions();
        await loadCommissionStats();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to mark commission as paid",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error marking commission as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark commission as paid",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWindfallShortfallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!windfallShortfallForm.station_id || !windfallShortfallForm.commission_rate) {
      toast({
        title: "Validation Error",
        description: "Station and commission rate are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const configData = {
        station_id: windfallShortfallForm.station_id,
        type: windfallShortfallForm.type,
        commission_rate: parseFloat(windfallShortfallForm.commission_rate) / 100,
        threshold_amount: windfallShortfallForm.threshold_amount ? parseFloat(windfallShortfallForm.threshold_amount) : undefined,
        effective_date: windfallShortfallForm.effective_date,
        end_date: windfallShortfallForm.end_date || undefined,
        is_active: windfallShortfallForm.is_active
      };

      const response = await api.createWindfallShortfallConfig(configData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Configuration saved successfully",
        });
        
        setShowWindfallDialog(false);
        setWindfallShortfallForm({
          station_id: '',
          type: 'windfall',
          commission_rate: '',
          threshold_amount: '',
          effective_date: new Date().toISOString().split('T')[0],
          end_date: '',
          is_active: true
        });

        await loadWindfallShortfallConfigs();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save configuration",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error saving windfall/shortfall config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await initializeData();
      await loadRecentCalculations();
      toast({
        title: "Refreshed",
        description: "Commission data updated",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CommissionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const openPaymentDialog = (commission: Commission) => {
    setSelectedCommission(commission);
    setPaymentForm(prev => ({
      ...prev,
      commission_id: commission.id,
      reference_number: `COMM-${commission.id.slice(-6)}-${Date.now().toString().slice(-4)}`
    }));
    setShowPaymentDialog(true);
  };

  const openCommissionDetails = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowCommissionDetails(true);
  };

  const openWindfallDialog = () => {
    setWindfallShortfallForm({
      station_id: '',
      type: 'windfall',
      commission_rate: '',
      threshold_amount: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    });
    setShowWindfallDialog(true);
  };

  const openAutoCalcDialog = () => {
    setShowAutoCalcDialog(true);
  };

  if (loading && commissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-500" />
          <p className="text-gray-600">Loading commission data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commission Management</h1>
          <p className="text-gray-600">
            {user ? `Manage commissions and incentives (${user.role} view)` : 'Manage commissions and incentives'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageCommissions() && (
            <>
              <Button 
                variant={autoCalculationConfig.enabled ? "default" : "outline"}
                onClick={handleAutoCalculationToggle}
                disabled={submitting}
              >
                {autoCalculationConfig.enabled ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Auto Calc: {autoCalculationConfig.enabled ? 'ON' : 'OFF'}
              </Button>
              <Button onClick={handleRunDailyCalculation} disabled={calculating}>
                <Calculator className="w-4 h-4 mr-2" />
                Run Daily Calc
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Commission Summary</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="windfall-shortfall">Windfall/Shortfall</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
        </TabsList>

        {/* Commission Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {/* Auto Calculation Status */}
          {canManageCommissions() && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  Auto Calculation Status
                </CardTitle>
                <Button variant="outline" size="sm" onClick={openAutoCalcDialog}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">Status</div>
                      <div className="text-sm text-gray-600">Auto Calculation</div>
                    </div>
                    <Badge variant={autoCalculationConfig.enabled ? "default" : "outline"}>
                      {autoCalculationConfig.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">Last Run</div>
                      <div className="text-sm text-gray-600">
                        {commissionStats.last_auto_calculation 
                          ? formatDate(commissionStats.last_auto_calculation)
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">Next Run</div>
                      <div className="text-sm text-gray-600">
                        {commissionStats.next_calculation 
                          ? formatDate(commissionStats.next_calculation)
                          : 'Not scheduled'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(commissionStats.total_amount)}</div>
                <p className="text-xs text-gray-600">
                  {commissionStats.total_commissions} commission records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Commissions</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(commissionStats.paid_amount)}</div>
                <p className="text-xs text-gray-600">
                  {commissionStats.paid_commissions} paid records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(commissionStats.pending_amount)}</div>
                <p className="text-xs text-gray-600">
                  {commissionStats.pending_commissions} pending records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {commissionStats.total_commissions > 0 
                    ? formatCurrency(commissionStats.total_amount / commissionStats.total_commissions)
                    : formatCurrency(0)
                  }
                </div>
                <p className="text-xs text-gray-600">
                  Per commission record
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Commissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No commissions found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.slice(0, 5).map((commission) => (
                      <div key={commission.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{commission.station?.name || 'Unknown Station'}</div>
                          <div className="text-sm text-gray-600">
                            Period: {commission.period} • {formatDate(commission.calculation_date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {formatCurrency(commission.total_commission)}
                          </div>
                          <Badge variant={getStatusVariant(commission.status)} className="text-xs">
                            {getStatusIcon(commission.status)}
                            <span className="ml-1">{commission.status}</span>
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                  Recent Calculations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCalculations.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No recent calculations
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCalculations.slice(0, 5).map((calc) => (
                      <div key={calc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{calc.period}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(calc.calculated_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            calc.status === 'paid' ? 'text-green-600' : 
                            calc.status === 'calculated' ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {formatCurrency(calc.total_commission || 0)}
                          </div>
                          <Badge variant={getStatusVariant(calc.status)}>
                            {calc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Input 
                      type="month" 
                      value={filters.period}
                      onChange={(e) => handleFilterChange('period', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={filters.status || ""} 
                      onValueChange={(value) => handleFilterChange('status', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-statuses">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="calculated">Calculated</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Station</Label>
                    <Select 
                      value={filters.station_id || ""} 
                      onValueChange={(value) => handleFilterChange('station_id', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All stations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-stations">All Stations</SelectItem>
                        {stations.map(station => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>OMC</Label>
                    <Select 
                      value={filters.omc_id || ""} 
                      onValueChange={(value) => handleFilterChange('omc_id', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All OMCs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-omcs">All OMCs</SelectItem>
                        {omcs.map(omc => (
                          <SelectItem key={omc.id} value={omc.id}>
                            {omc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commissions Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Commission Records</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {commissions.length} records
                  </Badge>
                  <Badge variant="default">
                    {formatCurrency(commissionStats.total_amount)} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No commissions found for the selected filters</p>
                    {canManageCommissions() && (
                      <Button onClick={() => setActiveTab("calculations")} className="mt-4">
                        <Calculator className="w-4 h-4 mr-2" />
                        Calculate Commissions
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Calc Date</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Base Commission</TableHead>
                          <TableHead>Windfall/Shortfall</TableHead>
                          <TableHead>Total Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission) => (
                          <TableRow key={commission.id} className={
                            commission.status === 'paid' ? 'bg-green-50' : 
                            commission.status === 'approved' ? 'bg-blue-50' : ''
                          }>
                            <TableCell className="font-medium">
                              {commission.station?.name}
                              {commission.station?.code && (
                                <div className="text-sm text-gray-600">{commission.station.code}</div>
                              )}
                            </TableCell>
                            <TableCell>{commission.period}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatDate(commission.calculation_date)}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(commission.total_sales)}</TableCell>
                            <TableCell>{formatNumber(commission.total_volume)} L</TableCell>
                            <TableCell>
                              <div className="font-semibold">
                                {formatCurrency(commission.base_commission_amount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                ({(commission.base_commission_rate * 100).toFixed(1)}%)
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {commission.windfall_amount > 0 && (
                                  <div className="text-sm text-green-600">
                                    +{formatCurrency(commission.windfall_amount)} windfall
                                  </div>
                                )}
                                {commission.shortfall_amount > 0 && (
                                  <div className="text-sm text-red-600">
                                    -{formatCurrency(commission.shortfall_amount)} shortfall
                                  </div>
                                )}
                                {commission.bonus_amount > 0 && (
                                  <div className="text-sm text-blue-600">
                                    +{formatCurrency(commission.bonus_amount)} bonus
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-lg">
                                {formatCurrency(commission.total_commission)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(commission.status)} className="flex items-center w-fit">
                                {getStatusIcon(commission.status)}
                                <span className="ml-1 capitalize">{commission.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openCommissionDetails(commission)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canManageCommissions() && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {commission.status === 'calculated' && (
                                        <DropdownMenuItem onClick={() => handleUpdateCommissionStatus(commission.id, 'approved')}>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Approve
                                        </DropdownMenuItem>
                                      )}
                                      {commission.status === 'approved' && (
                                        <DropdownMenuItem onClick={() => openPaymentDialog(commission)}>
                                          <DollarSign className="w-4 h-4 mr-2" />
                                          Mark as Paid
                                        </DropdownMenuItem>
                                      )}
                                      {(commission.status === 'calculated' || commission.status === 'approved') && (
                                        <DropdownMenuItem onClick={() => handleUpdateCommissionStatus(commission.id, 'cancelled')}>
                                          <AlertCircle className="w-4 h-4 mr-2" />
                                          Cancel
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Windfall/Shortfall Tab */}
        <TabsContent value="windfall-shortfall">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Windfall/Shortfall Configurations</h2>
                <p className="text-gray-600">Manage bonus and penalty configurations for commissions</p>
              </div>
              {canManageWindfallShortfall() && (
                <Dialog open={showWindfallDialog} onOpenChange={setShowWindfallDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Configuration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Windfall/Shortfall Configuration</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWindfallShortfallSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Station *</Label>
                          <Select 
                            value={windfallShortfallForm.station_id} 
                            onValueChange={(value) => setWindfallShortfallForm(prev => ({ ...prev, station_id: value }))}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select station" />
                            </SelectTrigger>
                            <SelectContent>
                              {stations.map(station => (
                                <SelectItem key={station.id} value={station.id}>
                                  {station.name} {station.omc_name && `(${station.omc_name})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Type *</Label>
                          <Select 
                            value={windfallShortfallForm.type} 
                            onValueChange={(value: 'windfall' | 'shortfall' | 'adjustment') => 
                              setWindfallShortfallForm(prev => ({ ...prev, type: value }))
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="windfall">Windfall (Bonus)</SelectItem>
                              <SelectItem value="shortfall">Shortfall (Deduction)</SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Commission Rate (%) *</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            max="100"
                            placeholder="5.00" 
                            value={windfallShortfallForm.commission_rate}
                            onChange={(e) => setWindfallShortfallForm(prev => ({ ...prev, commission_rate: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Threshold Amount (Optional)</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="50000.00" 
                            value={windfallShortfallForm.threshold_amount}
                            onChange={(e) => setWindfallShortfallForm(prev => ({ ...prev, threshold_amount: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Effective From *</Label>
                          <Input 
                            type="date" 
                            value={windfallShortfallForm.effective_date}
                            onChange={(e) => setWindfallShortfallForm(prev => ({ ...prev, effective_date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>End Date (Optional)</Label>
                          <Input 
                            type="date" 
                            value={windfallShortfallForm.end_date}
                            onChange={(e) => setWindfallShortfallForm(prev => ({ ...prev, end_date: e.target.value }))}
                            min={windfallShortfallForm.effective_date}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={windfallShortfallForm.is_active}
                          onCheckedChange={(checked) => setWindfallShortfallForm(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label>Active Configuration</Label>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWindfallDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          Save Configuration
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Configurations Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Windfall/Shortfall Configurations</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {windfallShortfallConfigs.length} total
                  </Badge>
                  <Badge variant="default">
                    {windfallShortfallConfigs.filter(c => c.is_active).length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {windfallShortfallConfigs.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No windfall/shortfall configurations found</p>
                    {canManageWindfallShortfall() && (
                      <Button onClick={openWindfallDialog} className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Configuration
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>Effective Date</TableHead>
                          <TableHead>Status</TableHead>
                          {canManageWindfallShortfall() && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {windfallShortfallConfigs.map((config) => (
                          <TableRow key={config.id} className={config.is_active ? 'bg-green-50' : ''}>
                            <TableCell className="font-medium">
                              {config.station?.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                config.type === 'windfall' ? 'default' :
                                config.type === 'shortfall' ? 'destructive' : 'outline'
                              }>
                                {config.type === 'windfall' ? <ArrowUp className="w-3 h-3 mr-1" /> :
                                 config.type === 'shortfall' ? <ArrowDown className="w-3 h-3 mr-1" /> :
                                 <Target className="w-3 h-3 mr-1" />}
                                {config.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                {(config.commission_rate * 100).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              {config.threshold_amount ? (
                                <span className="text-sm">
                                  {formatCurrency(config.threshold_amount)}
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDate(config.effective_date)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.is_active ? "default" : "outline"}>
                                {config.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            {canManageWindfallShortfall() && (
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="calculations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission Calculation */}
            {canManageCommissions() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                    Calculate Commissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Calculation Period *</Label>
                    <Input 
                      type="month" 
                      value={calculationRequest.period}
                      onChange={(e) => setCalculationRequest(prev => ({ ...prev, period: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={calculationRequest.force_recalculation || false}
                      onCheckedChange={(checked) => setCalculationRequest(prev => ({ ...prev, force_recalculation: checked }))}
                    />
                    <Label>Force Recalculation</Label>
                  </div>

                  {calculationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center space-x-2 text-red-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Calculation Error</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{calculationError}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600 space-y-2">
                    <p>This will calculate commissions for all stations based on:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Daily sales data from sales table</li>
                      <li>Base commission rates from commission_config</li>
                      <li>Windfall/shortfall configurations</li>
                      <li>Bonus adjustments</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleCalculateCommissions}
                    className="w-full"
                    disabled={calculating}
                  >
                    {calculating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4 mr-2" />
                    )}
                    Calculate Commissions
                  </Button>

                  <Button 
                    onClick={handleRunDailyCalculation}
                    variant="outline"
                    className="w-full"
                    disabled={calculating}
                  >
                    {calculating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Run Daily Calculation Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Auto Calculation Configuration */}
            {canManageCommissions() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-purple-600" />
                    Auto Calculation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold">Auto Calculation</div>
                      <div className="text-sm text-gray-600">
                        Automatically calculate commissions daily
                      </div>
                    </div>
                    <Switch
                      checked={autoCalculationConfig.enabled}
                      onCheckedChange={handleAutoCalculationToggle}
                    />
                  </div>

                  {autoCalculationConfig.enabled && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Schedule Time</Label>
                        <Input 
                          type="time"
                          value={autoCalculationConfig.schedule_time}
                          onChange={(e) => setAutoCalculationConfig(prev => ({ ...prev, schedule_time: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select 
                          value={autoCalculationConfig.timezone}
                          onValueChange={(value) => setAutoCalculationConfig(prev => ({ ...prev, timezone: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={autoCalculationConfig.notify_on_completion}
                          onCheckedChange={(checked) => setAutoCalculationConfig(prev => ({ ...prev, notify_on_completion: checked }))}
                        />
                        <Label>Notify on completion</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={autoCalculationConfig.notify_on_error}
                          onCheckedChange={(checked) => setAutoCalculationConfig(prev => ({ ...prev, notify_on_error: checked }))}
                        />
                        <Label>Notify on error</Label>
                      </div>

                      <Button 
                        onClick={handleUpdateAutoCalculationConfig}
                        className="w-full"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Settings className="w-4 h-4 mr-2" />
                        )}
                        Save Configuration
                      </Button>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Recent Auto Calculations</h4>
                    {recentCalculations.length === 0 ? (
                      <p className="text-sm text-gray-500">No recent calculations</p>
                    ) : (
                      <div className="space-y-2">
                        {recentCalculations.slice(0, 3).map((calc) => (
                          <div key={calc.id} className="flex justify-between items-center text-sm">
                            <span>{formatDate(calc.calculated_at)}</span>
                            <Badge variant={getStatusVariant(calc.status)}>
                              {calc.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Auto Calculation Configuration Dialog */}
      <Dialog open={showAutoCalcDialog} onOpenChange={setShowAutoCalcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto Calculation Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAutoCalculationConfig} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Auto Calculation</Label>
                <p className="text-sm text-gray-600">
                  Automatically calculate commissions daily based on new sales data
                </p>
              </div>
              <Switch
                checked={autoCalculationConfig.enabled}
                onCheckedChange={(checked) => setAutoCalculationConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {autoCalculationConfig.enabled && (
              <>
                <div className="space-y-2">
                  <Label>Schedule Time</Label>
                  <Input 
                    type="time"
                    value={autoCalculationConfig.schedule_time}
                    onChange={(e) => setAutoCalculationConfig(prev => ({ ...prev, schedule_time: e.target.value }))}
                  />
                  <p className="text-sm text-gray-600">
                    Time when daily commission calculation will run
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={autoCalculationConfig.timezone}
                    onValueChange={(value) => setAutoCalculationConfig(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoCalculationConfig.notify_on_completion}
                      onCheckedChange={(checked) => setAutoCalculationConfig(prev => ({ ...prev, notify_on_completion: checked }))}
                    />
                    <div>
                      <Label>Notify on completion</Label>
                      <p className="text-sm text-gray-600">
                        Send notification when calculation completes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoCalculationConfig.notify_on_error}
                      onCheckedChange={(checked) => setAutoCalculationConfig(prev => ({ ...prev, notify_on_error: checked }))}
                    />
                    <div>
                      <Label>Notify on error</Label>
                      <p className="text-sm text-gray-600">
                        Send notification if calculation fails
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAutoCalcDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold">{selectedCommission.station?.name}</div>
                <div className="text-sm text-gray-600">Period: {selectedCommission.period}</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(selectedCommission.total_commission)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select 
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Reference Number *</Label>
                <Input 
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Enter payment reference"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input 
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any payment notes..."
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleMarkAsPaid(selectedCommission)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Mark as Paid
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Commission Details Dialog */}
      <Dialog open={showCommissionDetails} onOpenChange={setShowCommissionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission Details</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Station</Label>
                  <div className="text-base">{selectedCommission.station?.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Period</Label>
                  <div className="text-base">{selectedCommission.period}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Sales</Label>
                  <div className="text-base">{formatCurrency(selectedCommission.total_sales)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Volume</Label>
                  <div className="text-base">{formatNumber(selectedCommission.total_volume)} L</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Commission Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Commission ({(selectedCommission.base_commission_rate * 100).toFixed(1)}%):</span>
                    <span>{formatCurrency(selectedCommission.base_commission_amount)}</span>
                  </div>
                  {selectedCommission.windfall_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Windfall Bonus:</span>
                      <span>+{formatCurrency(selectedCommission.windfall_amount)}</span>
                    </div>
                  )}
                  {selectedCommission.shortfall_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Shortfall Deduction:</span>
                      <span>-{formatCurrency(selectedCommission.shortfall_amount)}</span>
                    </div>
                  )}
                  {selectedCommission.bonus_amount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Bonus Amount:</span>
                      <span>+{formatCurrency(selectedCommission.bonus_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Commission:</span>
                    <span className="text-lg">{formatCurrency(selectedCommission.total_commission)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Status Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={getStatusVariant(selectedCommission.status)}>
                      {selectedCommission.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Calculated At:</span>
                    <span>{formatDate(selectedCommission.calculated_at)}</span>
                  </div>
                  {selectedCommission.paid_at && (
                    <div className="flex justify-between">
                      <span>Paid At:</span>
                      <span>{formatDate(selectedCommission.paid_at)}</span>
                    </div>
                  )}
                  {selectedCommission.payer && (
                    <div className="flex justify-between">
                      <span>Paid By:</span>
                      <span>{selectedCommission.payer.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role-based information */}
      {!canViewCommissions() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {user?.role === 'attendant' 
                  ? "You can view commissions for your station only." 
                  : "Contact administrator for commission viewing permissions."}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}