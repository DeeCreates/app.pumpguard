import React from 'react';
import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceData {
  date: string;
  sales: number;
  loss_percentage: number;
}

interface StationPerformanceChartProps {
  data: PerformanceData[];
}

export function StationPerformanceChart({ data }: StationPerformanceChartProps) {
  return (
    <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
      <div className="mb-6">
        <h3 className="text-xl text-black mb-1">7-Day Performance Trend</h3>
        <p className="text-sm text-gray-600">Sales and loss percentage over the last week</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#6B7280' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: '#6B7280' }}
            label={{ value: 'Sales (₵)', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#6B7280' }}
            label={{ value: 'Loss %', angle: 90, position: 'insideRight', fill: '#6B7280' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '12px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'sales') return [`₵${value.toLocaleString()}`, 'Sales'];
              if (name === 'loss_percentage') return [`${value.toFixed(2)}%`, 'Loss'];
              return [value, name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              if (value === 'sales') return 'Daily Sales';
              if (value === 'loss_percentage') return 'Loss Percentage';
              return value;
            }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="sales" 
            stroke="#0B2265" 
            strokeWidth={3}
            dot={{ fill: '#0B2265', r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="loss_percentage" 
            stroke="#EF4444" 
            strokeWidth={3}
            dot={{ fill: '#EF4444', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Chart Legend Explanation */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#0B2265' }}></div>
            <div>
              <p className="text-sm text-black">Daily Sales</p>
              <p className="text-xs text-gray-600">Total revenue per day</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <div>
              <p className="text-sm text-black">Loss Percentage</p>
              <p className="text-xs text-gray-600">Fuel variance and losses</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
