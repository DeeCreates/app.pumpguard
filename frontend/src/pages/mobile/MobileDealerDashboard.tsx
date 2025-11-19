// src/pages/mobile/MobileDealerDashboard.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePrices } from "../../contexts/PriceContext";
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
  ChevronRight,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { Dealer, DealerStation, Commission, StationReport } from "../../types/database";
import { api } from "../../lib/api";

// Simple mobile-optimized components
const MobileDealerHeader = ({ dealer, stations }: { dealer: Dealer; stations: DealerStation[] }) => (
  <div className="mb-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{dealer.name}</h1>
        <p className="text-sm text-gray-600">{stations.length} stations</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-600">Commission</p>
        <p className="text-lg font-bold text-green-600">{dealer.commission_rate}%</p>
      </div>
    </div>
  </div>
);

const MobileStatsGrid = ({ 
  todaySales, 
  stockBalance, 
  lossPercentage, 
  commissionEarned 
}: { 
  todaySales: number;
  stockBalance: number;
  lossPercentage: number;
  commissionEarned: number;
}) => {
  const stats = [
    {
      label: "Today's Sales",
      value: `₵${todaySales.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Stock",
      value: `${stockBalance.toLocaleString()}L`,
      icon: Fuel,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Loss %",
      value: `${lossPercentage.toFixed(1)}%`,
      icon: TrendingUp,
      color: lossPercentage > 1 ? "text-red-600" : "text-green-600",
      bgColor: lossPercentage > 1 ? "bg-red-50" : "bg-green-50"
    },
    {
      label: "Commission",
      value: `₵${commissionEarned.toLocaleString()}`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className={`p-3 rounded-xl ${stat.bgColor} border-0`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white">
                <IconComponent className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MobileStationCard = ({ station, onPress }: { station: DealerStation; onPress?: () => void }) => {
  const statusColor = station.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  
  return (
    <Card className="mb-3 border-0 shadow-sm" onClick={onPress}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{station.station_name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{station.location}</span>
              </div>
            </div>
          </div>
          <Badge className={`text-xs ${statusColor}`}>
            {station.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-3">
          <div>
            <p className="text-gray-600">Sales Today</p>
            <p className="font-semibold text-gray-900">₵{station.current_sales?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Stock</p>
            <div className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-blue-600" />
              <p className="font-semibold text-gray-900">{station.stock_level?.toLocaleString()}L</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className={`px-2 py-1 rounded ${
            station.loss_percentage > 1 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            Loss: {station.loss_percentage.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <span>{station.manager_name}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileCommissionItem = ({ commission }: { commission: Commission }) => (
  <div className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0">
    <div>
      <p className="font-semibold text-sm text-gray-900">
        {new Date(commission.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </p>
      <p className="text-xs text-gray-600">Sales: ₵{commission.total_sales?.toLocaleString()}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-sm text-gray-900">₵{commission.amount.toLocaleString()}</p>
      <Badge className={`text-xs ${
        commission.status === 'paid' ? 'bg-green-100 text-green-700' :
        commission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {commission.status}
      </Badge>
    </div>
  </div>
);

const MobileReportItem = ({ report }: { report: StationReport }) => (
  <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
    <div className={`w-2 h-2 rounded-full mt-2 ${
      report.status === 'normal' ? 'bg-green-500' :
      report.status === 'warning' ? 'bg-yellow-500' :
      'bg-red-500'
    }`} />
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <p className="font-semibold text-sm text-gray-900">{report.station_name}</p>
        <span className="text-xs text-gray-500">
          {new Date(report.timestamp).toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-gray-600 mt-1">{report.notes || 'No notes provided'}</p>
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        <span>₵{report.sales.toLocaleString()}</span>
        <span>{report.fuel_stock.toLocaleString()}L</span>
        <span>{report.loss_percentage}% loss</span>
      </div>
    </div>
  </div>
);

export function MobileDealerDashboard() {
  const { user } = useAuth();
  const { refreshPrices, loading: pricesLoading } = usePrices();
  
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [stations, setStations] = useState<DealerStation[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reports, setReports] = useState<StationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<'overview' | 'stations' | 'commissions' | 'reports'>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDealerData();
  }, [user]);

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
    const lossPenalty = avgLossPercentage * 0.1;
    const performanceRating = Math.max(baseRating - lossPenalty, 1.0);
    
    return Math.round(performanceRating * 10) / 10;
  };

  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const handleRefresh = () => {
    loadDealerData();
  };

  const handleStationPress = (station: DealerStation) => {
    // Navigate to station details - you can implement navigation here
    console.log('Station pressed:', station.station_name);
  };

  // Loading skeleton components
  const MobileStatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-gray-100">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="w-6 h-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const MobileStationSkeleton = () => (
    <Card className="mb-3 border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <MobileStatsSkeleton />

        {/* Navigation Skeleton */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['Overview', 'Stations', 'Commissions', 'Reports'].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-lg" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileStationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="p-6 bg-red-50 border-red-200 w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">Data Loading Error</h2>
          </div>
          <p className="text-red-700 mb-4 text-sm">{error}</p>
          <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading Data
          </Button>
        </Card>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="p-6 bg-yellow-50 border-yellow-200 w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h2 className="text-lg font-semibold text-yellow-800">Dealer Profile Not Found</h2>
          </div>
          <p className="text-yellow-700 mb-4 text-sm">
            Your dealer profile could not be loaded. Please contact support.
          </p>
          <Button onClick={handleRefresh} className="bg-yellow-600 hover:bg-yellow-700 w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
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

  const renderOverview = () => (
    <div className="space-y-4">
      <MobileStatsGrid
        todaySales={todaySales}
        stockBalance={stockBalance}
        lossPercentage={avgLoss}
        commissionEarned={monthlyCommission}
      />

      {/* Quick Insights */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Rating</p>
              <p className="text-sm font-bold text-gray-900">{dealer.performance_rating}/5.0</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Managers</p>
              <p className="text-sm font-bold text-gray-900">{stations.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.slice(0, 3).length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-0">
              {reports.slice(0, 3).map((report) => (
                <MobileReportItem key={report.id} report={report} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStations = () => (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Managing {stations.length} station{stations.length !== 1 ? 's' : ''}
        </p>
      </div>
      {stations.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No stations assigned</p>
          <p className="text-gray-400 text-xs mt-1">Contact support to get stations assigned</p>
        </div>
      ) : (
        <div>
          {stations.map((station) => (
            <MobileStationCard
              key={station.id}
              station={station}
              onPress={() => handleStationPress(station)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderCommissions = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Commission History</CardTitle>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No commission records</p>
        ) : (
          <div>
            {commissions.map((commission) => (
              <MobileCommissionItem key={commission.id} commission={commission} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderReports = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">All Activity Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No activity reports</p>
        ) : (
          <div>
            {reports.map((report) => (
              <MobileReportItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dealer Dashboard</h1>
            <p className="text-xs text-gray-600">Business Management</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-8 h-8 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Sync Status */}
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-700">
              Synced: {lastSync.toLocaleTimeString()}
            </span>
          </div>
          <Badge variant="outline" className="bg-white text-xs">Live</Badge>
        </div>

        <MobileDealerHeader dealer={dealer} stations={stations} />

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { key: 'stations' as const, label: 'Stations', icon: Building2 },
            { key: 'commissions' as const, label: 'Commissions', icon: DollarSign },
            { key: 'reports' as const, label: 'Reports', icon: TrendingUp },
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.key;
            
            return (
              <Button
                key={item.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-1 whitespace-nowrap ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'stations' && renderStations()}
        {activeSection === 'commissions' && renderCommissions()}
        {activeSection === 'reports' && renderReports()}
      </div>

      {/* Floating Action Button for Support */}
      <div className="fixed bottom-20 right-4">
        <Button
          size="lg"
          className="rounded-full w-12 h-12 shadow-2xl"
          style={{ backgroundColor: '#0B2265' }}
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export default MobileDealerDashboard;