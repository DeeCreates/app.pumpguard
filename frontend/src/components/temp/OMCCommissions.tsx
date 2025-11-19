import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DollarSign, TrendingUp, Building2, Calendar, Download, CheckCircle } from 'lucide-react';

interface StationCommission {
  station_id: string;
  station_name: string;
  total_sales: number;
  commission_rate: number;
  commission_amount: number;
  period: string;
  status: 'pending' | 'paid';
}

interface BankDeposit {
  id: string;
  station_id: string;
  station_name: string;
  date: string;
  amount: number;
  bank_name: string;
  reference_number: string;
  status: 'pending' | 'confirmed' | 'reconciled';
}

interface OMCCommissionsProps {
  omcId: string;
  omcName?: string;
}

export function OMCCommissions({ omcId, omcName }: OMCCommissionsProps) {
  const [commissions, setCommissions] = useState<StationCommission[]>([
    {
      station_id: 'station_1',
      station_name: 'Accra Central Station',
      total_sales: 450000,
      commission_rate: 2.5,
      commission_amount: 11250,
      period: '2025-10',
      status: 'paid',
    },
    {
      station_id: 'station_2',
      station_name: 'Tema Industrial Station',
      total_sales: 380000,
      commission_rate: 2.5,
      commission_amount: 9500,
      period: '2025-10',
      status: 'pending',
    },
    {
      station_id: 'station_3',
      station_name: 'Kumasi Main Station',
      total_sales: 520000,
      commission_rate: 2.5,
      commission_amount: 13000,
      period: '2025-10',
      status: 'paid',
    },
  ]);

  const [deposits, setDeposits] = useState<BankDeposit[]>([]);

  useEffect(() => {
    loadAllStationDeposits();
  }, [omcId]);

  const loadAllStationDeposits = () => {
    // Load deposits from all stations belonging to this OMC
    const allDeposits: BankDeposit[] = [];
    
    // Simulate loading from multiple stations
    ['station_1', 'station_2', 'station_3'].forEach((stationId) => {
      const stationDeposits = localStorage.getItem(`deposits_${stationId}`);
      if (stationDeposits) {
        const parsedDeposits = JSON.parse(stationDeposits);
        parsedDeposits.forEach((dep: any) => {
          allDeposits.push({
            ...dep,
            station_id: stationId,
            station_name: getStationName(stationId),
          });
        });
      }
    });

    // Sort by date descending
    allDeposits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDeposits(allDeposits);
  };

  const getStationName = (stationId: string) => {
    const names: Record<string, string> = {
      station_1: 'Accra Central Station',
      station_2: 'Tema Industrial Station',
      station_3: 'Kumasi Main Station',
    };
    return names[stationId] || stationId;
  };

  const totalCommissions = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const paidCommissions = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0);
  const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
  const confirmedDeposits = deposits.filter(d => d.status === 'confirmed' || d.status === 'reconciled');
  const totalConfirmed = confirmedDeposits.reduce((sum, d) => sum + d.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
      case 'reconciled':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl text-black mb-1">Financial Overview</h3>
        <p className="text-gray-600">{omcName || 'OMC'} - Commissions & Bank Deposits</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Commissions</p>
              <p className="text-3xl text-black">₵{totalCommissions.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Paid Out</p>
              <p className="text-3xl text-black">₵{paidCommissions.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Deposits</p>
              <p className="text-3xl text-black">₵{totalDeposits.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Confirmed Deposits</p>
              <p className="text-3xl text-black">₵{totalConfirmed.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="commissions" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl">
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="deposits">Bank Deposits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions">
          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg text-black">Station Commissions</h4>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
            <div className="space-y-3">
              {commissions.map((commission) => (
                <div
                  key={commission.station_id}
                  className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h5 className="text-lg text-black">{commission.station_name}</h5>
                        <p className="text-sm text-gray-600">
                          Period: {new Date(commission.period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(commission.status)}>
                      {commission.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Total Sales</p>
                      <p className="text-black">₵{commission.total_sales.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Commission Rate</p>
                      <p className="text-black">{commission.commission_rate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Commission Amount</p>
                      <p className="text-black">₵{commission.commission_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      <p className={commission.status === 'paid' ? 'text-green-600' : 'text-orange-600'}>
                        {commission.status === 'paid' ? '✓ Paid' : '○ Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="deposits">
          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg text-black">All Station Bank Deposits</h4>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
            <div className="space-y-3">
              {deposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        deposit.status === 'reconciled' ? 'bg-blue-100' :
                        deposit.status === 'confirmed' ? 'bg-green-100' :
                        'bg-orange-100'
                      }`}>
                        <Building2 className={`w-6 h-6 ${
                          deposit.status === 'reconciled' ? 'text-blue-600' :
                          deposit.status === 'confirmed' ? 'text-green-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                      <div>
                        <h5 className="text-lg text-black">₵{deposit.amount.toLocaleString()}</h5>
                        <p className="text-sm text-gray-600">{deposit.station_name}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(deposit.status)}>
                      {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Bank</p>
                      <p className="text-black">{deposit.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Reference</p>
                      <p className="text-black">{deposit.reference_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Date</p>
                      <p className="text-black flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(deposit.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      <p className={
                        deposit.status === 'reconciled' ? 'text-blue-600' :
                        deposit.status === 'confirmed' ? 'text-green-600' :
                        'text-orange-600'
                      }>
                        {deposit.status === 'reconciled' ? '✓ Reconciled' :
                         deposit.status === 'confirmed' ? '✓ Confirmed' :
                         '○ Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {deposits.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No bank deposits recorded yet</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <h4 className="text-lg text-black mb-6">Financial Analytics</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commission Breakdown */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                <h5 className="text-black mb-4">Commission Breakdown</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Total Revenue</span>
                    <span className="text-black">₵{commissions.reduce((s, c) => s + c.total_sales, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Commission Earned</span>
                    <span className="text-black">₵{totalCommissions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                    <span className="text-gray-700">Average Rate</span>
                    <span className="text-black">2.5%</span>
                  </div>
                </div>
              </div>

              {/* Deposit Status */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <h5 className="text-black mb-4">Deposit Status</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Pending Verification</span>
                    <span className="text-orange-600">
                      {deposits.filter(d => d.status === 'pending').length} deposits
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Confirmed</span>
                    <span className="text-green-600">
                      {deposits.filter(d => d.status === 'confirmed').length} deposits
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-green-200">
                    <span className="text-gray-700">Reconciled</span>
                    <span className="text-blue-600">
                      {deposits.filter(d => d.status === 'reconciled').length} deposits
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performing Stations */}
            <div className="mt-6">
              <h5 className="text-black mb-4">Top Performing Stations</h5>
              <div className="space-y-2">
                {commissions
                  .sort((a, b) => b.total_sales - a.total_sales)
                  .map((station, index) => (
                    <div key={station.station_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-blue-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-black">{station.station_name}</p>
                        <p className="text-sm text-gray-600">₵{station.total_sales.toLocaleString()} sales</p>
                      </div>
                      <div className="text-right">
                        <p className="text-black">₵{station.commission_amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">commission</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
