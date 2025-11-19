import React from 'react';
import { Card } from '../ui/card';
import { DollarSign, TrendingUp, Fuel, AlertTriangle } from 'lucide-react';

interface DealerStatsProps {
  todaySales: number;
  stockBalance: number;
  lossPercentage: number;
  commissionEarned: number;
}

export function DealerStats({ todaySales, stockBalance, lossPercentage, commissionEarned }: DealerStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Today's Sales</p>
            <p className="text-3xl text-black">₵{todaySales.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">+12.5% from yesterday</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Stock Balance</p>
            <p className="text-3xl text-black">{stockBalance.toLocaleString()}L</p>
            <p className="text-xs text-gray-500 mt-1">Across all stations</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Fuel className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Loss Percentage</p>
            <p className="text-3xl text-black">{lossPercentage.toFixed(2)}%</p>
            <p className="text-xs text-orange-600 mt-1">Within acceptable range</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            lossPercentage > 2 ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              lossPercentage > 2 ? 'text-red-600' : 'text-orange-600'
            }`} />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">Commission Earned</p>
            <p className="text-3xl text-black">₵{commissionEarned.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">This month</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}
