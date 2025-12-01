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
} from "lucide-react";
import { Dealer, DealerStation, Commission, StationReport } from "../../types/database";
import { api } from "../../lib/api";

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

const formatCommissionRate = (rate: number) => {
  return `GHS ${Number(rate).toFixed(3)}/L`;
};

// Simple inline components
const DealerHeader = ({ dealer, stations, commissionStats }: { 
  dealer: Dealer; 
  stations: DealerStation[]; 
  commissionStats: CommissionStats;
}) => (
  <div className="mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{dealer.name}</h1>
        <p className="text-gray-600">Managing {stations.length} stations</p>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="bg-blue-50">
            <DollarSign className="w-3 h-3 mr-1" />
            {formatCommissionRate(dealer.commission_rate)}
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            <TrendingUp className="w-3 h-3 mr-1" />
            {formatCurrency(commissionStats.current_month_commission)} this month
          </Badge>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">Performance Rating</p>
        <p className="text-xl font-bold text-green-600">{dealer.performance_rating}/5.0</p>
      </div>
    </div>
  </div>
);

const DealerStats = ({ 
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
  const stats = [
    {
      label: "Month Sales",
      value: `₵${todaySales.toLocaleString()}`,
      change: "Current month",
      trend: "up" as const,
      icon: DollarSign,
      description: "Total sales this month"
    },
    {
      label: "Total Stock",
      value: `${stockBalance.toLocaleString()}L`,
      change: `${Math.round((stockBalance / (stationsCount * 50000)) * 100)}% utilized`,
      trend: "neutral" as const,
      icon: Fuel,
      description: "Current inventory"
    },
    {
      label: "Loss %",
      value: `${lossPercentage.toFixed(1)}%`,
      change: "Across all stations",
      trend: lossPercentage > 2 ? "down" as const : "neutral" as const,
      icon: TrendingUp,
      description: "Average loss percentage"
    },
    {
      label: "Month Commission",
      value: formatCurrency(commissionStats.current_month_commission),
      change: `+${formatCurrency(commissionStats.today_commission)} today`,
      trend: "up" as const,
      icon: Users,
      description: "Current month earnings"
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-xs ${
                  stat.trend === 'up' ? 'text-green-600' : 
                  stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const ProgressiveCommissionCard = ({ 
  progressiveData, 
  loading,
  onCalculateCommissions 
}: { 
  progressiveData: ProgressiveCommission[];
  loading: boolean;
  onCalculateCommissions: () => void;
}) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Progressive Commission Growth
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onCalculateCommissions}
          disabled={loading}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Recalculate
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2">Loading commission data...</span>
        </div>
      ) : progressiveData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4" />
          <p>No commission data available for current month</p>
          <p className="text-sm mt-2">Commissions will appear as tank stock data is recorded</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {progressiveData.map((day, index) => (
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
);

const RealTimeStockCard = ({ stocks, loading }: { stocks: RealTimeStock[]; loading: boolean }) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" />
        Real-Time Stock Levels
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No stock data available</p>
      ) : (
        <div className="space-y-4">
          {stocks.map((stock) => (
            <div key={stock.product_id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium text-black">{stock.product_name}</p>
                  <p className="text-sm text-gray-600">
                    Last updated: {new Date(stock.last_updated).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(stock.current_stock)}{stock.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    {stock.utilization_percentage}% utilized
                  </p>
                </div>
              </div>
              <Progress value={stock.utilization_percentage} className="w-full" />
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const CommissionPerformanceCard = ({ stats }: { stats: CommissionStats }) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Target className="w-5 h-5 text-purple-600" />
        Commission Performance
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.current_month_commission)}
          </div>
          <div className="text-sm text-gray-600">Current Month</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.today_commission)}
          </div>
          <div className="text-sm text-gray-600">Today</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2">
          <span className="text-sm text-gray-600">Month Progress</span>
          <span className="text-sm font-semibold">{Math.round(stats.current_month_progress)}%</span>
        </div>
        <Progress value={stats.current_month_progress} className="w-full" />
        
        <div className="flex items-center justify-between p-2">
          <span className="text-sm text-gray-600">Projected Final</span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(stats.estimated_final_commission)}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3">Commission Breakdown</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-bold">{formatCurrency(stats.base_commission_total)}</div>
            <div className="text-gray-600">Base</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-600">{formatCurrency(stats.current_windfall)}</div>
            <div className="text-gray-600">Windfall</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-bold text-orange-600">{formatCurrency(stats.current_shortfall)}</div>
            <div className="text-gray-600">Shortfall</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DealerCommissionCard = ({ commissions, dealer, stats }: { 
  commissions: Commission[]; 
  dealer: Dealer;
  stats: CommissionStats;
}) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>Commission History</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {stats.paid_commission > 0 ? `${formatCurrency(stats.paid_commission)} paid` : 'No payments'}
          </Badge>
          <Badge variant="secondary">
            {stats.pending_commission > 0 ? `${formatCurrency(stats.pending_commission)} pending` : 'All clear'}
          </Badge>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {commissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4" />
          <p>No commission records found</p>
          <p className="text-sm">Commissions will appear after calculation</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {commissions.map((commission) => (
              <div key={commission.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold">
                      {new Date(commission.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      <Database className="w-3 h-3 mr-1" />
                      {commission.data_source === 'daily_tank_stocks' ? 'Tank Stocks' : 'Sales'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <span>Volume: {formatNumber(commission.total_volume || 0)}L</span>
                    <span>Rate: {formatCommissionRate(commission.commission_rate || dealer.commission_rate)}</span>
                    <span>Base: {formatCurrency(commission.commission_amount || 0)}</span>
                  </div>
                  {commission.windfall_amount > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Sparkles className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        +{formatCurrency(commission.windfall_amount)} windfall
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(commission.total_commission || commission.amount)}
                  </p>
                  <Badge className={
                    commission.status === 'paid' ? 'bg-green-100 text-green-700' :
                    commission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {commission.status === 'paid' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {commission.status}
                  </Badge>
                  {commission.paid_at && (
                    <div className="text-xs text-gray-600 mt-1">
                      Paid: {new Date(commission.paid_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </CardContent>
  </Card>
);

const StationActivityList = ({ reports, showAll = false }: { reports: StationReport[]; showAll?: boolean }) => {
  const displayReports = showAll ? reports : reports.slice(0, 5);
  
  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Recent Station Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {displayReports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activity reports</p>
        ) : (
          <div className="space-y-4">
            {displayReports.map((report) => (
              <div key={report.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  report.status === 'normal' ? 'bg-green-500' :
                  report.status === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold">{report.station_name}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(report.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{report.notes || 'No notes provided'}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>Sales: ₵{report.sales.toLocaleString()}</span>
                    <span>Stock: {report.fuel_stock.toLocaleString()}L</span>
                    <span>Loss: {report.loss_percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LossAnalysisCard = ({ lossData, loading }: { lossData: LossAnalysis[]; loading: boolean }) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertOctagon className="w-5 h-5 text-red-600" />
        Loss Analysis Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : lossData.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No loss data available</p>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {lossData.map((loss) => (
              <div key={`${loss.station_id}-${loss.period}`} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-black">{loss.station_name}</p>
                    <p className="text-sm text-gray-600">{loss.period} • {loss.product_type}</p>
                  </div>
                  <Badge className={
                    loss.loss_percentage > 5 ? 'bg-red-100 text-red-700' :
                    loss.loss_percentage > 2 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }>
                    {loss.loss_percentage.toFixed(1)}% Loss
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume Sold:</span>
                      <span className="font-medium">{formatNumber(loss.total_volume_sold)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume Stocked:</span>
                      <span className="font-medium">{formatNumber(loss.total_volume_stocked)}L</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Stock:</span>
                      <span className="font-medium">{formatNumber(loss.expected_closing_stock)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Stock:</span>
                      <span className="font-medium">{formatNumber(loss.actual_closing_stock)}L</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Volume Loss:</span>
                    <span className="font-bold text-red-600">
                      {formatNumber(loss.volume_loss)}L
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(loss.loss_percentage * 10, 100)} 
                    className="w-full mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </CardContent>
  </Card>
);

export function DealerDashboard() {
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

  // Optimized data loading with proper table references
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

      // Load essential data in parallel for better performance
      const [monthlySalesData, stockData, commissionsData] = await Promise.all([
        loadMonthlySales(stationsData),
        loadCurrentStockFromTankStocks(stationsData),
        api.getDealerCommissions(dealerId)
      ]);

      // Set dealer info with REAL commission rate from stations table
      setDealer({
        id: userProfile.id,
        user_id: userProfile.id,
        name: userProfile.full_name || 'Dealer User',
        commission_rate: realCommissionRate, // REAL commission rate from stations table
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
        commission_rate: station.commission_rate || realCommissionRate, // Store real commission rate
      }));

      setStations(stationsWithRealData);
      setCommissions(commissionsData.success ? commissionsData.data || [] : []);
      
      // Load additional data in background after main content is shown
      setTimeout(() => {
        loadBackgroundData(stationsData, dealerId);
      }, 100);

    } catch (error: any) {
      console.error('Error loading dealer data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setLastSync(new Date());
    }
  }, []);

  // Load monthly sales from sales table (like original code)
  const loadMonthlySales = async (stations: any[]): Promise<number[]> => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
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

  // Load current stock from daily_tank_stocks table (like station manager dashboard)
  const loadCurrentStockFromTankStocks = async (stations: any[]): Promise<number[]> => {
    const stockPromises = stations.map(async (station) => {
      try {
        // Get the latest tank stock records for this station
        const response = await api.getDailyTankStocks(station.id);
        
        if (response.success && response.data) {
          // Sum up the latest closing_stock for all products
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

  // Load loss analysis data
  const loadLossAnalysis = async (stations: any[]): Promise<LossAnalysis[]> => {
    setLoadingLoss(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lossPromises = stations.map(async (station) => {
        try {
          // Get sales data for the month
          const salesResponse = await api.getSales({ 
            station_id: station.id, 
            start_date: `${currentMonth}-01`,
            end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
              .toISOString().split('T')[0]
          });

          // Get tank stock data for the month
          const tankStocksResponse = await api.getDailyTankStocks(station.id);

          if (salesResponse.success && tankStocksResponse.success) {
            const sales = salesResponse.data?.sales || [];
            const tankStocks = tankStocksResponse.data || [];

            // Calculate total volume sold from sales
            const totalVolumeSold = sales.reduce((sum: number, sale: any) => 
              sum + ((sale.closing_meter || 0) - (sale.opening_meter || 0)), 0
            );

            // Calculate total volume stocked from tank stocks
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

  // Load background data after main content is shown
  const loadBackgroundData = async (stations: any[], dealerId: string) => {
    try {
      const [reportsResponse, statsResponse, progressiveResponse, stocksResponse, lossResponse] = await Promise.all([
        api.getStationReports(dealerId),
        api.getCommissionStats({ dealer_id: dealerId }),
        loadProgressiveCommissions(),
        loadRealTimeStocks(stations),
        loadLossAnalysis(stations)
      ]);

      setReports(reportsResponse.success ? reportsResponse.data || [] : []);
      
      if (statsResponse.success) {
        setCommissionStats(statsResponse.data);
      }

      if (progressiveResponse) {
        setProgressiveCommissions(progressiveResponse);
      }

      if (stocksResponse) {
        setRealTimeStocks(stocksResponse);
      }

      if (lossResponse) {
        setLossAnalysis(lossResponse);
        // Update stations with calculated loss percentages
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

      // Refresh prices in background
      refreshPrices();
    } catch (error) {
      console.error('Error loading background data:', error);
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
          // Get the latest stock for each product
          const productStocks = response.data.reduce((acc: any, stock: any) => {
            if (!acc[stock.product_id] || new Date(stock.stock_date) > new Date(acc[stock.product_id].stock_date)) {
              acc[stock.product_id] = {
                product_id: stock.product_id,
                product_name: stock.products?.name || 'Unknown Product',
                current_stock: stock.closing_stock || 0,
                last_updated: stock.stock_date,
                unit: stock.products?.unit || 'L',
                capacity: 50000, // Default capacity
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

  const loadCommissionStats = async () => {
    if (!dealer) return;
    
    try {
      const response = await api.getCommissionStats({
        dealer_id: dealer.id
      });
      
      if (response.success) {
        setCommissionStats(response.data);
      }
    } catch (error) {
      console.error('Error loading commission stats:', error);
    }
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
        const [progressiveData, statsData, commissionsData] = await Promise.all([
          loadProgressiveCommissions(),
          loadCommissionStats(),
          api.getDealerCommissions(dealer.id)
        ]);

        if (progressiveData) setProgressiveCommissions(progressiveData);
        if (commissionsData.success) setCommissions(commissionsData.data || []);
      }
    } catch (error) {
      console.error('Error calculating commissions:', error);
    } finally {
      setLoadingProgressive(false);
    }
  };

  // Update station prices when prices load or change
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

    // Calculate performance based on sales and other metrics
    const totalSales = monthlySales.reduce((sum, sales) => sum + sales, 0);
    const avgSalesPerStation = totalSales / stations.length;
    
    // Simple performance calculation - you can enhance this
    const baseRating = 5.0;
    const salesFactor = Math.min(avgSalesPerStation / 100000, 1); // Normalize sales impact
    const performanceRating = baseRating * salesFactor;
    
    return Math.round(Math.max(performanceRating, 1.0) * 10) / 10;
  };

  const handleRefresh = () => {
    loadDealerData();
  };

  // Calculate real-time metrics from actual data
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

  // Loading skeleton components
  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          <StatsSkeleton />

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-64 w-full" />
              </Card>
              <Card className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-64 w-full" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-800">Data Loading Error</h2>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading Data
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">Dealer Profile Not Found</h2>
            </div>
            <p className="text-yellow-700 mb-4">
              Your dealer profile could not be loaded. Please contact support if this issue persists.
            </p>
            <Button onClick={handleRefresh} className="bg-yellow-600 hover:bg-yellow-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl text-black mb-2">Dealer Dashboard</h1>
            <p className="text-gray-600">Business Ownership & Multi-Station Profit Management</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              style={{ backgroundColor: '#0B2265' }}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Support
            </Button>
          </div>
        </div>

        {/* Sync Status */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">
              Last synced: {lastSync.toLocaleTimeString()}
            </span>
          </div>
          <Badge variant="outline" className="bg-white">Live Updates</Badge>
        </div>

        <DealerHeader dealer={dealer} stations={stations} commissionStats={commissionStats} />
        <DealerStats
          todaySales={monthlySales}
          stockBalance={stockBalance}
          lossPercentage={avgLoss}
          commissionEarned={commissionStats.current_month_commission}
          stationsCount={stations.length}
          commissionStats={commissionStats}
        />

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl w-full grid grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="stations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">My Stations</span>
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Commissions</span>
            </TabsTrigger>
            <TabsTrigger value="loss" className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              <span className="hidden sm:inline">Loss Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ProgressiveCommissionCard 
                  progressiveData={progressiveCommissions}
                  loading={loadingProgressive}
                  onCalculateCommissions={handleCalculateCommissions}
                />
              </div>
              <div className="space-y-6">
                <CommissionPerformanceCard stats={commissionStats} />
                <RealTimeStockCard stocks={realTimeStocks} loading={loadingStocks} />
              </div>
            </div>

            {/* Quick Insights */}
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Business Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Performance Rating</p>
                    <p className="text-2xl text-black">{dealer.performance_rating}/5.0</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Active Managers</p>
                    <p className="text-2xl text-black">{stations.length}</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Attention Needed</p>
                    <p className="text-2xl text-black">
                      {reports.filter(r => r.status === 'warning').length}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Commission Rate</p>
                    <p className="text-2xl text-black">{formatCommissionRate(dealer.commission_rate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stations">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Multi-Station Portfolio Management</CardTitle>
                <p className="text-sm text-gray-600">
                  Consolidated financial reporting across {stations.length} stations
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stations.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No stations assigned to your dealer account</p>
                      <p className="text-gray-400 text-sm">Contact support to get stations assigned to your dealer profile</p>
                    </div>
                  ) : (
                    stations.map((station) => {
                      const stationWithPrice = stationWithPrices.find(s => s.station_id === station.station_id);
                      const currentPrice = stationWithPrice?.currentPrice;
                      
                      return (
                        <div
                          key={station.id}
                          className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <Badge className={
                              station.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }>
                              {station.status}
                            </Badge>
                          </div>

                          <h4 className="text-lg text-black mb-2">{station.station_name}</h4>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                            <MapPin className="w-4 h-4" />
                            <span>{station.location}</span>
                          </div>

                          {currentPrice && (
                            <div className="mb-3 p-2 bg-green-50 rounded-lg">
                              <p className="text-sm text-green-700">
                                Current Price: <strong>₵{currentPrice.toFixed(2)}/L</strong>
                              </p>
                            </div>
                          )}

                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Manager:</span>
                              <span className="text-black">{station.manager_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Loss %:</span>
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
                              <span className="text-black font-semibold">
                                {formatCommissionRate(station.commission_rate || dealer.commission_rate)}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">Month Sales</p>
                              <p className="text-black">₵{station.current_sales?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Stock Level</p>
                              <div className="flex items-center gap-1">
                                <Fuel className="w-3 h-3 text-blue-600" />
                                <p className="text-black">{station.stock_level?.toLocaleString()}L</p>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 mt-4">
                            Assigned: {new Date(station.assigned_date).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <DealerCommissionCard commissions={commissions} dealer={dealer} stats={commissionStats} />
          </TabsContent>

          <TabsContent value="loss">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LossAnalysisCard lossData={lossAnalysis} loading={loadingLoss} />
              </div>
              <div className="space-y-6">
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-orange-600" />
                      Loss Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {avgLoss.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Average Loss</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">High Loss Stations:</span>
                        <span className="font-semibold text-red-600">
                          {lossAnalysis.filter(loss => loss.loss_percentage > 5).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Medium Loss Stations:</span>
                        <span className="font-semibold text-orange-600">
                          {lossAnalysis.filter(loss => loss.loss_percentage > 2 && loss.loss_percentage <= 5).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Low Loss Stations:</span>
                        <span className="font-semibold text-green-600">
                          {lossAnalysis.filter(loss => loss.loss_percentage <= 2).length}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Loss Impact</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Based on tank stock vs sales data</p>
                        <p>• Calculated from daily_tank_stocks table</p>
                        <p>• Real-time loss monitoring</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <StationActivityList reports={reports} showAll={true} />
          </TabsContent>
        </Tabs>

        {/* Mobile Support Button */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-2xl"
            style={{ backgroundColor: '#0B2265' }}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DealerDashboard;