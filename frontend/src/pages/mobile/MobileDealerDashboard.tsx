// frontend/src/pages/mobile/MobileDealerDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Progress } from "../../components/ui/progress";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Building2,
  MessageCircle,
  RefreshCw,
  Fuel,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  AlertCircle,
  Database,
  Calculator,
  Target,
  Zap,
  Clock,
  CheckCircle,
  TrendingDown,
  Activity,
  Sparkles,
  FileText,
  Download,
  Eye,
  AlertOctagon,
  Scale,
  PieChart,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Filter,
  Search,
  MoreVertical,
} from "lucide-react";
import { Dealer, DealerStation, Commission, StationReport } from "../../types/database";
import { api } from "../../lib/api";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";

// New interfaces for enhanced features
interface ProgressiveCommission {
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

interface RealTimeStock {
  product_id: string;
  product_name: string;
  current_stock: number;
  last_updated: string;
  unit: string;
  capacity: number;
  utilization_percentage: number;
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
}

interface LossAnalysis {
  station_id: string;
  station_name: string;
  total_volume_sold: number;
  total_volume_stocked: number;
  expected_closing_stock: number;
  actual_closing_stock: number;
  volume_loss: number;
  loss_percentage: number;
  period: string;
  product_type: string;
}

// Utility functions
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

const formatCurrencyCompact = (amount: number) => {
  const safeAmount = Number(amount) || 0;
  if (safeAmount >= 1000000) {
    return `₵${(safeAmount / 1000000).toFixed(1)}M`;
  } else if (safeAmount >= 1000) {
    return `₵${(safeAmount / 1000).toFixed(1)}K`;
  }
  return `₵${safeAmount.toFixed(0)}`;
};

const formatNumberCompact = (num: number) => {
  const safeNum = Number(num) || 0;
  if (safeNum >= 1000000) {
    return `${(safeNum / 1000000).toFixed(1)}M`;
  } else if (safeNum >= 1000) {
    return `${(safeNum / 1000).toFixed(1)}K`;
  }
  return safeNum.toFixed(0);
};

const formatCommissionRate = (rate: number) => {
  return `GHS ${Number(rate).toFixed(3)}/L`;
};

// Mobile-optimized components
const MobileDealerHeader = ({ dealer, stations, commissionStats, onMenuPress }: { 
  dealer: Dealer; 
  stations: DealerStation[]; 
  commissionStats: CommissionStats;
  onMenuPress?: () => void;
}) => (
  <div className="mb-4">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{dealer.name}</h1>
            <p className="text-xs text-gray-600">{stations.length} stations • {formatCommissionRate(dealer.commission_rate)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <p className="text-xs text-gray-600">This Month</p>
            <p className="text-sm font-bold text-blue-700">{formatCurrency(commissionStats.current_month_commission)}</p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <p className="text-xs text-gray-600">Rating</p>
            <div className="flex items-center">
              <p className="text-sm font-bold text-green-700">{dealer.performance_rating}/5.0</p>
              <TrendingUp className="w-3 h-3 ml-1 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {onMenuPress && (
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full"
          onClick={onMenuPress}
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      )}
    </div>
    
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-xs text-gray-700">Live • Synced just now</span>
    </div>
  </div>
);

const MobileStatsCard = ({ 
  todaySales, 
  stockBalance, 
  lossPercentage,
  commissionEarned, 
  stationsCount,
  commissionStats 
}: { 
  todaySales: number;
  stockBalance: number;
  lossPercentage: number;
  commissionEarned: number;
  stationsCount: number;
  commissionStats: CommissionStats;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const stats = [
    {
      label: "Month Sales",
      value: formatCurrencyCompact(todaySales),
      change: "Current month total",
      trend: "up" as const,
      icon: DollarSign,
      color: "blue" as const
    },
    {
      label: "Total Stock",
      value: `${stockBalance.toLocaleString()}L`,
      change: `${Math.round((stockBalance / (stationsCount * 50000)) * 100)}% utilized`,
      trend: "neutral" as const,
      icon: Fuel,
      color: "blue" as const
    },
    {
      label: "Loss",
      value: `${lossPercentage.toFixed(1)}%`,
      change: lossPercentage > 2 ? "Needs attention" : "Within limits",
      trend: lossPercentage > 2 ? "down" as const : "neutral" as const,
      icon: TrendingUp,
      color: lossPercentage > 2 ? "red" as const : "green" as const
    },
    {
      label: "Month Commission",
      value: formatCurrency(commissionStats.current_month_commission),
      change: `+${formatCurrency(commissionStats.today_commission)} today`,
      trend: "up" as const,
      icon: Users,
      color: "green" as const
    },
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Quick Stats</h3>
        <div className="flex items-center space-x-1">
          {stats.map((_, idx) => (
            <div 
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${idx === activeIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200">
        <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="w-full flex-shrink-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className={`text-xs ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${
                    stat.color === 'blue' ? 'bg-blue-50' :
                    stat.color === 'red' ? 'bg-red-50' :
                    'bg-green-50'
                  } rounded-xl flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${
                      stat.color === 'blue' ? 'text-blue-600' :
                      stat.color === 'red' ? 'text-red-600' :
                      'text-green-600'
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-center mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-gray-600"
          onClick={() => setActiveIndex((prev) => (prev + 1) % stats.length)}
        >
          Next stat
        </Button>
      </div>
    </div>
  );
};

const MobileTabNavigation = ({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'stations', label: 'Stations', icon: Building2 },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'loss', label: 'Loss', icon: AlertOctagon },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <ScrollArea className="w-full">
        <div className="flex space-x-1 px-4 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const MobileProgressiveCommission = ({ 
  progressiveData, 
  loading,
  onCalculateCommissions 
}: { 
  progressiveData: ProgressiveCommission[];
  loading: boolean;
  onCalculateCommissions: () => void;
}) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Commission Growth</CardTitle>
            <p className="text-xs text-gray-500">Daily progress</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={onCalculateCommissions}
          disabled={loading}
          className="h-8 px-2"
        >
          <Calculator className="w-4 h-4" />
        </Button>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-6">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-sm text-gray-600">Loading commission data...</span>
        </div>
      ) : progressiveData.length === 0 ? (
        <div className="text-center py-6">
          <Database className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No commission data available</p>
          <p className="text-xs text-gray-500 mt-1">Data will appear as stations report</p>
        </div>
      ) : (
        <ScrollArea className="h-[280px] -mx-4 px-4">
          <div className="space-y-2">
            {progressiveData.slice(-7).map((day, index) => (
              <div 
                key={day.date} 
                className={`flex items-center justify-between p-3 rounded-xl ${
                  day.is_today 
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    day.is_today ? 'bg-blue-100' : 'bg-white'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      day.is_today ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {day.day_of_month}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{day.day_name}</span>
                      {day.is_today && (
                        <Badge variant="default" className="ml-2 bg-blue-100 text-blue-800 text-xs px-1 py-0">
                          Today
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(day.volume)} L • {day.tank_dip_count} dips
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    +{formatCurrencyCompact(day.commission_earned)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Total: {formatCurrencyCompact(day.cumulative_commission)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </CardContent>
  </Card>
);

const MobileRealTimeStock = ({ stocks, loading }: { stocks: RealTimeStock[]; loading: boolean }) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
          <Database className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">Real-Time Stock</CardTitle>
          <p className="text-xs text-gray-500">Across all stations</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No stock data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stocks.slice(0, 3).map((stock) => (
            <div key={stock.product_id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-black">{stock.product_name}</p>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {formatNumber(stock.current_stock)}{stock.unit}
                  </p>
                  <p className="text-xs text-gray-600">
                    {stock.utilization_percentage}% full
                  </p>
                </div>
              </div>
              <Progress value={stock.utilization_percentage} className="w-full h-1.5" />
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date(stock.last_updated).toLocaleDateString('en-GH', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const MobileCommissionPerformance = ({ stats }: { stats: CommissionStats }) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
          <Target className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">Commission Performance</CardTitle>
          <p className="text-xs text-gray-500">This month breakdown</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {formatCurrency(stats.current_month_commission)}
          </div>
          <div className="text-xs text-gray-600">Current Month</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(stats.today_commission)}
          </div>
          <div className="text-xs text-gray-600">Today</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Month Progress</span>
            <span className="font-semibold">{Math.round(stats.current_month_progress)}%</span>
          </div>
          <Progress value={stats.current_month_progress} className="w-full h-2" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Projected Final</span>
          <span className="font-semibold text-green-600">
            {formatCurrency(stats.estimated_final_commission)}
          </span>
        </div>
      </div>

      <div className="border-t pt-3 mt-3">
        <h4 className="text-xs font-semibold mb-2 text-gray-600">Commission Breakdown</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-bold text-sm">{formatCurrency(stats.base_commission_total)}</div>
            <div className="text-xs text-gray-600">Base</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-600 text-sm">{formatCurrency(stats.current_windfall)}</div>
            <div className="text-xs text-gray-600">Windfall</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-bold text-orange-600 text-sm">{formatCurrency(stats.current_shortfall)}</div>
            <div className="text-xs text-gray-600">Shortfall</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const MobileStationsList = ({ 
  stations, 
  stationWithPrices,
  onStationPress 
}: { 
  stations: DealerStation[]; 
  stationWithPrices: any[];
  onStationPress?: (station: DealerStation) => void;
}) => (
  <div className="mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">My Stations ({stations.length})</h3>
      <Button variant="ghost" size="sm" className="text-xs text-blue-600">
        View All
      </Button>
    </div>
    
    <ScrollArea className="-mx-4 px-4">
      <div className="flex space-x-3 pb-2">
        {stations.map((station) => {
          const stationWithPrice = stationWithPrices.find(s => s.station_id === station.station_id);
          const currentPrice = stationWithPrice?.currentPrice;
          
          return (
            <div
              key={station.id}
              className="w-[280px] flex-shrink-0 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
              onClick={() => onStationPress?.(station)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <Badge className={
                  station.status === 'active' 
                    ? 'bg-green-100 text-green-700 text-xs' 
                    : 'bg-gray-100 text-gray-700 text-xs'
                }>
                  {station.status}
                </Badge>
              </div>

              <h4 className="text-sm font-semibold text-black mb-2">{station.station_name}</h4>
              
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{station.location}</span>
              </div>

              {currentPrice && (
                <div className="mb-3 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700">
                    Price: <strong>₵{currentPrice.toFixed(2)}/L</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-600 mb-1">Month Sales</p>
                  <p className="text-black font-semibold">₵{station.current_sales?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Stock Level</p>
                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-blue-600" />
                    <p className="text-black font-semibold">{station.stock_level?.toLocaleString()}L</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Loss %</p>
                  <p className={
                    station.loss_percentage > 2 
                      ? 'text-red-600 font-semibold' 
                      : station.loss_percentage > 1 
                      ? 'text-orange-600 font-semibold'
                      : 'text-green-600 font-semibold'
                  }>
                    {station.loss_percentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Manager</p>
                  <p className="text-black font-semibold truncate">{station.manager_name}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  </div>
);

const MobileCommissionHistory = ({ commissions, dealer, stats }: { 
  commissions: Commission[]; 
  dealer: Dealer;
  stats: CommissionStats;
}) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Commission History</CardTitle>
            <p className="text-xs text-gray-500">Past payments & pending</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
            {formatCurrency(stats.paid_commission)} paid
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      {commissions.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No commission records</p>
          <p className="text-xs text-gray-500 mt-1">Commissions appear after calculation</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] -mx-4 px-4">
          <div className="space-y-3">
            {commissions.slice(0, 5).map((commission) => (
              <div key={commission.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">
                    {new Date(commission.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  <Badge className={
                    commission.status === 'paid' ? 'bg-green-100 text-green-700 text-xs' :
                    commission.status === 'pending' ? 'bg-yellow-100 text-yellow-700 text-xs' :
                    'bg-blue-100 text-blue-700 text-xs'
                  }>
                    {commission.status === 'paid' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {commission.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                  <div>
                    <span>Volume: </span>
                    <span className="font-medium">{formatNumber(commission.total_volume || 0)}L</span>
                  </div>
                  <div>
                    <span>Rate: </span>
                    <span className="font-medium">{formatCommissionRate(commission.commission_rate || dealer.commission_rate)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    {commission.windfall_amount > 0 && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">
                          +{formatCurrency(commission.windfall_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(commission.total_commission || commission.amount)}
                  </p>
                </div>
                
                {commission.paid_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Paid: {new Date(commission.paid_at).toLocaleDateString('en-GH', { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </CardContent>
  </Card>
);

const MobileStationCard = ({ station, dealer }: { 
  station: DealerStation; 
  dealer: Dealer;
}) => (
  <div className="bg-white rounded-xl p-4 mb-3 border">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{station.station_name}</h4>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{station.location}</span>
          </div>
        </div>
      </div>
      <Badge className={
        station.status === 'active' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-gray-100 text-gray-700'
      }>
        {station.status}
      </Badge>
    </div>

    <div className="space-y-2 mb-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Manager:</span>
        <span className="font-medium">{station.manager_name}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Loss:</span>
        <span className={
          station.loss_percentage > 2 
            ? 'text-red-600' 
            : station.loss_percentage > 1 
            ? 'text-orange-600'
            : 'text-green-600'
        }>
          {station.loss_percentage.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Commission Rate:</span>
        <span className="font-semibold">
          {formatCommissionRate(station.commission_rate || dealer.commission_rate)}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
      <div className="text-center p-2 bg-blue-50 rounded-lg">
        <p className="text-gray-600">Sales</p>
        <p className="font-bold text-blue-600">
          {formatCurrencyCompact(station.current_sales || 0)}
        </p>
      </div>
      <div className="text-center p-2 bg-green-50 rounded-lg">
        <p className="text-gray-600">Stock</p>
        <div className="flex items-center justify-center gap-1">
          <Fuel className="h-3 w-3 text-green-600" />
          <p className="font-bold text-green-600">
            {formatNumberCompact(station.stock_level || 0)}L
          </p>
        </div>
      </div>
    </div>
  </div>
);

const MobileLossAnalysis = ({ lossData, loading }: { lossData: LossAnalysis[]; loading: boolean }) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
          <AlertOctagon className="w-4 h-4 text-red-600" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">Loss Analysis</CardTitle>
          <p className="text-xs text-gray-500">Volume loss across stations</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : lossData.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No loss data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lossData.slice(0, 3).map((loss) => (
            <div key={`${loss.station_id}-${loss.period}`} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-black truncate">{loss.station_name}</p>
                <Badge className={
                  loss.loss_percentage > 5 ? 'bg-red-100 text-red-700 text-xs' :
                  loss.loss_percentage > 2 ? 'bg-yellow-100 text-yellow-700 text-xs' :
                  'bg-green-100 text-green-700 text-xs'
                }>
                  {loss.loss_percentage.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="text-xs text-gray-600 mb-2">
                {loss.period} • {loss.product_type}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-gray-600">Sold:</span>
                  <span className="font-medium ml-1">{formatNumber(loss.total_volume_sold)}L</span>
                </div>
                <div>
                  <span className="text-gray-600">Stocked:</span>
                  <span className="font-medium ml-1">{formatNumber(loss.total_volume_stocked)}L</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Volume Loss:</span>
                <span className="font-bold text-red-600">
                  {formatNumber(loss.volume_loss)}L
                </span>
              </div>
              
              <Progress 
                value={Math.min(loss.loss_percentage * 10, 100)} 
                className="w-full h-1.5 mt-1"
              />
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const MobileActivityFeed = ({ reports }: { reports: StationReport[] }) => (
  <Card className="mb-4 border-0 shadow-sm">
    <CardHeader className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <p className="text-xs text-gray-500">Station updates & alerts</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-blue-600">
          See All
        </Button>
      </div>
    </CardHeader>
    <CardContent className="px-4 pt-0">
      {reports.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.slice(0, 3).map((report) => (
            <div key={report.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                report.status === 'normal' ? 'bg-green-500' :
                report.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-semibold">{report.station_name}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(report.timestamp).toLocaleTimeString('en-GH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {report.notes || 'No notes provided'}
                </p>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-700">Sales: ₵{report.sales.toLocaleString()}</span>
                  <span className="text-gray-700">Stock: {report.fuel_stock.toLocaleString()}L</span>
                  <span className={
                    report.loss_percentage > 2 ? 'text-red-600' :
                    report.loss_percentage > 1 ? 'text-orange-600' :
                    'text-green-600'
                  }>
                    Loss: {report.loss_percentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const MobileQuickActions = ({ onRefresh, isLoading }: { onRefresh: () => void; isLoading: boolean }) => {
  const actions = [
    { icon: MessageCircle, label: 'Support', color: 'bg-blue-600' },
    { icon: Download, label: 'Export', color: 'bg-green-600' },
    { icon: Eye, label: 'Insights', color: 'bg-purple-600' },
  ];

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="outline"
          className="flex flex-col items-center justify-center h-20 rounded-xl"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-1">
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-xs text-gray-700">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
        
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="flex flex-col items-center justify-center h-20 rounded-xl"
          >
            <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mb-1`}>
              <action.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-gray-700">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export function MobileDealerDashboard() {
  const { user } = useAuth();
  const { 
    getStationAllPrices, 
    refreshPrices, 
    loading: pricesLoading,
    currentPrices 
  } = usePrices();
  
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [stations, setStations] = useState<DealerStation[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reports, setReports] = useState<StationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [stationWithPrices, setStationWithPrices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // New state for enhanced features
  const [progressiveCommissions, setProgressiveCommissions] = useState<ProgressiveCommission[]>([]);
  const [realTimeStocks, setRealTimeStocks] = useState<RealTimeStock[]>([]);
  const [lossAnalysis, setLossAnalysis] = useState<LossAnalysis[]>([]);
  const [commissionStats, setCommissionStats] = useState<CommissionStats>({
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
  const [loadingProgressive, setLoadingProgressive] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingLoss, setLoadingLoss] = useState(false);

  // Optimized data loading
  const loadDealerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load dealer profile first to get dealer_id
      const profileResponse = await api.getCurrentUserProfile();
      
      if (!profileResponse.success || !profileResponse.data) {
        throw new Error('Failed to load dealer profile');
      }

      const userProfile = profileResponse.data;
      const dealerId = userProfile.dealer_id;

      if (!dealerId) {
        throw new Error('Dealer ID not found in user profile');
      }

      // Load dealer details from stations table to get real commission rate
      const dealerStationsResponse = await api.getDealerStations(dealerId);
      if (!dealerStationsResponse.success || !dealerStationsResponse.data) {
        throw new Error('Failed to load dealer stations');
      }

      const stationsData = dealerStationsResponse.data;
      
      // Get real commission rate from the first station (assuming same rate for all stations under dealer)
      const realCommissionRate = stationsData[0]?.commission_rate || 0.05;

      // Load essential data
      const [monthlySalesData, stockData, commissionsData] = await Promise.all([
        loadMonthlySales(stationsData),
        loadCurrentStockFromTankStocks(stationsData),
        api.getDealerCommissions(dealerId)
      ]);

      // Set dealer info
      setDealer({
        id: userProfile.id,
        user_id: userProfile.id,
        name: userProfile.full_name || 'Dealer User',
        commission_rate: realCommissionRate,
        contact: userProfile.phone || 'No contact',
        email: userProfile.email || '',
        created_at: userProfile.created_at,
        status: 'active',
        total_stations: stationsData.length,
        monthly_commission: calculateMonthlyCommission(commissionsData),
        performance_rating: calculatePerformanceRating(stationsData, monthlySalesData),
      });

      // Create stations with real data
      const stationsWithRealData: DealerStation[] = stationsData.map((station: any, index: number) => ({
        id: `ds_${station.id}`,
        dealer_id: dealerId,
        station_id: station.id,
        station_name: station.name,
        location: `${station.city || ''}, ${station.region || ''}`.trim() || 'Location not set',
        assigned_date: station.created_at,
        status: station.status || 'active',
        current_sales: monthlySalesData[index] || 0,
        stock_level: stockData[index] || 0,
        loss_percentage: 0, // Will be calculated separately
        manager_name: station.manager_name || 'Station Manager',
        commission_rate: station.commission_rate || realCommissionRate,
      }));

      setStations(stationsWithRealData);
      setCommissions(commissionsData.success ? commissionsData.data || [] : []);
      
      // Load additional data
      loadBackgroundData(stationsData, dealerId);

    } catch (error: any) {
      console.error('Error loading dealer data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setLastSync(new Date());
    }
  }, []);

  const loadMonthlySales = async (stations: any[]): Promise<number[]> => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const firstDay = `${currentMonth}-01`;
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString().split('T')[0];
    
    const salesPromises = stations.map(async (station) => {
      try {
        const response = await api.getSales({ 
          station_id: station.id, 
          start_date: firstDay,
          end_date: lastDay
        });
        
        if (response.success && response.data?.sales) {
          return response.data.sales.reduce((sum: number, sale: any) => 
            sum + (sale.total_amount || 0), 0
          );
        }
        return 0;
      } catch (error) {
        console.error(`Error loading sales for station ${station.id}:`, error);
        return 0;
      }
    });

    return Promise.all(salesPromises);
  };

  const loadCurrentStockFromTankStocks = async (stations: any[]): Promise<number[]> => {
    const stockPromises = stations.map(async (station) => {
      try {
        const response = await api.getDailyTankStocks(station.id);
        
        if (response.success && response.data) {
          const latestStocks = response.data.reduce((acc: any, stock: any) => {
            if (!acc[stock.product_id] || new Date(stock.stock_date) > new Date(acc[stock.product_id].stock_date)) {
              acc[stock.product_id] = stock;
            }
            return acc;
          }, {});

          return Object.values(latestStocks).reduce((sum: number, stock: any) => 
            sum + (stock.closing_stock || 0), 0
          );
        }
        return 0;
      } catch (error) {
        console.error(`Error loading stock for station ${station.id}:`, error);
        return 0;
      }
    });

    return Promise.all(stockPromises);
  };

  const loadBackgroundData = async (stations: any[], dealerId: string) => {
    try {
      const [reportsResponse, statsResponse, lossResponse] = await Promise.all([
        api.getStationReports(dealerId),
        api.getCommissionStats({ dealer_id: dealerId }),
        loadLossAnalysis(stations)
      ]);

      setReports(reportsResponse.success ? reportsResponse.data || [] : []);
      
      if (statsResponse.success) {
        setCommissionStats(statsResponse.data);
      }

      if (lossResponse) {
        setLossAnalysis(lossResponse);
        setStations(prevStations => 
          prevStations.map(station => {
            const stationLoss = lossResponse.find(loss => loss.station_id === station.station_id);
            return {
              ...station,
              loss_percentage: stationLoss?.loss_percentage || 0
            };
          })
        );
      }

      refreshPrices();
    } catch (error) {
      console.error('Error loading background data:', error);
    }
  };

  const loadLossAnalysis = async (stations: any[]): Promise<LossAnalysis[]> => {
    setLoadingLoss(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lossPromises = stations.map(async (station) => {
        try {
          const salesResponse = await api.getSales({ 
            station_id: station.id, 
            start_date: `${currentMonth}-01`,
            end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
              .toISOString().split('T')[0]
          });

          const tankStocksResponse = await api.getDailyTankStocks(station.id);

          if (salesResponse.success && tankStocksResponse.success) {
            const sales = salesResponse.data?.sales || [];
            const tankStocks = tankStocksResponse.data || [];

            const totalVolumeSold = sales.reduce((sum: number, sale: any) => 
              sum + ((sale.closing_meter || 0) - (sale.opening_meter || 0)), 0
            );

            const latestStock = tankStocks.reduce((latest: any, stock: any) => {
              if (!latest || new Date(stock.stock_date) > new Date(latest.stock_date)) {
                return stock;
              }
              return latest;
            }, null);

            if (latestStock) {
              const totalVolumeStocked = latestStock.opening_stock + latestStock.deliveries;
              const expectedClosingStock = totalVolumeStocked - totalVolumeSold;
              const actualClosingStock = latestStock.closing_stock;
              const volumeLoss = Math.max(0, expectedClosingStock - actualClosingStock);
              const lossPercentage = totalVolumeStocked > 0 ? (volumeLoss / totalVolumeStocked) * 100 : 0;

              return {
                station_id: station.id,
                station_name: station.name,
                total_volume_sold: totalVolumeSold,
                total_volume_stocked: totalVolumeStocked,
                expected_closing_stock: expectedClosingStock,
                actual_closing_stock: actualClosingStock,
                volume_loss: volumeLoss,
                loss_percentage: lossPercentage,
                period: currentMonth,
                product_type: 'All Products'
              };
            }
          }

          return null;
        } catch (error) {
          console.error(`Error calculating loss for station ${station.id}:`, error);
          return null;
        }
      });

      const lossResults = await Promise.all(lossPromises);
      return lossResults.filter((loss): loss is LossAnalysis => loss !== null);
    } catch (error) {
      console.error('Error loading loss analysis:', error);
      return [];
    } finally {
      setLoadingLoss(false);
    }
  };

  // Update station prices
  useEffect(() => {
    if (stations.length > 0 && !pricesLoading) {
      const stationsWithPriceData = stations.map(station => {
        const stationPrices = getStationAllPrices(station.station_id);
        return {
          ...station,
          prices: stationPrices,
          currentPrice: stationPrices.length > 0 ? stationPrices[0]?.selling_price : null
        };
      });
      setStationWithPrices(stationsWithPriceData);
    }
  }, [stations, pricesLoading, getStationAllPrices]);

  // Load progressive commission data when tab changes to overview
  useEffect(() => {
    if (activeTab === 'overview' && dealer && progressiveCommissions.length === 0) {
      setLoadingProgressive(true);
      loadProgressiveCommissions().then(data => {
        if (data) setProgressiveCommissions(data);
        setLoadingProgressive(false);
      });
    }
  }, [activeTab, dealer]);

  // Load real-time stocks when tab changes to overview
  useEffect(() => {
    if (activeTab === 'overview' && dealer && realTimeStocks.length === 0) {
      setLoadingStocks(true);
      loadRealTimeStocks(stations).then(data => {
        if (data) setRealTimeStocks(data);
        setLoadingStocks(false);
      });
    }
  }, [activeTab, dealer, stations]);

  // Load loss analysis when tab changes to loss
  useEffect(() => {
    if (activeTab === 'loss' && dealer && lossAnalysis.length === 0) {
      loadLossAnalysis(stations);
    }
  }, [activeTab, dealer, stations]);

  // Initial data load
  useEffect(() => {
    loadDealerData();
  }, []);

  const calculateMonthlyCommission = (commissionsResponse: any): number => {
    if (!commissionsResponse.success || !commissionsResponse.data) return 0;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentCommission = commissionsResponse.data.find((c: Commission) => 
      c.month.startsWith(currentMonth)
    );
    
    return currentCommission?.amount || 0;
  };

  const calculatePerformanceRating = (stations: any[], monthlySales: number[]): number => {
    if (stations.length === 0) return 0;

    const totalSales = monthlySales.reduce((sum, sales) => sum + sales, 0);
    const avgSalesPerStation = totalSales / stations.length;
    const baseRating = 5.0;
    const salesFactor = Math.min(avgSalesPerStation / 100000, 1);
    const performanceRating = baseRating * salesFactor;
    
    return Math.round(Math.max(performanceRating, 1.0) * 10) / 10;
  };

  const handleRefresh = () => {
    loadDealerData();
  };

  const handleCalculateCommissions = async () => {
    if (!dealer) return;
    
    try {
      setLoadingProgressive(true);
      const response = await api.calculateCommissions({
        dealer_id: dealer.id,
        period: new Date().toISOString().slice(0, 7),
        data_source: 'daily_tank_stocks'
      });
      
      if (response.success) {
        loadDealerData();
      }
    } catch (error) {
      console.error('Error calculating commissions:', error);
    } finally {
      setLoadingProgressive(false);
    }
  };

  const loadProgressiveCommissions = async (): Promise<ProgressiveCommission[] | null> => {
    if (!dealer) return null;
    
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const response = await api.getProgressiveCommissions(currentPeriod);
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading progressive commissions:', error);
      return null;
    }
  };

  const loadRealTimeStocks = async (stations: any[]): Promise<RealTimeStock[] | null> => {
    try {
      const stockPromises = stations.map(station => 
        api.getDailyTankStocks(station.id)
      );
      
      const stockResponses = await Promise.all(stockPromises);
      const allStocks: RealTimeStock[] = [];
      
      stockResponses.forEach((response, index) => {
        if (response.success && response.data) {
          const productStocks = response.data.reduce((acc: any, stock: any) => {
            if (!acc[stock.product_id] || new Date(stock.stock_date) > new Date(acc[stock.product_id].stock_date)) {
              acc[stock.product_id] = {
                product_id: stock.product_id,
                product_name: stock.products?.name || 'Unknown Product',
                current_stock: stock.closing_stock || 0,
                last_updated: stock.stock_date,
                unit: stock.products?.unit || 'L',
                capacity: 50000,
                utilization_percentage: Math.min(((stock.closing_stock || 0) / 50000) * 100, 100)
              };
            }
            return acc;
          }, {});

          allStocks.push(...Object.values(productStocks));
        }
      });
      
      return allStocks;
    } catch (error) {
      console.error('Error loading real-time stocks:', error);
      return null;
    }
  };

  // Calculate real-time metrics
  const monthlySales = useMemo(() => 
    stations.reduce((sum, station) => sum + (station.current_sales || 0), 0), 
    [stations]
  );
  
  const stockBalance = useMemo(() => 
    stations.reduce((sum, station) => sum + (station.stock_level || 0), 0), 
    [stations]
  );
  
  const avgLoss = useMemo(() => 
    stations.length > 0 ? 
      stations.reduce((sum, station) => sum + (station.loss_percentage || 0), 0) / stations.length : 0, 
    [stations]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>

          {/* Stats Skeleton */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex space-x-2 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-800">Error Loading Data</h2>
            </div>
            <p className="text-red-700 mb-4 text-sm">{error}</p>
            <Button onClick={handleRefresh} className="w-full bg-red-600 hover:bg-red-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="p-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">Profile Not Found</h2>
            </div>
            <p className="text-yellow-700 mb-4 text-sm">
              Please contact support to set up your dealer profile
            </p>
            <Button onClick={handleRefresh} className="w-full bg-yellow-600 hover:bg-yellow-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <MobileDealerHeader 
          dealer={dealer} 
          stations={stations} 
          commissionStats={commissionStats}
          onMenuPress={() => setShowMenu(true)}
        />
        
        <MobileStatsCard
          todaySales={monthlySales}
          stockBalance={stockBalance}
          lossPercentage={avgLoss}
          commissionEarned={commissionStats.current_month_commission}
          stationsCount={stations.length}
          commissionStats={commissionStats}
        />

        <MobileQuickActions onRefresh={handleRefresh} isLoading={isLoading} />

        {/* Tab Navigation */}
        <MobileTabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <MobileProgressiveCommission 
                progressiveData={progressiveCommissions}
                loading={loadingProgressive}
                onCalculateCommissions={handleCalculateCommissions}
              />
              <MobileCommissionPerformance stats={commissionStats} />
              <MobileRealTimeStock stocks={realTimeStocks} loading={loadingStocks} />
            </div>
          )}

          {activeTab === 'stations' && (
            <MobileStationsList 
              stations={stations} 
              stationWithPrices={stationWithPrices}
            />
          )}

          {activeTab === 'commissions' && (
            <MobileCommissionHistory 
              commissions={commissions} 
              dealer={dealer} 
              stats={commissionStats}
            />
          )}

          {activeTab === 'loss' && (
            <MobileLossAnalysis lossData={lossAnalysis} loading={loadingLoss} />
          )}

          {activeTab === 'activity' && (
            <MobileActivityFeed reports={reports} />
          )}
        </div>
      </div>

      {/* Fixed Support Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl"
          style={{ backgroundColor: '#0B2265' }}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4">
        <div className="grid grid-cols-4 gap-2">
          <Button variant="ghost" size="sm" className="flex flex-col items-center">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center">
            <Building2 className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Stations</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Commissions</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center">
            <Activity className="w-5 h-5 text-gray-600" />
            <span className="text-xs mt-1">Activity</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileDealerDashboard;
