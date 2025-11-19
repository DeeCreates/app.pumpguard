import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { StationReport } from '../../types';
import { Building2, User, Calendar, TrendingDown, DollarSign } from 'lucide-react';

interface StationActivityListProps {
  reports: StationReport[];
}

export function StationActivityList({ reports }: StationActivityListProps) {
  const getLossColor = (percentage: number) => {
    if (percentage < 1) return 'text-green-600';
    if (percentage < 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLossBadgeColor = (percentage: number) => {
    if (percentage < 1) return 'bg-green-100 text-green-700';
    if (percentage < 2) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl text-black mb-1">Recent Activity</h3>
          <p className="text-sm text-gray-600">Latest reports from your stations</p>
        </div>
        <Badge variant="outline">Last 10 Reports</Badge>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Section - Station Info */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg text-black">Station #{report.station_id.slice(-4)}</h4>
                    <Badge className={getLossBadgeColor(report.loss_percentage)}>
                      {report.loss_percentage.toFixed(2)}% loss
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{report.supervisor_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Sales</p>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-lg text-black">₵{report.sales.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Stock</p>
                  <p className="text-lg text-black">{report.fuel_stock.toLocaleString()}L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Loss</p>
                  <div className="flex items-center gap-1">
                    <TrendingDown className={`w-4 h-4 ${getLossColor(report.loss_percentage)}`} />
                    <p className={`text-lg ${getLossColor(report.loss_percentage)}`}>
                      {report.loss_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {report.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Notes:</p>
                <p className="text-sm text-gray-700">{report.notes}</p>
              </div>
            )}
          </div>
        ))}

        {reports.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No activity reports yet</p>
            <p className="text-sm text-gray-400 mt-2">Reports will appear here once supervisors submit them</p>
          </div>
        )}
      </div>
    </Card>
  );
}
