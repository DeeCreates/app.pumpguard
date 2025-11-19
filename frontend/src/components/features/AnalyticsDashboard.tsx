import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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
  { name: 'Petrol', value: 386000, color: '#0B2265' },
  { name: 'Diesel', value: 272000, color: '#F97316' },
  { name: 'LPG', value: 45000, color: '#10B981' },
];

const stationComparison = [
  { station: 'Accra Main', revenue: 245000, transactions: 1240 },
  { station: 'Kumasi Central', revenue: 198000, transactions: 980 },
  { station: 'Takoradi West', revenue: 167000, transactions: 850 },
  { station: 'Tema Harbor', revenue: 134000, transactions: 720 },
];

const hourlyData = [
  { hour: '06:00', sales: 12000 },
  { hour: '08:00', sales: 25000 },
  { hour: '10:00', sales: 35000 },
  { hour: '12:00', sales: 42000 },
  { hour: '14:00', sales: 38000 },
  { hour: '16:00', sales: 45000 },
  { hour: '18:00', sales: 52000 },
  { hour: '20:00', sales: 28000 },
];

interface AnalyticsDashboardProps {
  role?: 'admin' | 'omc' | 'dealer' | 'manager';
}

export function AnalyticsDashboard({ role = 'admin' }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedStation, setSelectedStation] = useState('all');

  const totalRevenue = 658000;
  const revenueChange = 12.5;
  const totalTransactions = 3790;
  const transactionsChange = 8.3;
  const avgTransaction = totalRevenue / totalTransactions;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[180px]">
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

        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">GHS {totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+{revenueChange}%</span>
              <span className="text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl">{totalTransactions.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+{transactionsChange}%</span>
              <span className="text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Transaction</CardDescription>
            <CardTitle className="text-3xl">GHS {avgTransaction.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-green-500 font-medium">+3.2%</span>
              <span className="text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Sales Trends</TabsTrigger>
          <TabsTrigger value="products">Product Mix</TabsTrigger>
          <TabsTrigger value="stations">Station Performance</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Analysis</TabsTrigger>
        </TabsList>

        {/* Sales Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
              <CardDescription>Daily revenue breakdown by product</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="petrol"
                    stroke="#0B2265"
                    strokeWidth={2}
                    name="Petrol"
                  />
                  <Line
                    type="monotone"
                    dataKey="diesel"
                    stroke="#F97316"
                    strokeWidth={2}
                    name="Diesel"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Distribution */}
        <TabsContent value="products">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Distribution</CardTitle>
                <CardDescription>Revenue by product type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {productDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Revenue breakdown</CardDescription>
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
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <span className="font-bold">GHS {product.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Station Comparison */}
        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <CardTitle>Station Performance Comparison</CardTitle>
              <CardDescription>Revenue and transaction volume by station</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stationComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="station" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0B2265" />
                  <YAxis yAxisId="right" orientation="right" stroke="#F97316" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#0B2265" name="Revenue (GHS)" />
                  <Bar
                    yAxisId="right"
                    dataKey="transactions"
                    fill="#F97316"
                    name="Transactions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Analysis */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Sales Pattern</CardTitle>
              <CardDescription>Average sales by hour of day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#0B2265" name="Sales (GHS)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
