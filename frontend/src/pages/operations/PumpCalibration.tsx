import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Gauge, CheckCircle, AlertTriangle, XCircle, Plus, Calendar, Download, RefreshCw, Settings, TrendingUp } from 'lucide-react';

interface CalibrationRecord {
  id: string;
  pump_id: string;
  pump_name: string;
  test_date: string;
  test_volume: number;
  actual_volume: number;
  variance_percentage: number;
  status: 'passed' | 'warning' | 'failed';
  technician: string;
  next_due_date: string;
  notes?: string;
  station_id: string;
}

interface PumpCalibrationProps {
  stationId: string;
  compact?: boolean;
}

// Lazy loaded components
const LazyExportButton = lazy(() => import('./LazyExportButton'));

export function PumpCalibration({ stationId, compact = false }: PumpCalibrationProps) {
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    pump_name: 'Pump 1 - Premium',
    test_volume: 20.0,
    actual_volume: 0,
    technician: '',
    notes: '',
  });

  useEffect(() => {
    loadCalibrationRecords();
  }, [stationId]);

  const loadCalibrationRecords = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data for demonstration
    const mockRecords: CalibrationRecord[] = [
      {
        id: 'cal_1',
        pump_id: 'pump_1',
        pump_name: 'Pump 1 - Premium',
        test_date: '2025-10-15T10:30:00',
        test_volume: 20.0,
        actual_volume: 20.05,
        variance_percentage: 0.25,
        status: 'passed',
        technician: 'Michael Asante',
        next_due_date: '2026-01-15',
        notes: 'All measurements within tolerance. Pump operating optimally.',
        station_id: stationId
      },
      {
        id: 'cal_2',
        pump_id: 'pump_2',
        pump_name: 'Pump 2 - Diesel',
        test_date: '2025-10-15T11:00:00',
        test_volume: 20.0,
        actual_volume: 19.65,
        variance_percentage: -1.75,
        status: 'warning',
        technician: 'Michael Asante',
        next_due_date: '2025-11-15',
        notes: 'Minor adjustment needed. Monitor closely.',
        station_id: stationId
      },
      {
        id: 'cal_3',
        pump_id: 'pump_3',
        pump_name: 'Pump 3 - Premium',
        test_date: '2025-10-10T14:20:00',
        test_volume: 20.0,
        actual_volume: 20.02,
        variance_percentage: 0.10,
        status: 'passed',
        technician: 'Sarah Osei',
        next_due_date: '2026-01-10',
        station_id: stationId
      },
      {
        id: 'cal_4',
        pump_id: 'pump_4',
        pump_name: 'Pump 4 - LPG',
        test_date: '2025-10-08T09:15:00',
        test_volume: 20.0,
        actual_volume: 19.45,
        variance_percentage: -2.75,
        status: 'failed',
        technician: 'Sarah Osei',
        next_due_date: '2025-10-22',
        notes: 'Failed calibration. Pump taken offline for immediate service.',
        station_id: stationId
      }
    ];

    setRecords(mockRecords);
    setLoading(false);
  };

  const handleSubmit = () => {
    if (!form.actual_volume || !form.technician) {
      alert('Please fill in all required fields');
      return;
    }

    const variancePercentage = ((form.actual_volume - form.test_volume) / form.test_volume) * 100;
    
    let status: 'passed' | 'warning' | 'failed';
    if (Math.abs(variancePercentage) <= 0.5) {
      status = 'passed';
    } else if (Math.abs(variancePercentage) <= 2.0) {
      status = 'warning';
    } else {
      status = 'failed';
    }

    const newRecord: CalibrationRecord = {
      id: `cal_${Date.now()}`,
      pump_id: `pump_${Date.now()}`,
      pump_name: form.pump_name,
      test_date: new Date().toISOString(),
      test_volume: form.test_volume,
      actual_volume: form.actual_volume,
      variance_percentage: variancePercentage,
      status,
      technician: form.technician,
      next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
      notes: form.notes,
      station_id: stationId
    };

    setRecords([newRecord, ...records]);
    setShowDialog(false);
    setForm({
      pump_name: 'Pump 1 - Premium',
      test_volume: 20.0,
      actual_volume: 0,
      technician: '',
      notes: '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'warning':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );

  const RecordSkeleton = () => (
    <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );

  // Calculations
  const passedCount = records.filter(r => r.status === 'passed').length;
  const warningCount = records.filter(r => r.status === 'warning').length;
  const failedCount = records.filter(r => r.status === 'failed').length;
  const totalPumps = records.length;
  const complianceRate = totalPumps > 0 ? (passedCount / totalPumps) * 100 : 0;
  const upcomingCalibrations = records.filter(r => getDaysUntilDue(r.next_due_date) <= 30).length;

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg text-black">Pump Calibration</h4>
          <Button 
            size="sm" 
            style={{ backgroundColor: '#0B2265' }}
            onClick={() => setShowDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Test
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-gray-600">Compliant</p>
            <p className="text-lg text-black font-semibold">{passedCount}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-gray-600">Due Soon</p>
            <p className="text-lg text-black font-semibold">{upcomingCalibrations}</p>
          </div>
        </div>

        {/* Calibration Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Calibration Test</DialogTitle>
              <DialogDescription>Enter calibration test details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pump Selection</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                  value={form.pump_name}
                  onChange={(e) => setForm({ ...form, pump_name: e.target.value })}
                >
                  <option>Pump 1 - Premium</option>
                  <option>Pump 2 - Diesel</option>
                  <option>Pump 3 - Premium</option>
                  <option>Pump 4 - LPG</option>
                </select>
              </div>

              <div>
                <Label>Actual Volume (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.actual_volume}
                  onChange={(e) => setForm({ ...form, actual_volume: parseFloat(e.target.value) })}
                  placeholder="20.00"
                  required
                />
              </div>

              <div>
                <Label>Technician Name</Label>
                <Input
                  value={form.technician}
                  onChange={(e) => setForm({ ...form, technician: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                style={{ backgroundColor: '#0B2265' }}
              >
                Save Calibration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl text-black mb-1">Pump Calibration</h3>
          <p className="text-gray-600">NPA Compliance & Equipment Accuracy Verification</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadCalibrationRecords}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Suspense fallback={<Button variant="outline" disabled>Exporting...</Button>}>
            <LazyExportButton 
              data={records} 
              filename={`pump-calibration-${stationId}-${new Date().toISOString().split('T')[0]}`}
            />
          </Suspense>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: '#0B2265' }} className="gap-2">
                <Plus className="w-4 h-4" />
                New Calibration Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Calibration Test</DialogTitle>
                <DialogDescription>
                  Perform NPA compliance testing and accuracy verification
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Pump Selection</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    value={form.pump_name}
                    onChange={(e) => setForm({ ...form, pump_name: e.target.value })}
                  >
                    <option>Pump 1 - Premium</option>
                    <option>Pump 2 - Diesel</option>
                    <option>Pump 3 - Premium</option>
                    <option>Pump 4 - LPG</option>
                  </select>
                </div>

                <div>
                  <Label>Test Volume (Liters)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.test_volume}
                    onChange={(e) => setForm({ ...form, test_volume: parseFloat(e.target.value) })}
                    placeholder="20.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard NPA test volume is 20L</p>
                </div>

                <div>
                  <Label>Actual Volume Dispensed (Liters) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.actual_volume}
                    onChange={(e) => setForm({ ...form, actual_volume: parseFloat(e.target.value) })}
                    placeholder="20.00"
                    required
                  />
                </div>

                {form.actual_volume > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">Calculated Variance:</p>
                    <p className="text-2xl text-black font-bold">
                      {(((form.actual_volume - form.test_volume) / form.test_volume) * 100).toFixed(2)}%
                    </p>
                    <p className={`text-xs font-medium mt-1 ${
                      Math.abs(((form.actual_volume - form.test_volume) / form.test_volume) * 100) <= 0.5
                        ? 'text-green-600'
                        : Math.abs(((form.actual_volume - form.test_volume) / form.test_volume) * 100) <= 2.0
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }`}>
                      {Math.abs(((form.actual_volume - form.test_volume) / form.test_volume) * 100) <= 0.5
                        ? '✓ Within acceptable tolerance (±0.5%)'
                        : Math.abs(((form.actual_volume - form.test_volume) / form.test_volume) * 100) <= 2.0
                        ? '⚠ Requires attention (±2.0%)'
                        : '✗ Failed - Immediate calibration required'}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Technician Name *</Label>
                  <Input
                    value={form.technician}
                    onChange={(e) => setForm({ ...form, technician: e.target.value })}
                    placeholder="Certified technician name"
                    required
                  />
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional observations, adjustments made, or maintenance notes..."
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  style={{ backgroundColor: '#0B2265' }}
                >
                  Save Calibration Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-green-50 border-green-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Passed</p>
                <p className="text-3xl text-black font-bold">{passedCount}</p>
                <p className="text-sm text-green-600">Compliant pumps</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6 bg-orange-50 border-orange-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Needs Attention</p>
                <p className="text-3xl text-black font-bold">{warningCount}</p>
                <p className="text-sm text-orange-600">Require adjustment</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-6 bg-red-50 border-red-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Failed</p>
                <p className="text-3xl text-black font-bold">{failedCount}</p>
                <p className="text-sm text-red-600">Immediate service</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Compliance Rate</p>
                <p className="text-3xl text-black font-bold">{complianceRate.toFixed(0)}%</p>
                <p className="text-sm text-blue-600">NPA Standards</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Calibration Records */}
      <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Calibration History & Schedule</span>
            <Badge variant="outline" className="bg-gray-100">
              {records.length} Total Records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <RecordSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const daysUntilDue = getDaysUntilDue(record.next_due_date);
                const isDueSoon = daysUntilDue <= 30;
                const isOverdue = daysUntilDue < 0;
                
                return (
                  <div key={record.id} className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-all duration-300 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          record.status === 'passed' ? 'bg-green-100' :
                          record.status === 'warning' ? 'bg-orange-100' :
                          'bg-red-100'
                        }`}>
                          <Gauge className={`w-6 h-6 ${
                            record.status === 'passed' ? 'text-green-600' :
                            record.status === 'warning' ? 'text-orange-600' :
                            'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <h5 className="text-lg text-black font-semibold mb-1">{record.pump_name}</h5>
                          <p className="text-sm text-gray-600">
                            Tested: {new Date(record.test_date).toLocaleDateString()} by {record.technician}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${getStatusColor(record.status)} border`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(record.status)}
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </div>
                        </Badge>
                        {(isDueSoon || isOverdue) && (
                          <div className={`flex items-center gap-1 text-xs ${
                            isOverdue ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {isOverdue ? 'Overdue' : `Due in ${daysUntilDue} days`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Test Volume</p>
                        <p className="text-sm text-black font-semibold">{record.test_volume.toFixed(2)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Actual Volume</p>
                        <p className="text-sm text-black font-semibold">{record.actual_volume.toFixed(2)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Variance</p>
                        <p className={`text-sm font-semibold ${
                          Math.abs(record.variance_percentage) <= 0.5 ? 'text-green-600' :
                          Math.abs(record.variance_percentage) <= 2.0 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {record.variance_percentage > 0 ? '+' : ''}{record.variance_percentage.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Next Calibration</p>
                        <p className="text-sm text-black font-semibold">{new Date(record.next_due_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1 font-medium">Notes:</p>
                        <p className="text-sm text-gray-700 bg-white p-2 rounded-lg border">
                          {record.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {records.length === 0 && (
                <div className="text-center py-12">
                  <Gauge className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No calibration records found</p>
                  <p className="text-sm text-gray-400">Start by recording your first calibration test</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NPA Compliance Information */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h5 className="text-lg text-black font-semibold mb-3">NPA Calibration Requirements & Standards</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span><strong>Frequency:</strong> Quarterly (90 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span><strong>Acceptable Tolerance:</strong> ±0.5% variance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-orange-600" />
                  <span><strong>Test Volume:</strong> 20 liters standard</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span><strong>Warning Zone:</strong> ±0.5% to ±2.0%</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span><strong>Failure:</strong> Beyond ±2.0% variance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-purple-600" />
                  <span><strong>Documentation:</strong> Mandatory record keeping</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
              <p className="text-xs text-blue-800 font-medium">
                💡 <strong>Important:</strong> Failed calibrations require immediate pump shutdown and recalibration. 
                All calibrations must be performed by certified technicians and documented for NPA compliance audits.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PumpCalibration;

