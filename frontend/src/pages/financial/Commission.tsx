// src/pages/financial/Commission.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Download,
  Eye,
  Target,
  BarChart3,
  Zap,
  FileText,
  Loader2,
  Building,
  Store,
  Settings,
  TrendingDown,
  Sparkles,
  Database,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Commission {
  id: string;
  station_id: string;
  dealer_id: string;
  omc_id: string;
  period: string;
  total_volume: number;
  total_sales: number;
  commission_rate: number;
  commission_amount: number;
  windfall_amount: number;
  shortfall_amount: number;
  total_commission: number;
  status: 'pending' | 'paid' | 'cancelled';
  calculated_at: string;
  paid_at?: string;
  calculated_by?: string;
  paid_by?: string;
  data_source?: 'sales' | 'daily_tank_stocks';
  station_name?: string;
  dealer_name?: string;
  station_location?: string;
  station_code?: string;
}

interface CommissionStats {
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  current_month_commission: number;
  previous_month_commission: number;
  current_month_progress: number;
  estimated_final_commission: number;
  today_commission: number;
  month_to_date_volume: number;
  windfall_total: number;
  shortfall_total: number;
  base_commission_total: number;
  current_windfall: number;
  current_shortfall: number;
  current_base_commission: number;
  total_stations: number;
  paid_stations: number;
  pending_stations: number;
  average_commission_rate?: number;
  station_commission_info?: { [key: string]: any };
  stations_using_default_rate?: number;
}

interface TankStockProgressData {
  date: string;
  volume: number;
  commission_earned: number;
  cumulative_commission: number;
  cumulative_volume: number;
  day_of_month: number;
  day_name: string;
  is_today: boolean;
  daily_progress?: number;
  trend?: 'up' | 'down' | 'neutral';
  tank_dip_count: number;
  opening_stock: number;
  closing_stock: number;
  received_stock: number;
  data_source: 'daily_tank_stocks';
}

interface Station {
  id: string;
  name: string;
  code: string;
  location: string;
  dealer_id: string;
  omc_id: string;
  commission_rate: number;
  dealer_name?: string;
}

interface CommissionFilters {
  start_date?: string;
  end_date?: string;
  status?: string;
  station_id?: string;
  page?: number;
  limit?: number;
  months_back?: number;
}

interface CommissionPaymentRequest {
  commission_id: string;
  payment_method: string;
  reference_number: string;
  payment_date: string;
  notes?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Loading Skeleton Component for initial load
const InitialLoadingSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="h-4 w-96 bg-gray-100 rounded mt-2"></div>
          <div className="flex items-center space-x-2 mt-3">
            <div className="h-6 w-20 bg-gray-200 rounded"></div>
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="grid w-full grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded"></div>
        ))}
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-40 bg-gray-300 rounded mb-2"></div>
            <div className="h-2 w-full bg-gray-100 rounded mb-1"></div>
            <div className="h-3 w-48 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatCurrency = (amount: number) => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(safeAmount);
};

const formatNumber = (num: number) => {
  const safeNum = Number(num) || 0;
  return new Intl.NumberFormat('en-GH').format(safeNum);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    if (dateString.includes('-01')) {
      return new Date(dateString).toLocaleDateString('en-GH', {
        year: 'numeric',
        month: 'long'
      });
    }
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatCommissionRate = (rate: number) => {
  return `GHS ${Number(rate).toFixed(3)}/L`;
};

// Helper function to calculate date range based on months back
const calculateDateRange = (monthsBack: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  
  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  };
};

// Helper function to get default months back
const getDefaultMonthsBack = () => 12; // Default to 12 months history

// Helper function to get current period (YYYY-MM)
const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Commission() {
  const [activeTab, setActiveTab] = useState("overview");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [tankStockProgress, setTankStockProgress] = useState<TankStockProgressData[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    total_commission: 0,
    paid_commission: 0,
    pending_commission: 0,
    current_month_commission: 0,
    previous_month_commission: 0,
    current_month_progress: 0,
    estimated_final_commission: 0,
    today_commission: 0,
    month_to_date_volume: 0,
    windfall_total: 0,
    shortfall_total: 0,
    base_commission_total: 0,
    current_windfall: 0,
    current_shortfall: 0,
    current_base_commission: 0,
    total_stations: 0,
    paid_stations: 0,
    pending_stations: 0
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTankStockProgress, setLoadingTankStockProgress] = useState(false);
  
  const [canManage, setCanManage] = useState(false);
  const [canCalculate, setCanCalculate] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate default date range for 12 months
  const defaultDateRange = useMemo(() => calculateDateRange(getDefaultMonthsBack()), []);
  
  const [filters, setFilters] = useState<CommissionFilters>({
    start_date: defaultDateRange.start_date,
    end_date: defaultDateRange.end_date,
    status: 'all',
    station_id: 'all',
    page: 1,
    limit: 20,
    months_back: getDefaultMonthsBack()
  });

  const [paymentForm, setPaymentForm] = useState<CommissionPaymentRequest>({
    commission_id: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);

  // Cache for station and dealer names
  const [stationNameCache, setStationNameCache] = useState<Record<string, string>>({});
  const [dealerNameCache, setDealerNameCache] = useState<Record<string, string>>({});
  const [commissionRateCache, setCommissionRateCache] = useState<Record<string, number>>({});

  const getStatusVariant = useCallback((status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  }, []);

  const isCurrentPeriod = useCallback((period: string) => {
    const currentPeriod = getCurrentPeriod();
    return period === currentPeriod;
  }, []);

  const hasMultipleStations = useMemo(() => stations.length > 1, [stations.length]);

  const calculateMonthProgress = useCallback(() => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    return (currentDay / totalDays) * 100;
  }, []);

  const getStationCommissionRate = useCallback((commission: Commission): number => {
    // First check if commission has a rate
    if (commission.commission_rate && commission.commission_rate > 0) {
      return commission.commission_rate;
    }
    
    // Check cache for station-specific rate
    if (commissionRateCache[commission.station_id]) {
      return commissionRateCache[commission.station_id];
    }
    
    // Fallback to default rate if nothing else works
    return 0.05;
  }, [commissionRateCache]);

  // Load permissions and basic data instantly
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingPermissions(true);
        
        // Load permissions in parallel
        const [manageResult, calculateResult, approveResult] = await Promise.allSettled([
          api.canManageCommissions(),
          api.canCalculateCommissions(),
          api.canApproveCommissions()
        ]);
        
        setCanManage(manageResult.status === 'fulfilled' ? manageResult.value : false);
        setCanCalculate(calculateResult.status === 'fulfilled' ? calculateResult.value : false);
        setCanApprove(approveResult.status === 'fulfilled' ? approveResult.value : false);
        
        // Pre-fetch stations
        await loadStations();
        
        // Load stats for overview
        await loadStats();
        
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoadingPermissions(false);
        setInitialLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Load commission history when tab changes or filters update
  useEffect(() => {
    if (activeTab === "commissions" && !initialLoading) {
      loadCommissions();
    }
  }, [activeTab, filters, initialLoading]);

  // Load tank stock progress when overview tab is active
  useEffect(() => {
    if (activeTab === "overview" && !initialLoading) {
      loadTankStockProgress();
    }
  }, [activeTab, initialLoading]);

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isOMC = useMemo(() => user?.role === 'omc', [user]);
  const isDealer = useMemo(() => user?.role === 'dealer', [user]);
  const canView = useMemo(() => isAdmin || isOMC || isDealer, [isAdmin, isOMC, isDealer]);

  const loadStations = useCallback(async () => {
    try {
      const stationFilters: any = {};
      
      // Filter stations by user's OMC if they're OMC user
      if (isOMC && user?.omc_id) {
        stationFilters.omc_id = user.omc_id;
      } 
      else if (isDealer && user?.dealer_id) {
        stationFilters.dealer_id = user.dealer_id;
      }

      const response = await api.searchStations(stationFilters, 1, 100);
      
      if (response.success && response.data?.stations) {
        const stationsData: Station[] = response.data.stations.map((station: any) => ({
          id: station.id,
          name: station.name || station.code || `Station ${station.id?.slice(-6)}`,
          code: station.code || '',
          location: station.location || '',
          dealer_id: station.dealer_id,
          omc_id: station.omc_id,
          commission_rate: station.commission_rate || 0.05,
          dealer_name: station.dealer_name || station.dealer?.name || ''
        }));

        // Filter stations to only show those belonging to the user's OMC (for OMC users)
        let filteredStations = stationsData;
        if (isOMC && user?.omc_id) {
          filteredStations = stationsData.filter(station => station.omc_id === user.omc_id);
        }

        setStations(filteredStations);
        
        // Build caches
        const stationCache: Record<string, string> = {};
        const dealerCache: Record<string, string> = {};
        const rateCache: Record<string, number> = {};
        
        filteredStations.forEach(station => {
          stationCache[station.id] = station.name;
          if (station.dealer_name) {
            dealerCache[station.dealer_id] = station.dealer_name;
          }
          rateCache[station.id] = station.commission_rate;
        });
        
        setStationNameCache(stationCache);
        setDealerNameCache(dealerCache);
        setCommissionRateCache(rateCache);
      }
    } catch (error) {
      console.error("Failed to load stations:", error);
    }
  }, [isOMC, isDealer, user]);

  const loadCommissions = useCallback(async () => {
    try {
      setLoadingCommissions(true);
      const cleanFilters: any = {
        page: filters.page || 1,
        limit: filters.limit || 20
      };

      if (filters.start_date) cleanFilters.start_date = filters.start_date;
      if (filters.end_date) cleanFilters.end_date = filters.end_date;
      if (filters.status && filters.status !== 'all') cleanFilters.status = filters.status;
      if (filters.station_id && filters.station_id !== 'all') {
        cleanFilters.station_id = filters.station_id;
      }

      // Add OMC filter for non-admin users
      if (!isAdmin) {
        if (isOMC && user?.omc_id) {
          cleanFilters.omc_id = user.omc_id;
        } else if (isDealer && user?.dealer_id) {
          cleanFilters.dealer_id = user.dealer_id;
        }
      }

      const response = await api.getCommissions(cleanFilters);
      
      if (response.success && response.data) {
        const commissionsData = response.data.commissions || [];
        
        // Filter commissions by OMC if needed
        let filteredCommissions = commissionsData;
        if (isOMC && user?.omc_id) {
          filteredCommissions = commissionsData.filter((commission: any) => commission.omc_id === user.omc_id);
        } else if (isDealer && user?.dealer_id) {
          filteredCommissions = commissionsData.filter((commission: any) => commission.dealer_id === user.dealer_id);
        }
        
        // Enhance commissions with actual data from API
        const enhancedCommissions = filteredCommissions.map((commission: any) => {
          // Get station name - prioritize API data, then cache
          const stationName = commission.station_name || 
                            stationNameCache[commission.station_id] || 
                            commission.station?.name ||
                            `Station ${commission.station_code || commission.station_id?.slice(-6)}`;
          
          // Get dealer name - prioritize API data, then cache
          const dealerName = commission.dealer_name || 
                           dealerNameCache[commission.dealer_id] || 
                           commission.dealer?.name ||
                           '';
          
          // Get commission rate - prioritize API data
          const commissionRate = commission.commission_rate > 0 ? 
                                commission.commission_rate : 
                                commissionRateCache[commission.station_id] || 0.05;
          
          return {
            ...commission,
            station_name: stationName,
            dealer_name: dealerName,
            commission_rate: commissionRate, // Ensure rate is properly set
            station_location: commission.station_location || commission.station?.location || '',
            station_code: commission.station_code || commission.station?.code || ''
          };
        });
        
        setCommissions(enhancedCommissions);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 20,
          total: filteredCommissions.length,
          total_pages: 1,
          has_next: false,
          has_prev: false
        });
      }
    } catch (error: any) {
      console.error("Failed to load commissions:", error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive"
      });
      setCommissions([]);
    } finally {
      setLoadingCommissions(false);
    }
  }, [filters, stationNameCache, dealerNameCache, commissionRateCache, isAdmin, isOMC, isDealer, user, toast]);

  const loadTankStockProgress = useCallback(async () => {
    try {
      setLoadingTankStockProgress(true);
      const currentPeriod = getCurrentPeriod();
      
      const stationId = filters.station_id === 'all' ? undefined : filters.station_id;
      const response = await api.getProgressiveCommissions(currentPeriod, stationId);
      
      if (response.success && response.data) {
        const progressData = response.data || [];
        
        const enhancedData = progressData.map((day: any, index: number, allData: any[]) => {
          const volume = Number(day.volume) || 0;
          const commissionEarned = Number(day.commission_earned) || 0;
          const cumulativeCommission = Number(day.cumulative_commission) || 0;
          const cumulativeVolume = Number(day.cumulative_volume) || 0;
          
          // Calculate daily progress
          let dailyProgress = 100;
          if (index > 0) {
            const previousDay = allData[index - 1];
            if (previousDay && previousDay.cumulative_commission > 0) {
              dailyProgress = ((cumulativeCommission - previousDay.cumulative_commission) / previousDay.cumulative_commission) * 100;
            }
          }
          
          // Calculate trend
          let trend: 'up' | 'down' | 'neutral' = 'neutral';
          if (index > 0) {
            const previousDay = allData[index - 1];
            if (previousDay) {
              const prevCommission = Number(previousDay.commission_earned) || 0;
              if (commissionEarned > prevCommission * 1.1) trend = 'up';
              if (commissionEarned < prevCommission * 0.9) trend = 'down';
            }
          }
          
          return {
            ...day,
            volume,
            commission_earned: commissionEarned,
            cumulative_commission: cumulativeCommission,
            cumulative_volume: cumulativeVolume,
            daily_progress: Math.min(Math.max(dailyProgress, 0), 100),
            trend,
            tank_dip_count: day.tank_dip_count || 0,
            opening_stock: day.opening_stock || 0,
            closing_stock: day.closing_stock || 0,
            received_stock: day.received_stock || 0
          };
        });
        
        setTankStockProgress(enhancedData);
      } else {
        setTankStockProgress([]);
      }
    } catch (error: any) {
      console.error("Failed to load tank stock progress:", error);
      setTankStockProgress([]);
    } finally {
      setLoadingTankStockProgress(false);
    }
  }, [filters.station_id]);

  const loadStats = useCallback(async () => {
    try {
      const statsFilters: any = {
        period: getCurrentPeriod()
      };
      
      if (filters.station_id && filters.station_id !== 'all') {
        statsFilters.station_id = filters.station_id;
      }

      // Add OMC filter for non-admin users
      if (!isAdmin) {
        if (isOMC && user?.omc_id) {
          statsFilters.omc_id = user.omc_id;
        } else if (isDealer && user?.dealer_id) {
          statsFilters.dealer_id = user.dealer_id;
        }
      }

      const response = await api.getCommissionStats(statsFilters);
      
      if (response.success && response.data) {
        const safeStats = Object.fromEntries(
          Object.entries(response.data).map(([key, value]) => [key, Number(value) || 0])
        ) as CommissionStats;
        
        if (!safeStats.current_month_progress) {
          safeStats.current_month_progress = calculateMonthProgress();
        }
        
        setStats(safeStats);
      }
    } catch (error: any) {
      console.error("Failed to load stats:", error);
      setStats({
        total_commission: 0,
        paid_commission: 0,
        pending_commission: 0,
        current_month_commission: 0,
        previous_month_commission: 0,
        current_month_progress: calculateMonthProgress(),
        estimated_final_commission: 0,
        today_commission: 0,
        month_to_date_volume: 0,
        windfall_total: 0,
        shortfall_total: 0,
        base_commission_total: 0,
        current_windfall: 0,
        current_shortfall: 0,
        current_base_commission: 0,
        total_stations: stations.length,
        paid_stations: 0,
        pending_stations: 0
      });
    }
  }, [filters.station_id, stations.length, calculateMonthProgress, isAdmin, isOMC, isDealer, user]);

  const handleCalculateCommissions = useCallback(async () => {
    if (!canCalculate) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to calculate commissions",
        variant: "destructive"
      });
      return;
    }

    try {
      setCalculating(true);
      
      const requestData: any = {
        period: getCurrentPeriod(),
        data_source: 'daily_tank_stocks'
      };

      if (filters.station_id && filters.station_id !== 'all') {
        requestData.station_ids = [filters.station_id];
      } else {
        // Only calculate commissions for stations belonging to user
        let stationIds: string[] = [];
        if (isOMC && user?.omc_id) {
          stationIds = stations
            .filter(station => station.omc_id === user.omc_id)
            .map(station => station.id);
        } else if (isDealer && user?.dealer_id) {
          stationIds = stations
            .filter(station => station.dealer_id === user.dealer_id)
            .map(station => station.id);
        } else {
          stationIds = stations.map(s => s.id);
        }
        
        if (stationIds.length > 0) {
          requestData.station_ids = stationIds;
        }
      }

      const response = await api.calculateCommissions(requestData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Commissions calculated successfully",
          variant: "default"
        });
        
        // Refresh current tab data
        if (activeTab === 'overview') {
          await Promise.all([loadStats(), loadTankStockProgress()]);
        }
        if (activeTab === 'commissions') {
          await loadCommissions();
        }
        
      } else {
        throw new Error(response.error || "Calculation failed");
      }
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate commissions",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  }, [canCalculate, filters.station_id, stations, activeTab, loadStats, loadTankStockProgress, loadCommissions, isOMC, isDealer, user, toast]);

  const handleMarkAsPaid = useCallback(async (commission: Commission) => {
    if (!canApprove) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to approve commission payments",
        variant: "destructive"
      });
      return;
    }

    // Ensure the commission belongs to user's OMC (for OMC users)
    if (isOMC && user?.omc_id && commission.omc_id !== user.omc_id) {
      toast({
        title: "Permission Denied",
        description: "You can only approve commissions for your organization",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.markCommissionAsPaid({
        ...paymentForm,
        commission_id: commission.id
      });
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Commission marked as paid"
        });
        
        setShowPaymentDialog(false);
        setPaymentForm({
          commission_id: '',
          payment_method: 'bank_transfer',
          reference_number: '',
          payment_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setSelectedCommission(null);
        
        await loadCommissions();
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to mark as paid",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  }, [canApprove, paymentForm, loadCommissions, isOMC, user, toast]);

  const openPaymentDialog = useCallback((commission: Commission) => {
    if (!canApprove) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to approve commission payments",
        variant: "destructive"
      });
      return;
    }

    // Ensure the commission belongs to user's OMC (for OMC users)
    if (isOMC && user?.omc_id && commission.omc_id !== user.omc_id) {
      toast({
        title: "Permission Denied",
        description: "You can only approve commissions for your organization",
        variant: "destructive"
      });
      return;
    }

    setSelectedCommission(commission);
    setPaymentForm(prev => ({
      ...prev,
      commission_id: commission.id,
      reference_number: `COMM-${commission.id.slice(-6)}-${Date.now().toString().slice(-4)}`
    }));
    setShowPaymentDialog(true);
  }, [canApprove, isOMC, user, toast]);

  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleFilterChange = useCallback((key: keyof CommissionFilters, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, page: 1 };
      
      if (value === 'all' || value === '' || value === null || value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      
      // Update date range when months_back changes
      if (key === 'months_back' && value) {
        const monthsBack = parseInt(value);
        const dateRange = calculateDateRange(monthsBack);
        newFilters.start_date = dateRange.start_date;
        newFilters.end_date = dateRange.end_date;
      }
      
      return newFilters;
    });
  }, []);

  const getStationName = useCallback((commission: Commission) => {
    return commission.station_name || `Station ${commission.station_code || commission.station_id?.slice(-6)}`;
  }, []);

  const getDealerName = useCallback((commission: Commission) => {
    return commission.dealer_name || '';
  }, []);

  const getStationLocation = useCallback((commission: Commission) => {
    return commission.station_location || '';
  }, []);

  const averageCommissionRate = useMemo(() => {
    if (stats.average_commission_rate) return stats.average_commission_rate;
    if (commissions.length === 0) return 0.05;
    const totalRates = commissions.reduce((sum, commission) => sum + getStationCommissionRate(commission), 0);
    return totalRates / commissions.length;
  }, [commissions, getStationCommissionRate, stats.average_commission_rate]);

  const dailyAverageCommission = useMemo(() => {
    if (tankStockProgress.length === 0) return 0;
    return stats.current_month_commission / tankStockProgress.length;
  }, [stats.current_month_commission, tankStockProgress.length]);

  const getDataSourceBadge = useCallback((commission: Commission) => {
    const source = commission.data_source || 'sales';
    return (
      <Badge variant="outline" className="text-xs">
        <Database className="w-3 h-3 mr-1" />
        {source === 'daily_tank_stocks' ? 'Tank Stocks' : 'Sales'}
      </Badge>
    );
  }, []);

  const formatDisplayDate = useCallback((dateString: string) => {
    return formatDate(dateString);
  }, []);

  // Get user's organization name for display
  const getUserOrganization = useMemo(() => {
    if (isAdmin) return "All Organizations";
    if (isOMC) return "Your Organization";
    if (isDealer) return "Your Dealership";
    return "";
  }, [isAdmin, isOMC, isDealer]);

  // Filter stations dropdown to only show stations belonging to user
  const filteredStationsForDropdown = useMemo(() => {
    if (isAdmin) {
      return stations;
    }
    if (isOMC && user?.omc_id) {
      return stations.filter(station => station.omc_id === user.omc_id);
    }
    if (isDealer && user?.dealer_id) {
      return stations.filter(station => station.dealer_id === user.dealer_id);
    }
    return stations;
  }, [stations, isAdmin, isOMC, isDealer, user]);

  if (loadingPermissions || initialLoading) {
    return <InitialLoadingSkeleton />;
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view commissions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission Dashboard</h1>
          <p className="text-gray-600 mt-1">Track commission growth from daily tank stock data</p>
          <div className="flex items-center space-x-2 mt-3">
            <Badge variant="outline" className="capitalize">
              {user?.role} View
            </Badge>
            {getUserOrganization && (
              <Badge variant="secondary">
                {getUserOrganization}
              </Badge>
            )}
            {stations.length > 0 && (
              <Badge variant="secondary">
                {filteredStationsForDropdown.length} {filteredStationsForDropdown.length === 1 ? 'Station' : 'Stations'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (activeTab === 'overview') {
                loadStats();
                loadTankStockProgress();
              } else if (activeTab === 'commissions') {
                loadCommissions();
              }
            }} 
            disabled={activeTab === 'overview' ? loadingTankStockProgress : loadingCommissions}
          >
            {activeTab === 'overview' && loadingTankStockProgress ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : activeTab === 'commissions' && loadingCommissions ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          {canCalculate && (
            <Button onClick={handleCalculateCommissions} disabled={calculating}>
              {calculating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calculate Commissions
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Daily Growth</TabsTrigger>
          <TabsTrigger value="commissions">Commission History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-white to-blue-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Month to Date</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.current_month_commission)}</div>
                <p className="text-xs text-gray-600">
                  {formatNumber(stats.month_to_date_volume)} L sold
                </p>
                <Progress value={stats.current_month_progress} className="mt-2" />
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round(stats.current_month_progress)}% of month completed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-yellow-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Commission</CardTitle>
                <Zap className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.today_commission)}</div>
                <p className="text-xs text-gray-600">
                  Based on today's tank stocks
                </p>
                {stats.today_commission > 0 && (
                  <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">
                    <Activity className="w-3 h-3 mr-1" />
                    Active Today
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-blue-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projected Final</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.estimated_final_commission)}</div>
                <p className="text-xs text-gray-600">
                  Based on current trend
                </p>
                {stats.estimated_final_commission > stats.current_month_commission && (
                  <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700">
                    +{formatCurrency(stats.estimated_final_commission - stats.current_month_commission)}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-orange-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.pending_commission)}</div>
                <p className="text-xs text-gray-600">
                  {stats.pending_stations} stations pending
                </p>
                {canApprove && stats.pending_commission > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={() => setActiveTab("commissions")}
                  >
                    Review Payments
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Daily Commission Growth - {formatDisplayDate(getCurrentPeriod() + '-01')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTankStockProgress ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2">Loading progress data...</span>
                  </div>
                ) : tankStockProgress.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4" />
                    <p>No tank stock data available for current month</p>
                    <p className="text-sm mt-2">Commissions will appear as tank stock data is recorded</p>
                    {canCalculate && (
                      <Button onClick={handleCalculateCommissions} className="mt-4" disabled={calculating}>
                        {calculating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Calculator className="w-4 h-4 mr-2" />
                        )}
                        Calculate from Tank Stocks
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {tankStockProgress.map((day, index) => (
                        <div 
                          key={day.date} 
                          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                            day.is_today ? 'bg-blue-50 border-blue-200 shadow-sm' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              day.is_today ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-semibold ${
                                day.is_today ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {day.day_of_month}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium flex items-center">
                                {day.day_name} 
                                {day.is_today && (
                                  <Badge variant="default" className="ml-2 bg-blue-100 text-blue-800">
                                    Today
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center space-x-2">
                                <span>{formatNumber(day.volume)} L</span>
                                <span>•</span>
                                <span>{day.tank_dip_count} tank dips</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-green-600 flex items-center justify-end">
                              +{formatCurrency(day.commission_earned)}
                              {day.trend === 'up' && <TrendingUp className="w-4 h-4 ml-1 text-green-500" />}
                              {day.trend === 'down' && <TrendingDown className="w-4 h-4 ml-1 text-orange-500" />}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: {formatCurrency(day.cumulative_commission)}
                            </div>
                            <Progress 
                              value={day.daily_progress} 
                              className="w-20 mt-1" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Base Commission</span>
                    </div>
                    <div className="text-blue-600 font-semibold">
                      {formatCurrency(stats.current_base_commission)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Daily Average</span>
                    </div>
                    <div className="text-green-600 font-semibold">
                      {formatCurrency(dailyAverageCommission)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Avg Commission Rate</span>
                    </div>
                    <div className="text-purple-600 font-semibold">
                      {formatCommissionRate(averageCommissionRate)}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Station Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold">{stats.total_stations}</div>
                      <div className="text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-600">{stats.paid_stations}</div>
                      <div className="text-gray-600">Paid</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="font-bold text-orange-600">{stats.pending_stations}</div>
                      <div className="text-gray-600">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">
                        {stats.total_stations - stats.paid_stations - stats.pending_stations}
                      </div>
                      <div className="text-gray-600">Other</div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("commissions")}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Full History
                  </Button>
                  {canCalculate && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleCalculateCommissions}
                      disabled={calculating}
                    >
                      {calculating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Calculator className="w-4 h-4 mr-2" />
                      )}
                      Recalculate Commissions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={filters.start_date}
                      onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value, page: 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={filters.end_date}
                      onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value, page: 1 }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={filters.status || "all"} 
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(filteredStationsForDropdown.length > 1 || isAdmin) && (
                    <div className="space-y-2">
                      <Label>Station</Label>
                      <Select 
                        value={filters.station_id || "all"} 
                        onValueChange={(value) => handleFilterChange('station_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All stations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stations</SelectItem>
                          {filteredStationsForDropdown.slice(0, 20).map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              <div className="flex items-center space-x-2">
                                <span className="truncate">{station.name}</span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {formatCommissionRate(station.commission_rate || 0.05)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Quick History</Label>
                    <Select 
                      value={filters.months_back?.toString() || getDefaultMonthsBack().toString()} 
                      onValueChange={(value) => handleFilterChange('months_back', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quick select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Last 3 months</SelectItem>
                        <SelectItem value="6">Last 6 months</SelectItem>
                        <SelectItem value="12">Last 12 months</SelectItem>
                        <SelectItem value="24">Last 24 months</SelectItem>
                        <SelectItem value="36">Last 36 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Commission Records</CardTitle>
                <div className="flex items-center space-x-2">
                  {loadingCommissions ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <>
                      <Badge variant="outline">
                        {commissions.length} records
                      </Badge>
                      <Badge variant="default">
                        Total: {formatCurrency(commissions.reduce((sum, c) => sum + c.total_commission, 0))}
                      </Badge>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingCommissions ? (
                  <div className="flex flex-col items-center justify-center h-32 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">Loading commission history...</p>
                  </div>
                ) : commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No commissions found for the selected filters</p>
                    {canCalculate && (
                      <Button onClick={handleCalculateCommissions} className="mt-4" disabled={calculating}>
                        {calculating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Calculator className="w-4 h-4 mr-2" />
                        )}
                        Calculate Commissions
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="text-sm">
                        Showing {commissions.length} commission records
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.has_prev || loadingCommissions}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {pagination.page} of {pagination.total_pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.has_next || loadingCommissions}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Station</TableHead>
                            <TableHead>Dealer</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Volume (L)</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Status</TableHead>
                            {canApprove && <TableHead>Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id} className={
                              isCurrentPeriod(commission.period) ? 'bg-green-50' : ''
                            }>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <Store className="w-4 h-4 text-gray-500 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="truncate">{getStationName(commission)}</span>
                                      {getDataSourceBadge(commission)}
                                    </div>
                                    {commission.station_location && (
                                      <div className="text-sm text-gray-600 truncate">
                                        {commission.station_location}
                                        {commission.station_code && ` • ${commission.station_code}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {commission.dealer_name ? (
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4 text-gray-500 shrink-0" />
                                    <span className="truncate">{commission.dealer_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{formatDate(commission.period)}</span>
                                  {isCurrentPeriod(commission.period) && (
                                    <Badge variant="outline" className="mt-1 w-fit bg-green-100 text-green-800 text-xs">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatNumber(commission.total_volume)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-purple-600">
                                  {formatCommissionRate(commission.commission_rate > 0 ? commission.commission_rate : getStationCommissionRate(commission))}
                                </div>
                              </TableCell>
                              <TableCell className="font-bold text-lg">
                                {formatCurrency(commission.total_commission)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  <Badge variant={getStatusVariant(commission.status)} className="w-fit">
                                    {commission.status === 'paid' ? (
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                    ) : (
                                      <Clock className="w-3 h-3 mr-1" />
                                    )}
                                    {commission.status}
                                  </Badge>
                                  {commission.paid_at && (
                                    <div className="text-xs text-gray-600">
                                      Paid: {new Date(commission.paid_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              {canApprove && (
                                <TableCell>
                                  {commission.status === 'pending' && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => openPaymentDialog(commission)}
                                      disabled={submitting}
                                    >
                                      Mark Paid
                                    </Button>
                                  )}
                                  {commission.status === 'paid' && (
                                    <div className="space-y-1">
                                      <Button variant="outline" size="sm" className="w-full">
                                        <Download className="w-3 h-3 mr-1" />
                                        Receipt
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Performance Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-semibold">Commission Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Total Commission</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(stats.total_commission)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          All time commission earnings
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Current Month</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(stats.current_month_commission)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatNumber(stats.month_to_date_volume)} L sold
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">Average Commission Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCommissionRate(averageCommissionRate)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Across all stations
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target className="w-4 h-4 text-orange-600" />
                          <span className="font-medium">Daily Average</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(dailyAverageCommission)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          This month's daily average
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Commission Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Commission Rate Information</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Commission rates are stored in the stations table and used for calculations from daily tank stocks.
                      The default rate is GHS 0.05/L when no rate is specified.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium text-blue-800">Current Average Rate</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCommissionRate(averageCommissionRate)}
                        </div>
                      </div>
                      
                      {stats.stations_using_default_rate !== undefined && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="font-medium text-yellow-800">Stations Using Default</div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {stats.stations_using_default_rate}
                          </div>
                          <div className="text-sm text-yellow-700">
                            of {stats.total_stations} total stations
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Management Actions</h4>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Station Rates
                        </Button>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Export Commission Report
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

<Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Mark Commission as Paid</DialogTitle>
    </DialogHeader>
    {selectedCommission && (
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold">{getStationName(selectedCommission)}</div>
          {selectedCommission.dealer_name && (
            <div className="text-sm text-gray-600">
              Dealer: {selectedCommission.dealer_name}
            </div>
          )}
          <div className="text-sm text-gray-600">
            Period: {formatDate(selectedCommission.period)}
          </div>
          <div className="text-sm text-gray-600">
            Commission: {formatCurrency(selectedCommission.total_commission)}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="payment-method">Payment Method *</Label>
          <Select 
            value={paymentForm.payment_method}
            onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
          >
            <SelectTrigger id="payment-method">
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
          <Label htmlFor="reference-number">Reference Number *</Label>
          <Input 
            id="reference-number"
            value={paymentForm.reference_number}
            onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
            placeholder="Enter payment reference (e.g., BANK-REF-123)"
            required
          />
          <p className="text-xs text-gray-500">
            Provide transaction ID, receipt number, or bank reference
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="payment-date">Payment Date *</Label>
          <Input 
            id="payment-date"
            type="date"
            value={paymentForm.payment_date}
            onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea 
            id="notes"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any payment notes..."
            rows={3}
          />
        </div>
        
        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPaymentDialog(false);
              setSelectedCommission(null);
              setPaymentForm({
                commission_id: '',
                payment_method: 'bank_transfer',
                reference_number: '',
                payment_date: new Date().toISOString().split('T')[0],
                notes: ''
              });
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleMarkAsPaid(selectedCommission)}
            disabled={
              submitting || 
              !paymentForm.reference_number.trim() || 
              !paymentForm.payment_date ||
              !paymentForm.payment_method
            }
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Mark as Paid
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
   </div>
  );
}