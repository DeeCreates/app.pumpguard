// src/pages/dashboard/LazyChartComponents.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { TrendingUp, TrendingDown, Users, Fuel, DollarSign, BarChart3, PieChart, LineChart } from 'lucide-react';

// Simple SVG-based chart components (no external dependencies)

// Bar Chart Component
export const SalesTrendChart: React.FC<{ data?: any; timeframe?: string }> = ({ 
  data = mockSalesData, 
  timeframe = 'weekly' 
}) => {
  const maxValue = Math.max(...data.map((item: any) => item.sales));
  const chartHeight = 200;
  const barWidth = 40;
  const spacing = 20;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sales Trends</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12.5%
          </Badge>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
        
        <div className="relative" style={{ height: chartHeight }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1="0"
                y1={chartHeight * (percent / 100)}
                x2="100%"
                y2={chartHeight * (percent / 100)}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            
            {/* Bars */}
            {data.map((item: any, index: number) => {
              const barHeight = (item.sales / maxValue) * (chartHeight - 40);
              const x = index * (barWidth + spacing) + spacing;
              const y = chartHeight - barHeight;
              
              return (
                <g key={item.day}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="#0B2265"
                    rx="4"
                    className="transition-all duration-300 hover:opacity-80"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 16}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {item.day}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-700"
                  >
                    ₵{item.sales}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span>Peak: ₵{maxValue}</span>
          <span>Avg: ₵{(data.reduce((sum: number, item: any) => sum + item.sales, 0) / data.length).toFixed(0)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Revenue Chart Component
export const RevenueChart: React.FC<{ data?: any }> = ({ data = mockRevenueData }) => {
  const totalRevenue = data.reduce((sum: number, item: any) => sum + item.amount, 0);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Revenue Analysis</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-4">₵{totalRevenue.toLocaleString()}</div>
        
        <div className="space-y-3">
          {data.map((item: any, index: number) => {
            const percentage = (item.amount / totalRevenue) * 100;
            const colors = ['#0B2265', '#DC2626', '#059669', '#7C3AED', '#EA580C'];
            
            return (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span>₵{item.amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{item.transactions} transactions</span>
                  <span>{percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Performance Chart Component
export const PerformanceChart: React.FC<{ data?: any }> = ({ data = mockPerformanceData }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <LineChart className="w-3 h-3 mr-1" />
            Efficiency: 87%
          </Badge>
        </div>
        
        <div className="space-y-4">
          {data.map((metric: any) => (
            <div key={metric.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border">
                  {metric.icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{metric.name}</div>
                  <div className="text-xs text-gray-500">{metric.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.value}
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {metric.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Volume Chart Component
export const VolumeChart: React.FC<{ data?: any }> = ({ data = mockVolumeData }) => {
  const totalVolume = data.reduce((sum: number, item: any) => sum + item.volume, 0);
  const maxVolume = Math.max(...data.map((item: any) => item.volume));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Volume Analysis</CardTitle>
        <Fuel className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">{totalVolume.toLocaleString()}L</div>
        <div className="text-sm text-gray-500 mb-4">Total fuel dispensed</div>
        
        <div className="space-y-3">
          {data.map((product: any) => {
            const percentage = (product.volume / maxVolume) * 100;
            
            return (
              <div key={product.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{product.name}</span>
                  <span>{product.volume}L</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: product.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {((product.volume / totalVolume) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>₵{product.revenue.toLocaleString()} revenue</span>
                  <span>{product.transactions} sales</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Pie Chart Component
export const MarketShareChart: React.FC<{ data?: any }> = ({ data = mockMarketShareData }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Market Share</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            {/* Simple pie chart using conic-gradient */}
            <div
              className="w-32 h-32 rounded-full"
              style={{
                background: `conic-gradient(
                  #0B2265 0% 40%,
                  #DC2626 40% 65%,
                  #059669 65% 85%,
                  #7C3AED 85% 100%
                )`
              }}
            />
            <div className="absolute inset-4 bg-white rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">Total</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {data.map((item: any, index: number) => {
            const colors = ['#0B2265', '#DC2626', '#059669', '#7C3AED'];
            return (
              <div key={item.company} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: colors[index] }}
                  />
                  <span>{item.company}</span>
                </div>
                <div className="font-medium">{item.percentage}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Mock data
const mockSalesData = [
  { day: 'Mon', sales: 4500 },
  { day: 'Tue', sales: 5200 },
  { day: 'Wed', sales: 4800 },
  { day: 'Thu', sales: 6100 },
  { day: 'Fri', sales: 7300 },
  { day: 'Sat', sales: 6800 },
  { day: 'Sun', sales: 5400 }
];

const mockRevenueData = [
  { category: 'Petrol', amount: 125000, transactions: 342 },
  { category: 'Diesel', amount: 89000, transactions: 198 },
  { category: 'Kerosene', amount: 32000, transactions: 87 },
  { category: 'LPG', amount: 45000, transactions: 123 }
];

const mockPerformanceData = [
  { 
    name: 'Efficiency Rate', 
    value: '87%', 
    change: '+5.2%', 
    trend: 'up',
    description: 'Pump utilization',
    icon: <TrendingUp className="w-4 h-4 text-green-600" />
  },
  { 
    name: 'Avg Transaction', 
    value: '₵245', 
    change: '+12.1%', 
    trend: 'up',
    description: 'Per customer',
    icon: <DollarSign className="w-4 h-4 text-blue-600" />
  },
  { 
    name: 'Customer Wait', 
    value: '3.2min', 
    change: '-0.8min', 
    trend: 'up',
    description: 'Average wait time',
    icon: <Users className="w-4 h-4 text-orange-600" />
  }
];

const mockVolumeData = [
  { name: 'Petrol Super', volume: 12500, revenue: 125000, transactions: 342, color: '#0B2265' },
  { name: 'Diesel', volume: 8900, revenue: 89000, transactions: 198, color: '#DC2626' },
  { name: 'Kerosene', volume: 3200, revenue: 32000, transactions: 87, color: '#059669' },
  { name: 'LPG', volume: 2800, revenue: 45000, transactions: 123, color: '#7C3AED' }
];

const mockMarketShareData = [
  { company: 'PumpGuard', percentage: 40 },
  { company: 'Competitor A', percentage: 25 },
  { company: 'Competitor B', percentage: 20 },
  { company: 'Others', percentage: 15 }
];

export default {
  SalesTrendChart,
  RevenueChart,
  PerformanceChart,
  VolumeChart,
  MarketShareChart
};