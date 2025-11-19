import React, { useState, lazy, Suspense } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Download, Calendar, Fuel, Users, Activity, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// Lazy loaded chart components for better performance
const LazyLineChart = lazy(() => import('./LazyChartComponents').then(module => ({
  default: module.SalesTrendChart
})));

const LazyPieChart = lazy(() => import('./LazyChartComponents').then(module => ({
  default: module.ProductDistributionChart
})));

const LazyBarChart = lazy(() => import('./LazyChartComponents').then(module => ({
  default: module.StationComparisonChart
})));

// Sample data
const salesTrendData = [
  { date: 'Oct 14', petrol: 45000, diesel: 32000, total: 77000 },
  { date: 'Oct 15', petrol: 52000, diesel: 38000, total: 90000 },
  { date: 'Oct 16', petrol: 48000, diesel: 35000, total: 83000 },
  { date: 'Oct 17', petrol: 61000, diesel: 41000, total: 102000 },
  { date: 'Oct 18', petrol: 55000, diesel: 39000, total: 94000 },
  { date: 'Oct 19', petrol: 67000, diesel: 45000, total: 112000 },
  { date: 'Oct 20', petrol: 58000, diesel: 42000, total: 100000 },
];

const productDistribution = [
  { name: 'Petrol', value: 386000, color: '#0B2265', volume: 25800 },
  { name: 'Diesel', value: 272000, color: '#F97316', volume: 16800 },
  { name: 'LPG', value: 45000, color: '#10B981', volume: 3500 },
];

const stationComparison = [
  { station: 'Accra Main', revenue: 245000, transactions: 1240, volume: 15600 },
  { station: 'Kumasi Central', revenue: 198000, transactions: 980, volume: 13200 },
  { station: 'Takoradi West', revenue: 167000, transactions: 850, volume: 11200 },
  { station: 'Tema Harbor', revenue: 134000, transactions: 720, volume: 8900 },
];

const hourlyData = [
  { hour: '06:00', sales: 12000, transactions: 45 },
  { hour: '08:00', sales: 25000, transactions: 92 },
  { hour: '10:00', sales: 35000, transactions: 128 },
  { hour: '12:00', sales: 42000, transactions: 156 },
  { hour: '14:00', sales: 38000, transactions: 142 },
  { hour: '16:00', sales: 45000, transactions: 168 },
  { hour: '18:00', sales: 52000, transactions: 195 },
  { hour: '20:00', sales: 28000, transactions: 104 },
];

interface AnalyticsDashboardProps {
  role?: 'admin' | 'omc' | 'dealer' | 'manager' | 'attendant';
  stationId?: string;
  compact?: boolean;
}

export function AnalyticsDashboard({ role = 'admin', stationId, compact = false }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedStation, setSelectedStation] = useState('all');
  const [activeTab, setActiveTab] = useState('trends');

  // Role-based data filtering
  const getFilteredData = () => {
    let filteredStations = stationComparison;
    
    if (role === 'dealer') {
      // Show only dealer's stations
      filteredStations = stationComparison.slice(0, 2); // Mock dealer stations
    } else if (role === 'manager' || role === 'attendant') {
      // Show only current station
      filteredStations = stationComparison.slice(0, 1); // Mock current station
    }
    
    return filteredStations;
  };

  const filteredStations = getFilteredData();

  // Calculations
  const totalRevenue = 658000;
  const revenueChange = 12.5;
  const totalTransactions = 3790;
  const transactionsChange = 8.3;
  const totalVolume = 46100; // Total liters
  const volumeChange = 6.8;
  const avgTransaction = totalRevenue / totalTransactions;
  const avgTransactionChange = 3.2;

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-white rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ChartSkeleton = () => (
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg text-black">Performance Analytics</h4>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-gray-600">Today's Revenue</p>
            <p className="text-lg text-black font-semibold">₵{salesTrendData[salesTrendData.length - 1].total.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-gray-600">Transactions</p>
            <p className="text-lg text-black font-semibold">{totalTransactions}</p>
          </div>
        </div>

        <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-black mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {role === 'admin' && 'System-wide Performance Intelligence'}
            {role === 'omc' && 'Network Performance & Business Intelligence'}
            {role === 'dealer' && 'Portfolio Performance Analytics'}
            {role === 'manager' && 'Station Performance Overview'}
            {role === 'attendant' && 'Shift Performance Metrics'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-white">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {(role === 'admin' || role === 'omc') && (
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                <SelectItem value="accra">Accra Main</SelectItem>
                <SelectItem value="kumasi">Kumasi Central</SelectItem>
                <SelectItem value="takoradi">Takoradi West</SelectItem>
                <SelectItem value="tema">Tema Harbor</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Total Revenue
              </CardDescription>
              <CardTitle className="text-3xl">₵{totalRevenue.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">+{revenueChange}%</span>
                <span className="text-gray-500 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Total Transactions
              </CardDescription>
              <CardTitle className="text-3xl">{totalTransactions.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">+{transactionsChange}%</span>
                <span className="text-gray-500 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-orange-600" />
                Fuel Volume
              </CardDescription>
              <CardTitle className="text-3xl">{totalVolume.toLocaleString()}L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">+{volumeChange}%</span>
                <span className="text-gray-500 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                Avg Transaction
              </CardDescription>
              <CardTitle className="text-3xl">₵{avgTransaction.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">+{avgTransactionChange}%</span>
                <span className="text-gray-500 ml-2">vs last period</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Suspense>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white p-1 rounded-xl">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales Trends
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            Product Mix
          </TabsTrigger>
          {(role === 'admin' || role === 'omc') && (
            <TabsTrigger value="stations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Station Performance
            </TabsTrigger>
          )}
          <TabsTrigger value="hourly" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Hourly Analysis
          </TabsTrigger>
        </TabsList>

        {/* Sales Trends */}
        <TabsContent value="trends">
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader>
              <CardTitle>Sales Trend Analysis</CardTitle>
              <CardDescription>
                {timeRange === 'today' ? "Today's" : 
                 timeRange === '7days' ? "Last 7 Days" :
                 timeRange === '30days' ? "Last 30 Days" :
                 "Historical"} revenue breakdown by product type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <LazyLineChart data={salesTrendData} timeRange={timeRange} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Distribution */}
        <TabsContent value="products">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Product Distribution</CardTitle>
                <CardDescription>Revenue and volume by product type</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartSkeleton />}>
                  <LazyPieChart data={productDistribution} />
                </Suspense>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Product Performance Metrics</CardTitle>
                <CardDescription>Detailed breakdown by product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productDistribution.map((product) => (
                  <div key={product.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: product.color }}
                        />
                        <span className="font-medium text-black">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-black">₵{product.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{product.volume.toLocaleString()}L</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          backgroundColor: product.color,
                          width: `${(product.value / 703000) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Performance Summary */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-gray-600">Best Performer</p>
                      <p className="text-black font-semibold">Petrol</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <p className="text-gray-600">Growth Rate</p>
                      <p className="text-black font-semibold">+15.2%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Station Comparison */}
        {(role === 'admin' || role === 'omc') && (
          <TabsContent value="stations">
            <Card className="bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Station Performance Comparison</CardTitle>
                <CardDescription>Revenue, transactions, and volume across stations</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartSkeleton />}>
                  <LazyBarChart data={filteredStations} />
                </Suspense>
                
                {/* Performance Ranking */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
                    <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Top Station</p>
                    <p className="text-lg text-black font-semibold">Accra Main</p>
                    <p className="text-sm text-green-600">+18% above target</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Fastest Growth</p>
                    <p className="text-lg text-black font-semibold">Kumasi Central</p>
                    <p className="text-sm text-green-600">+22% growth</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100">
                    <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Efficiency</p>
                    <p className="text-lg text-black font-semibold">Takoradi West</p>
                    <p className="text-sm text-green-600">95% utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Hourly Analysis */}
        <TabsContent value="hourly">
          <Card className="bg-white rounded-2xl shadow-sm border-0">
            <CardHeader>
              <CardTitle>Hourly Sales Pattern</CardTitle>
              <CardDescription>Peak hours and transaction patterns throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  Hourly Analysis Chart - Peak hours visualization
                </div>
              </Suspense>
              
              {/* Peak Hours Insights */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-lg text-black font-semibold">Peak Hours</h4>
                  <div className="space-y-2">
                    {hourlyData.slice().sort((a, b) => b.sales - a.sales).slice(0, 3).map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-red-500' : 
                            index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-black">{hour.hour}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-black font-semibold">₵{hour.sales.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">{hour.transactions} transactions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-lg text-black font-semibold">Performance Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-gray-600">Busiest Hour:</span>
                      <span className="text-black font-semibold">18:00</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-gray-600">Avg Transaction:</span>
                      <span className="text-black font-semibold">₵267</span>
                    </div>
                    <div className="flex justify-between p-2 bg-orange-50 rounded-lg">
                      <span className="text-gray-600">Peak Efficiency:</span>
                      <span className="text-black font-semibold">16:00-19:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;

