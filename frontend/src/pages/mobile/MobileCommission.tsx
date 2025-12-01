// src/pages/mobile/MobileCommission.tsx
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
  Activity,
  ChevronRight,
  Filter,
  Calendar,
  MoreVertical
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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

// Mobile Loading Skeleton
const MobileLoadingSkeleton = () => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-48 bg-gray-200 rounded"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
        <div className="flex space-x-2">
          <div className="h-5 w-16 bg-gray-200 rounded"></div>
          <div className="h-5 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
              <div className="h-3 w-3 bg-gray-200 rounded"></div>
            </div>
            <div className="h-5 w-24 bg-gray-300 rounded mb-1"></div>
            <div className="h-1 w-full bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 rounded"></div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (amount: number) => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeAmount);
};

const formatCompactCurrency = (amount: number) => {
  const safeAmount = Number(amount) || 0;
  if (safeAmount >= 1000000) {
    return `GHS ${(safeAmount / 1000000).toFixed(1)}M`;
  }
  if (safeAmount >= 1000) {
    return `GHS ${(safeAmount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(safeAmount);
};

const formatNumber = (num: number) => {
  const safeNum = Number(num) || 0;
  if (safeNum >= 1000000) {
    return `${(safeNum / 1000000).toFixed(1)}M`;
  }
  if (safeNum >= 1000) {
    return `${(safeNum / 1000).toFixed(1)}K`;
  }
  return safeNum.toString();
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    if (dateString.includes('-01')) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GH', {
        year: 'numeric',
        month: 'short'
      });
    }
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatCommissionRate = (rate: number) => {
  return `₵${Number(rate).toFixed(3)}/L`;
};

const formatShortDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GH', {
      month: 'short',
      year: '2-digit'
    });
  } catch {
    return dateString;
  }
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
const getDefaultMonthsBack = () => 12;

// Helper function to get current period (YYYY-MM)
const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function MobileCommission() {
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
    limit: 10, // Reduced for mobile
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
  const [showFilters, setShowFilters] = useState(false);
  
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
    limit: 10,
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
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);

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

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3" />;
      default: return null;
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
    if (commission.commission_rate && commission.commission_rate > 0) {
      return commission.commission_rate;
    }
    
    if (commissionRateCache[commission.station_id]) {
      return commissionRateCache[commission.station_id];
    }
    
    return 0.05;
  }, [commissionRateCache]);

  // Load permissions and basic data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingPermissions(true);
        
        // Load permissions
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
      
      if (isOMC && user?.omc_id) {
        stationFilters.omc_id = user.omc_id;
      } 
      else if (isDealer && user?.dealer_id) {
        stationFilters.dealer_id = user.dealer_id;
      }

      const response = await api.searchStations(stationFilters, 1, 50);
      
      if (response.success && response.data?.stations) {
        const stationsData: Station[] = response.data.stations.map((station: any) => ({
          id: station.id,
          name: station.name || station.code || `Station ${station.id?.slice(-4)}`,
          code: station.code || '',
          location: station.location || '',
          dealer_id: station.dealer_id,
          omc_id: station.omc_id,
          commission_rate: station.commission_rate || 0.05,
          dealer_name: station.dealer_name || station.dealer?.name || ''
        }));

        // Filter stations by user's OMC
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
        limit: filters.limit || 10
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
        
        // Enhance commissions with actual data
        const enhancedCommissions = filteredCommissions.map((commission: any) => {
          const stationName = commission.station_name || 
                            stationNameCache[commission.station_id] || 
                            commission.station?.name ||
                            `Station ${commission.station_code || commission.station_id?.slice(-4)}`;
          
          const dealerName = commission.dealer_name || 
                           dealerNameCache[commission.dealer_id] || 
                           commission.dealer?.name ||
                           '';
          
          const commissionRate = commission.commission_rate > 0 ? 
                                commission.commission_rate : 
                                commissionRateCache[commission.station_id] || 0.05;
          
          return {
            ...commission,
            station_name: stationName,
            dealer_name: dealerName,
            commission_rate: commissionRate,
            station_location: commission.station_location || commission.station?.location || '',
            station_code: commission.station_code || commission.station?.code || ''
          };
        });
        
        setCommissions(enhancedCommissions);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
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
          
          let dailyProgress = 100;
          if (index > 0) {
            const previousDay = allData[index - 1];
            if (previousDay && previousDay.cumulative_commission > 0) {
              dailyProgress = ((cumulativeCommission - previousDay.cumulative_commission) / previousDay.cumulative_commission) * 100;
            }
          }
          
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
          description: "Commissions calculated",
          variant: "default"
        });
        
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
        description: "You don't have permission to approve payments",
        variant: "destructive"
      });
      return;
    }

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
        description: "You don't have permission to approve payments",
        variant: "destructive"
      });
      return;
    }

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
    return commission.station_name || `Station ${commission.station_code || commission.station_id?.slice(-4)}`;
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
        {source === 'daily_tank_stocks' ? 'Tank' : 'Sales'}
      </Badge>
    );
  }, []);

  // Filter stations dropdown for mobile
  const filteredStationsForDropdown = useMemo(() => {
    if (isAdmin) return stations;
    if (isOMC && user?.omc_id) {
      return stations.filter(station => station.omc_id === user.omc_id);
    }
    if (isDealer && user?.dealer_id) {
      return stations.filter(station => station.dealer_id === user.dealer_id);
    }
    return stations;
  }, [stations, isAdmin, isOMC, isDealer, user]);

  // Calculate total commission for display
  const totalCommission = useMemo(() => {
    return commissions.reduce((sum, c) => sum + c.total_commission, 0);
  }, [commissions]);

  if (loadingPermissions || initialLoading) {
    return <MobileLoadingSkeleton />;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-center">Access Denied</h3>
        <p className="text-gray-600 text-center mt-2">You don't have permission to view commissions</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Commissions</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                {user?.role}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {filteredStationsForDropdown.length} Stations
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
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
              <RefreshCw className={`w-4 h-4 ${activeTab === 'overview' && loadingTankStockProgress ? 'animate-spin' : ''} ${activeTab === 'commissions' && loadingCommissions ? 'animate-spin' : ''}`} />
            </Button>
            {canCalculate && (
              <Button 
                size="sm" 
                onClick={handleCalculateCommissions} 
                disabled={calculating}
                className="whitespace-nowrap"
              >
                {calculating ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4 mr-1" />
                )}
                Calculate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[73px] z-10 bg-white border-b px-4 py-2">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs">History</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-white to-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">Month to Date</CardTitle>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="text-lg font-bold mt-1">{formatCompactCurrency(stats.current_month_commission)}</div>
                  <Progress value={stats.current_month_progress} className="h-1 mt-2" />
                  <p className="text-[10px] text-gray-600 mt-1">
                    {Math.round(stats.current_month_progress)}% of month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-yellow-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">Today</CardTitle>
                    <Zap className="h-3 w-3 text-yellow-600" />
                  </div>
                  <div className="text-lg font-bold mt-1">{formatCompactCurrency(stats.today_commission)}</div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Based on tank stocks
                  </p>
                  {stats.today_commission > 0 && (
                    <Badge variant="outline" className="mt-1 text-[10px] bg-green-50 text-green-700">
                      Active
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">Projected</CardTitle>
                    <Target className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="text-lg font-bold mt-1">{formatCompactCurrency(stats.estimated_final_commission)}</div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Based on trend
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-orange-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">Pending</CardTitle>
                    <Clock className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="text-lg font-bold mt-1">{formatCompactCurrency(stats.pending_commission)}</div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {stats.pending_stations} stations
                  </p>
                  {canApprove && stats.pending_commission > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-1 w-full text-[10px] h-6"
                      onClick={() => setActiveTab("commissions")}
                    >
                      Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Growth */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center text-sm">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                  Daily Growth - {formatShortDate(getCurrentPeriod() + '-01')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {loadingTankStockProgress ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : tankStockProgress.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Database className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No tank stock data</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {tankStockProgress.slice(-7).map((day) => (
                        <div 
                          key={day.date} 
                          className={`flex items-center justify-between p-2 border rounded-lg ${
                            day.is_today ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              day.is_today ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-xs font-semibold ${
                                day.is_today ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {day.day_of_month}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-medium">{day.day_name.slice(0, 3)}</div>
                              <div className="text-[10px] text-gray-600">
                                {formatNumber(day.volume)} L
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-600">
                              +{formatCompactCurrency(day.commission_earned)}
                            </div>
                            <div className="text-[10px] text-gray-600">
                              Total: {formatCompactCurrency(day.cumulative_commission)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <div className="text-xs font-medium text-blue-800">Base Commission</div>
                    <div className="text-sm font-bold text-blue-600">
                      {formatCompactCurrency(stats.current_base_commission)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-2 rounded-lg">
                    <div className="text-xs font-medium text-green-800">Daily Average</div>
                    <div className="text-sm font-bold text-green-600">
                      {formatCompactCurrency(dailyAverageCommission)}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-2 rounded-lg">
                    <div className="text-xs font-medium text-purple-800">Avg Rate</div>
                    <div className="text-sm font-bold text-purple-600">
                      {formatCommissionRate(averageCommissionRate)}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-xs font-medium text-gray-800">Stations</div>
                    <div className="text-sm font-bold text-gray-700">
                      {stats.total_stations}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full text-sm"
                  onClick={() => setActiveTab("commissions")}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full History
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission History Tab */}
          <TabsContent value="commissions" className="mt-0 space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Commission History</h3>
                <p className="text-sm text-gray-600">
                  {commissions.length} records • {formatCompactCurrency(totalCommission)} total
                </p>
              </div>
              <Drawer open={showFilters} onOpenChange={setShowFilters}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Filters</DrawerTitle>
                    <DrawerDescription>
                      Filter commission history
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          type="date" 
                          value={filters.start_date}
                          onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value, page: 1 }))}
                        />
                        <Input 
                          type="date" 
                          value={filters.end_date}
                          onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value, page: 1 }))}
                        />
                      </div>
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
                            {filteredStationsForDropdown.slice(0, 10).map((station) => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
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
                          <SelectItem value="3">3 months</SelectItem>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>

            {/* Commission List */}
            {loadingCommissions ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading commissions...</p>
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No commissions found</p>
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
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <Card 
                    key={commission.id} 
                    className={`${isCurrentPeriod(commission.period) ? 'border-green-200 bg-green-50' : ''}`}
                    onClick={() => {
                      setSelectedCommission(commission);
                      setShowCommissionDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Store className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className="font-medium truncate">{getStationName(commission)}</span>
                            {isCurrentPeriod(commission.period) && (
                              <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            {formatDate(commission.period)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-gray-500">Volume</div>
                              <div className="font-medium">{formatNumber(commission.total_volume)} L</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Rate</div>
                              <div className="font-medium text-purple-600">
                                {formatCommissionRate(commission.commission_rate > 0 ? commission.commission_rate : getStationCommissionRate(commission))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatCompactCurrency(commission.total_commission)}
                            </div>
                            <div className="flex items-center justify-end mt-1">
                              <Badge variant={getStatusVariant(commission.status)} className="text-xs">
                                {getStatusIcon(commission.status)}
                                <span className="ml-1">{commission.status}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Pagination */}
                <div className="flex items-center justify-center space-x-4 mt-4">
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
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center text-sm">
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Performance Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-800">Total Commission</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCompactCurrency(stats.total_commission)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-800">Current Month</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCompactCurrency(stats.current_month_commission)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-purple-800">Avg Rate</div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCommissionRate(averageCommissionRate)}
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-orange-800">Daily Avg</div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCompactCurrency(dailyAverageCommission)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center text-sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Commission Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-800">Average Commission Rate</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCommissionRate(averageCommissionRate)}
                    </div>
                  </div>
                  
                  {stats.stations_using_default_rate !== undefined && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-yellow-800">Using Default Rate</div>
                      <div className="text-lg font-bold text-yellow-600">
                        {stats.stations_using_default_rate}
                      </div>
                      <div className="text-xs text-yellow-700">
                        of {stats.total_stations} stations
                      </div>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Management</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Rates
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Commission Details Drawer */}
      <Drawer open={showCommissionDetails} onOpenChange={setShowCommissionDetails}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Commission Details</DrawerTitle>
          </DrawerHeader>
          {selectedCommission && (
            <div className="px-4 space-y-4 pb-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium">{getStationName(selectedCommission)}</div>
                    {selectedCommission.station_location && (
                      <div className="text-sm text-gray-600">{selectedCommission.station_location}</div>
                    )}
                  </div>
                </div>
                
                {selectedCommission.dealer_name && (
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-gray-500" />
                    <div className="text-sm">{selectedCommission.dealer_name}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Period</div>
                    <div className="font-medium">{formatDate(selectedCommission.period)}</div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Volume</div>
                    <div className="font-medium">{formatNumber(selectedCommission.total_volume)} L</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-xs text-purple-700">Commission Rate</div>
                    <div className="font-medium text-purple-600">
                      {formatCommissionRate(selectedCommission.commission_rate > 0 ? selectedCommission.commission_rate : getStationCommissionRate(selectedCommission))}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs text-green-700">Status</div>
                    <Badge variant={getStatusVariant(selectedCommission.status)} className="mt-1">
                      {getStatusIcon(selectedCommission.status)}
                      <span className="ml-1">{selectedCommission.status}</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-700">Total Commission</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedCommission.total_commission)}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {canApprove && selectedCommission.status === 'pending' && (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setShowCommissionDetails(false);
                      openPaymentDialog(selectedCommission);
                    }}
                  >
                    Mark Paid
                  </Button>
                )}
                {selectedCommission.status === 'paid' && (
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">Close</Button>
                </DrawerClose>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{getStationName(selectedCommission)}</div>
                {selectedCommission.dealer_name && (
                  <div className="text-sm text-gray-600">Dealer: {selectedCommission.dealer_name}</div>
                )}
                <div className="text-sm text-gray-600">Period: {formatDate(selectedCommission.period)}</div>
                <div className="text-lg font-bold text-green-600 mt-2">
                  {formatCurrency(selectedCommission.total_commission)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input 
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Enter reference"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Date</Label>
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
                  placeholder="Add notes..."
                  rows={2}
                />
              </div>
              
              <DialogFooter className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleMarkAsPaid(selectedCommission)}
                  disabled={submitting || !paymentForm.reference_number || !paymentForm.payment_date}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Mark as Paid
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}