import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
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
} from "lucide-react";
import { Dealer, DealerStation, Commission, StationReport } from "../../types/database";
import { api } from "../../lib/api";

// Simple inline components
const DealerHeader = ({ dealer, stations }: { dealer: Dealer; stations: DealerStation[] }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{dealer.name}</h1>
        <p className="text-gray-600">Managing {stations.length} stations</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">Commission Rate</p>
        <p className="text-xl font-bold text-green-600">{dealer.commission_rate}%</p>
      </div>
    </div>
  </div>
);

const DealerStats = ({ 
  todaySales, 
  stockBalance, 
  lossPercentage, 
  commissionEarned, 
  stationsCount 
}: { 
  todaySales: number;
  stockBalance: number;
  lossPercentage: number;
  commissionEarned: number;
  stationsCount: number;
}) => {
  const stats = [
    {
      label: "Today's Sales",
      value: `₵${todaySales.toLocaleString()}`,
      change: "+12%",
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      label: "Stock Balance",
      value: `${stockBalance.toLocaleString()}L`,
      change: "Adequate",
      trend: "neutral" as const,
      icon: Fuel,
    },
    {
      label: "Loss %",
      value: `${lossPercentage.toFixed(1)}%`,
      change: "-0.2%",
      trend: "down" as const,
      icon: TrendingUp,
    },
    {
      label: "Commission",
      value: `₵${commissionEarned.toLocaleString()}`,
      change: "This Month",
      trend: "up" as const,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-xs ${
                  stat.trend === 'up' ? 'text-green-600' : 
                  stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </p>
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

const DealerCommissionCard = ({ commissions, dealer }: { commissions: Commission[]; dealer: Dealer }) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle>Commission History</CardTitle>
    </CardHeader>
    <CardContent>
      {commissions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No commission records found</p>
      ) : (
        <div className="space-y-4">
          {commissions.map((commission) => (
            <div key={commission.id} className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-semibold">{new Date(commission.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                <p className="text-sm text-gray-600">Total Sales: ₵{commission.total_sales?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">₵{commission.amount.toLocaleString()}</p>
                <Badge className={
                  commission.status === 'paid' ? 'bg-green-100 text-green-700' :
                  commission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {commission.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
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

const StationPerformanceChart = ({ data }: { data: any[] }) => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle>Performance Overview</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Performance chart will be displayed here</p>
          <p className="text-sm">Last 7 days data</p>
        </div>
      </div>
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

  useEffect(() => {
    loadDealerData();
  }, [user]);

  useEffect(() => {
    // Update station prices when prices load or change
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

  const loadDealerData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Refresh prices first
      await refreshPrices();
      
      // Load dealer profile
      const profileResponse = await api.getCurrentUserProfile();
      
      if (!profileResponse.success || !profileResponse.data) {
        throw new Error('Failed to load dealer profile');
      }

      const userProfile = profileResponse.data;
      const dealerId = userProfile.dealer_id;

      if (!dealerId) {
        throw new Error('Dealer ID not found in user profile');
      }

      // Load all data in parallel
      const [stationsResponse, commissionsResponse, reportsResponse] = await Promise.all([
        api.getDealerStations(dealerId),
        api.getDealerCommissions(dealerId),
        api.getStationReports(dealerId)
      ]);

      // Handle stations data
      let stationsData: DealerStation[] = [];
      if (stationsResponse.success && stationsResponse.data) {
        stationsData = await loadStationMetrics(stationsResponse.data);
      } else {
        throw new Error('Failed to load dealer stations');
      }

      // Set dealer info with real data
      setDealer({
        id: userProfile.id,
        user_id: userProfile.id,
        name: userProfile.full_name || 'Dealer User',
        commission_rate: userProfile.commission_rate || 2.5,
        contact: userProfile.phone || 'No contact',
        email: userProfile.email || '',
        created_at: userProfile.created_at,
        status: 'active',
        total_stations: stationsData.length,
        monthly_commission: calculateMonthlyCommission(commissionsResponse),
        performance_rating: calculatePerformanceRating(stationsData),
      });

      setStations(stationsData);
      setCommissions(commissionsResponse.success ? commissionsResponse.data || [] : []);
      setReports(reportsResponse.success ? reportsResponse.data || [] : []);

    } catch (error: any) {
      console.error('Error loading dealer data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setLastSync(new Date());
    }
  };

  const loadStationMetrics = async (stations: any[]): Promise<DealerStation[]> => {
    const stationsWithMetrics = await Promise.all(
      stations.map(async (station) => {
        try {
          // Get real-time data for each station
          const [salesResponse, inventoryResponse, violationsResponse] = await Promise.all([
            api.getSales({ station_id: station.id, start_date: getTodayDate() }),
            api.getTankStocks(station.id),
            api.getViolations({ station_id: station.id, status: 'open' })
          ]);

          // Calculate today's sales
          const todaySales = salesResponse.success ? 
            salesResponse.data?.sales?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0 : 0;
          
          // Calculate total stock level
          const stockLevel = inventoryResponse.success ? 
            inventoryResponse.data?.reduce((sum: number, inv: any) => sum + (inv.current_stock || 0), 0) || 0 : 0;

          // Calculate loss percentage based on open violations
          const openViolations = violationsResponse.success ? violationsResponse.data?.length || 0 : 0;
          const lossPercentage = Math.min(openViolations * 0.5, 10); // Cap at 10%

          return {
            id: `ds_${station.id}`,
            dealer_id: user?.dealer_id || '',
            station_id: station.id,
            station_name: station.name,
            location: `${station.city || ''}, ${station.region || ''}`.trim() || 'Location not set',
            assigned_date: station.created_at,
            status: station.status || 'active',
            current_sales: todaySales,
            stock_level: stockLevel,
            loss_percentage: lossPercentage,
            manager_name: await getStationManagerName(station.id),
          };
        } catch (error) {
          console.error(`Error loading metrics for station ${station.id}:`, error);
          // Return station with minimal data when metrics fail
          return {
            id: `ds_${station.id}`,
            dealer_id: user?.dealer_id || '',
            station_id: station.id,
            station_name: station.name,
            location: `${station.city || ''}, ${station.region || ''}`.trim() || 'Location not set',
            assigned_date: station.created_at,
            status: station.status || 'active',
            current_sales: 0,
            stock_level: 0,
            loss_percentage: 0,
            manager_name: 'Loading...',
          };
        }
      })
    );

    return stationsWithMetrics;
  };

  const getStationManagerName = async (stationId: string): Promise<string> => {
    try {
      const stationResponse = await api.getStationById(stationId);
      if (stationResponse.success && stationResponse.data?.manager_id) {
        const managerResponse = await api.getUserById(stationResponse.data.manager_id);
        if (managerResponse.success && managerResponse.data) {
          return managerResponse.data.full_name || 'Station Manager';
        }
      }
    } catch (error) {
      console.error(`Error loading manager for station ${stationId}:`, error);
    }
    return 'Station Manager';
  };

  const calculateMonthlyCommission = (commissionsResponse: any): number => {
    if (!commissionsResponse.success || !commissionsResponse.data) return 0;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentCommission = commissionsResponse.data.find((c: Commission) => 
      c.month.startsWith(currentMonth)
    );
    
    return currentCommission?.amount || 0;
  };

  const calculatePerformanceRating = (stations: DealerStation[]): number => {
    if (stations.length === 0) return 0;

    const totalLossPercentage = stations.reduce((sum, station) => sum + station.loss_percentage, 0);
    const avgLossPercentage = totalLossPercentage / stations.length;
    
    // Convert loss percentage to performance rating (lower loss = higher rating)
    const baseRating = 5.0;
    const lossPenalty = avgLossPercentage * 0.1; // Each 1% loss reduces rating by 0.1
    const performanceRating = Math.max(baseRating - lossPenalty, 1.0); // Minimum 1.0 rating
    
    return Math.round(performanceRating * 10) / 10; // Round to 1 decimal place
  };

  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const handleRefresh = () => {
    loadDealerData();
  };

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

  const StationCardSkeleton = () => (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </Card>
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

  // Calculate real-time metrics from actual data
  const todaySales = stations.reduce((sum, station) => sum + (station.current_sales || 0), 0);
  const stockBalance = stations.reduce((sum, station) => sum + (station.stock_level || 0), 0);
  const avgLoss = stations.length > 0 ? 
    stations.reduce((sum, station) => sum + (station.loss_percentage || 0), 0) / stations.length : 0;
  const monthlyCommission = commissions.length > 0 ? 
    commissions.reduce((sum, commission) => sum + (commission.amount || 0), 0) / commissions.length : 0;

  // Generate performance data from actual sales
  const performanceData = stations.flatMap(station => 
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        sales: Math.round(station.current_sales * (0.8 + Math.random() * 0.4)), // Simulate daily variation
        loss_percentage: station.loss_percentage,
      };
    })
  ).slice(0, 7).reverse();

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

        <DealerHeader dealer={dealer} stations={stations} />
        <DealerStats
          todaySales={todaySales}
          stockBalance={stockBalance}
          lossPercentage={avgLoss}
          commissionEarned={monthlyCommission}
          stationsCount={stations.length}
        />

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl w-full grid grid-cols-4">
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
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StationPerformanceChart data={performanceData} />
              <StationActivityList reports={reports.slice(0, 5)} />
            </div>

            {/* Quick Insights */}
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Business Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                station.loss_percentage > 1 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }>
                                {station.loss_percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">Today's Sales</p>
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
            <DealerCommissionCard commissions={commissions} dealer={dealer} />
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