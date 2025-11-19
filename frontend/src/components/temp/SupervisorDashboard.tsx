import React, { useState, useEffect } from "react";
import { api } from "../../utils/supabase-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
} from "lucide-react";


export function SupervisorDashboard() {
  const [complianceRecords, setComplianceRecords] = useState<any[]>([]);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  const [complianceForm, setComplianceForm] = useState({
    station_id: '',
    issue: '',
    severity: 'medium',
    notes: ''
  });

  useEffect(() => {
    loadCompliance();
  }, []);

  const loadCompliance = async () => {
    try {
      const data = await api.getAllCompliance();
      setComplianceRecords(data.compliance_records || []);
    } catch (error) {
      console.error('Failed to load compliance:', error);
    }
  };

  const handleRecordCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.recordCompliance(complianceForm);
      setShowComplianceDialog(false);
      setComplianceForm({ station_id: '', issue: '', severity: 'medium', notes: '' });
      loadCompliance();
    } catch (error) {
      console.error('Failed to record compliance:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'open': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'pending': return <XCircle className="w-5 h-5 text-gray-600" />;
      default: return null;
    }
  };

  const filteredRecords = filterSeverity === 'all' 
    ? complianceRecords 
    : complianceRecords.filter(r => r.severity === filterSeverity);

  const stats = {
    total: complianceRecords.length,
    open: complianceRecords.filter(r => r.status === 'open').length,
    resolved: complianceRecords.filter(r => r.status === 'resolved').length,
    critical: complianceRecords.filter(r => r.severity === 'critical').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl text-black">NPA Supervisor Dashboard</h1>
            </div>
            <p className="text-gray-600">National Petroleum Authority - Compliance & Oversight</p>
          </div>
          <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: '#0B2265' }}>
                <Plus className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Compliance Issue</DialogTitle>
                <DialogDescription>Enter the details of the compliance issue you want to report.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRecordCompliance} className="space-y-4">
                <div>
                  <Label>Station ID</Label>
                  <Input
                    value={complianceForm.station_id}
                    onChange={(e) => setComplianceForm({ ...complianceForm, station_id: e.target.value })}
                    placeholder="station_1234567890"
                    required
                  />
                </div>
                <div>
                  <Label>Issue</Label>
                  <Input
                    value={complianceForm.issue}
                    onChange={(e) => setComplianceForm({ ...complianceForm, issue: e.target.value })}
                    placeholder="Describe the compliance issue"
                    required
                  />
                </div>
                <div>
                  <Label>Severity</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    value={complianceForm.severity}
                    onChange={(e) => setComplianceForm({ ...complianceForm, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    rows={3}
                    value={complianceForm.notes}
                    onChange={(e) => setComplianceForm({ ...complianceForm, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
                <Button type="submit" className="w-full" style={{ backgroundColor: '#0B2265' }}>
                  Submit Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Issues</p>
                <p className="text-3xl text-black">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Open Issues</p>
                <p className="text-3xl text-black">{stats.open}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Resolved</p>
                <p className="text-3xl text-black">{stats.resolved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Critical</p>
                <p className="text-3xl text-black">{stats.critical}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="compliance" className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl">
            <TabsTrigger value="compliance">Compliance Records</TabsTrigger>
            <TabsTrigger value="audits">Station Audits</TabsTrigger>
            <TabsTrigger value="pricing">Price Monitoring</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="compliance">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Search station or issue..." className="pl-10" />
                </div>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Compliance List */}
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(record.status)}
                          <h4 className="text-lg text-black">{record.issue}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Station: {record.station_id}</p>
                        {record.notes && (
                          <p className="text-sm text-gray-700 bg-white p-3 rounded-lg">{record.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-lg text-sm capitalize ${getSeverityColor(record.severity)}`}>
                          {record.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(record.date_reported).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        Update Status
                      </Button>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No compliance records found</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="audits">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <h3 className="text-xl text-black mb-6">Station Audit Schedule</h3>
              <p className="text-center text-gray-500 py-12">Audit management interface</p>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <h3 className="text-xl text-black mb-6">Price Compliance Monitor</h3>
              <div className="space-y-4">
                <div className="p-5 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg text-black mb-1">National Price - Petrol</h4>
                      <p className="text-sm text-gray-600">All stations compliant</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl text-black">₵15.50</p>
                      <CheckCircle className="w-6 h-6 text-green-600 ml-auto mt-1" />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-yellow-50 rounded-2xl border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg text-black mb-1">National Price - Diesel</h4>
                      <p className="text-sm text-gray-600">2 stations pending update</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl text-black">₵16.20</p>
                      <AlertTriangle className="w-6 h-6 text-yellow-600 ml-auto mt-1" />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg text-black mb-1">National Price - LPG</h4>
                      <p className="text-sm text-gray-600">All stations compliant</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl text-black">₵12.80</p>
                      <CheckCircle className="w-6 h-6 text-green-600 ml-auto mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <h3 className="text-xl text-black mb-6">Regulatory Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 justify-start">
                  <div className="text-left">
                    <p className="text-black">National Compliance Report</p>
                    <p className="text-sm text-gray-600">Overview of all stations</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <div className="text-left">
                    <p className="text-black">Price Variance Report</p>
                    <p className="text-sm text-gray-600">Pricing compliance analysis</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <div className="text-left">
                    <p className="text-black">Safety Audit Report</p>
                    <p className="text-sm text-gray-600">Safety inspections summary</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <div className="text-left">
                    <p className="text-black">Calibration Report</p>
                    <p className="text-sm text-gray-600">Pump & meter calibration status</p>
                  </div>
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}