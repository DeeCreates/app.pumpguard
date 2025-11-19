import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Commission } from '../../types';
import { DollarSign, Calendar, TrendingUp, Download } from 'lucide-react';

interface DealerCommissionCardProps {
  commissions: Commission[];
}

export function DealerCommissionCard({ commissions }: DealerCommissionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  };

  const totalEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPending = commissions
    .filter(c => c.status === 'pending' || c.status === 'processing')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl text-black mb-1">Commission Summary</h3>
          <p className="text-sm text-gray-600">Monthly earnings breakdown</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-700">Total Earned (Paid)</p>
          </div>
          <p className="text-3xl text-black">₵{totalEarned.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-700">Pending/Processing</p>
          </div>
          <p className="text-3xl text-black">₵{totalPending.toLocaleString()}</p>
        </div>
      </div>

      {/* Commission Table */}
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
          <div>Month</div>
          <div>Total Sales</div>
          <div>Rate</div>
          <div>Amount</div>
          <div>Status</div>
        </div>

        {commissions.map((commission) => (
          <div
            key={commission.id}
            className="grid grid-cols-5 gap-4 px-4 py-3 bg-gray-50 rounded-xl hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-black">
                {new Date(commission.month).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="text-gray-700">
              ₵{commission.total_sales.toLocaleString()}
            </div>
            <div className="text-gray-700">
              {commission.commission_rate}%
            </div>
            <div className="text-black">
              ₵{commission.amount.toLocaleString()}
            </div>
            <div>
              <Badge className={getStatusColor(commission.status)}>
                {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
              </Badge>
            </div>
          </div>
        ))}

        {commissions.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No commission records yet</p>
          </div>
        )}
      </div>
    </Card>
  );
}
