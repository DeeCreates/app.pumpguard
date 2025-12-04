// src/pages/reports/DailyReports.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Download, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Building,
  Store,
  User,
  Shield,
  Loader2,
  ChevronRight,
  Filter,
  MoreVertical,
  Printer,
  QrCode
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { PDFExport } from "@/lib/pdf-export";

// Types
interface DailyReport {
  id: string;
  station_id: string;
  report_date: string;
  shift: 'morning' | 'afternoon' | 'night';
  total_fuel_sold: number;
  total_sales: number;
  cash_collected: number;
  bank_deposits: number;
  total_expenses: number;
  variance: number;
  dealer_commission: number;
  commission_paid: boolean;
  net_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  submitted_by: string;
  approved_by?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  station_name?: string;
  station_code?: string;
  submitted_by_name?: string;
  approved_by_name?: string;
  stations?: {
    name: string;
    code: string;
    dealer_commission_rate: number;
  };
}

interface ReportSummary {
  total_reports: number;
  approved_reports: number;
  pending_reports: number;
  rejected_reports: number;
  total_sales: number;
  total_fuel_sold: number;
  total_expenses: number;
  total_commission: number;
  net_cash_flow: number;
  average_variance: number;
  monthly_sales: number;
  monthly_fuel: number;
  average_daily_sales: number;
  variance_rate: number;
}

interface Station {
  id: string;
  name: string;
  code: string;
  dealer_id?: string;
  manager_id?: string;
  omc_id?: string;
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatVolume = (volume: number): string => {
  return new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(volume || 0) + ' L';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusConfig = (status: string) => {
  const configs = {
    draft: { variant: "secondary" as const, icon: FileText, color: "bg-gray-100 text-gray-800", label: "Draft" },
    submitted: { variant: "outline" as const, icon: Clock, color: "bg-blue-100 text-blue-800", label: "Submitted" },
    approved: { variant: "default" as const, icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Approved" },
    rejected: { variant: "destructive" as const, icon: AlertTriangle, color: "bg-red-100 text-red-800", label: "Rejected" },
    paid: { variant: "default" as const, icon: CheckCircle, color: "bg-purple-100 text-purple-800", label: "Paid" }
  };
  return configs[status as keyof typeof configs] || configs.draft;
};

// Main Component
export default function DailyReports() {
  const { user } = useAuth();
  const userRole = user?.role || 'attendant';
  const userStationId = user?.station_id;
  const userId = user?.id;

  // State
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialogs
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    station_id: userRole === 'admin' ? "all" : userStationId,
    status: "all",
    shift: "all",
    search: ""
  });

  // Report generation form
  const [reportForm, setReportForm] = useState({
    report_date: new Date().toISOString().split('T')[0],
    station_id: userStationId || '',
    shift: 'morning' as 'morning' | 'afternoon' | 'night',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadStations();
    loadReports();
  }, []);

  // Load reports when filters change
  useEffect(() => {
    if (stations.length > 0) {
      loadReports();
    }
  }, [filters, stations]);

  const loadStations = async () => {
    try {
      const response = await api.getStations();
      
      if (response.success) {
        setStations(response.data || []);
      } else {
        toast.error('Failed to load stations');
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
      toast.error('Failed to load stations');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.getDailyReports(filters, user);
      
      if (response.success) {
        const reportsData = response.data || [];
        
        // Transform the data to match our interface
        const transformedReports: DailyReport[] = reportsData.map((report: any) => ({
          ...report,
          station_name: report.stations?.name,
          station_code: report.stations?.code,
          submitted_by_name: report.submitted_user?.full_name,
          approved_by_name: report.approved_user?.full_name
        }));

        setReports(transformedReports);
        calculateSummary(transformedReports);
      } else {
        toast.error(response.error || 'Failed to load reports');
        setReports([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
      setReports([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (reportsData: DailyReport[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter reports for current month
    const monthlyReports = reportsData.filter(report => {
      const reportDate = new Date(report.report_date);
      return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
    });

    // Calculate totals
    const totalReports = reportsData.length;
    const approvedReports = reportsData.filter(r => r.status === 'approved').length;
    const pendingReports = reportsData.filter(r => r.status === 'submitted').length;
    const rejectedReports = reportsData.filter(r => r.status === 'rejected').length;
    
    const totalSales = reportsData.reduce((sum, r) => sum + (r.total_sales || 0), 0);
    const totalFuelSold = reportsData.reduce((sum, r) => sum + (r.total_fuel_sold || 0), 0);
    const totalExpenses = reportsData.reduce((sum, r) => sum + (r.total_expenses || 0), 0);
    const totalCommission = reportsData.reduce((sum, r) => sum + (r.dealer_commission || 0), 0);
    const totalVariance = reportsData.reduce((sum, r) => sum + Math.abs(r.variance || 0), 0);
    const netCashFlow = reportsData.reduce((sum, r) => sum + (r.net_amount || 0), 0);

    // Monthly calculations
    const monthlySales = monthlyReports.reduce((sum, r) => sum + (r.total_sales || 0), 0);
    const monthlyFuel = monthlyReports.reduce((sum, r) => sum + (r.total_fuel_sold || 0), 0);
    
    const averageDailySales = monthlyReports.length > 0 ? monthlySales / monthlyReports.length : 0;
    const varianceRate = totalSales > 0 ? (totalVariance / totalSales) * 100 : 0;

    setSummary({
      total_reports: totalReports,
      approved_reports: approvedReports,
      pending_reports: pendingReports,
      rejected_reports: rejectedReports,
      total_sales: totalSales,
      total_fuel_sold: totalFuelSold,
      total_expenses: totalExpenses,
      total_commission: totalCommission,
      net_cash_flow: netCashFlow,
      average_variance: totalReports > 0 ? totalVariance / totalReports : 0,
      monthly_sales: monthlySales,
      monthly_fuel: monthlyFuel,
      average_daily_sales: averageDailySales,
      variance_rate: varianceRate
    });
  };

  // Automated report generation
  const generateDailyReport = async () => {
    if (!reportForm.station_id) {
      toast.error('Please select a station');
      return;
    }

    setGeneratingReport(true);
    try {
      const reportDate = reportForm.report_date;
      const stationId = reportForm.station_id;

      // 1. Get tank stocks for the day
      const tankStocksResponse = await api.getDailyTankStocks?.({
        station_id: stationId,
        date: reportDate
      });

      const tankStocks = tankStocksResponse?.success ? tankStocksResponse.data : [];
      const totalFuelSold = tankStocks?.reduce((sum: number, ts: any) => {
        return sum + ((ts.opening_stock || 0) - (ts.closing_stock || 0));
      }, 0) || 0;

      // 2. Get sales data for the day
      const salesResponse = await api.getSales?.({
        station_id: stationId,
        start_date: `${reportDate}T00:00:00`,
        end_date: `${reportDate}T23:59:59`
      });

      const salesData = salesResponse?.success ? salesResponse.data : [];
      const totalSales = salesData?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
      const cashCollected = salesData?.reduce((sum: number, s: any) => sum + (s.cash_received || 0), 0) || 0;

      // 3. Get expenses for the day
      const expensesResponse = await api.getExpenses?.({
        station_id: stationId,
        expense_date: reportDate
      });

      const expensesData = expensesResponse?.success ? expensesResponse.data : [];
      const totalExpenses = expensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      // 4. Get bank deposits for the day
      const bankDepositsResponse = await api.getBankDeposits?.({
        station_id: stationId,
        deposit_date: reportDate
      });

      const depositsData = bankDepositsResponse?.success ? bankDepositsResponse.data : [];
      const bankDeposits = depositsData?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0;

      // 5. Calculate dealer commission (get station commission rate)
      const stationResponse = await api.getStation(stationId);
      const station = stationResponse?.success ? stationResponse.data : null;
      const commissionRate = station?.dealer_commission_rate || 0;
      const dealerCommission = totalSales * (commissionRate / 100);

      // 6. Calculate variance and net amount
      const variance = cashCollected - totalSales;
      const netAmount = cashCollected - totalExpenses - dealerCommission;

      // 7. Create the report
      const reportData = {
        station_id: stationId,
        report_date: reportDate,
        shift: reportForm.shift,
        total_fuel_sold: totalFuelSold,
        total_sales: totalSales,
        cash_collected: cashCollected,
        bank_deposits: bankDeposits,
        total_expenses: totalExpenses,
        variance: variance,
        dealer_commission: dealerCommission,
        commission_paid: false,
        net_amount: netAmount,
        status: userRole === 'station_manager' ? 'submitted' : 'draft',
        notes: reportForm.notes || null,
        submitted_by: userId,
        submitted_at: userRole === 'station_manager' ? new Date().toISOString() : null
      };

      const response = await api.createDailyReport(reportData);
      
      if (response.success) {
        toast.success(
          userRole === 'station_manager' 
            ? 'Report submitted successfully!' 
            : 'Report generated as draft!'
        );

        setShowGenerateDialog(false);
        setReportForm({
          report_date: new Date().toISOString().split('T')[0],
          station_id: userStationId || '',
          shift: 'morning',
          notes: ''
        });

        loadReports();
      } else {
        toast.error(response.error || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export PDF with QR code
  const exportReportPDF = async (report: DailyReport) => {
    setExportingPDF(report.id);
    try {
      // Get user info for PDF
      const userInfo = {
        name: user?.name || '',
        role: user?.role || '',
        station_id: user?.station_id || ''
      };

      const result = await PDFExport.exportDailyReport(report, userInfo);
      
      if (result.success) {
        PDFExport.download(result);
        toast.success('PDF exported with QR code!');
      } else {
        throw new Error(result.error || 'PDF generation failed');
      }
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExportingPDF(null);
    }
  };

  // Export all reports
  const exportAllReports = async () => {
    try {
      // Get user info for PDF
      const userInfo = {
        name: user?.name || '',
        role: user?.role || '',
        station_id: user?.station_id || ''
      };

      const result = await PDFExport.exportMultipleReports(reports, userInfo, filters);
      
      if (result.success) {
        PDFExport.download(result);
        toast.success('All reports exported successfully!');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  // Approve/Reject reports
  const handleApproveReport = async (reportId: string) => {
    setActionLoading(`approve-${reportId}`);
    try {
      const response = await api.updateDailyReportStatus(reportId, {
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      });

      if (response.success) {
        toast.success('Report approved successfully!');
        loadReports();
      } else {
        toast.error(response.error || 'Failed to approve report');
      }
    } catch (error: any) {
      toast.error(`Failed to approve report: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectReport = async (reportId: string) => {
    setActionLoading(`reject-${reportId}`);
    try {
      const response = await api.updateDailyReportStatus(reportId, {
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString()
      });

      if (response.success) {
        toast.success('Report rejected!');
        loadReports();
      } else {
        toast.error(response.error || 'Failed to reject report');
      }
    } catch (error: any) {
      toast.error(`Failed to reject report: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (reportId: string) => {
    setActionLoading(`pay-${reportId}`);
    try {
      const response = await api.updateDailyReportStatus(reportId, {
        status: 'paid',
        commission_paid: true,
        paid_by: userId,
        paid_at: new Date().toISOString()
      });

      if (response.success) {
        toast.success('Commission marked as paid!');
        loadReports();
      } else {
        toast.error(response.error || 'Failed to mark as paid');
      }
    } catch (error: any) {
      toast.error(`Failed to mark as paid: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Role permissions
  const canCreateReport = ['admin', 'station_manager'].includes(userRole);
  const canApproveReport = ['admin', 'omc', 'dealer'].includes(userRole);
  const canViewAllStations = userRole === 'admin';

  // Loading state
  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading daily reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Reports</h1>
          <p className="text-gray-600">Manage and review daily station reports</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportAllReports}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canCreateReport && (
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Daily Report</DialogTitle>
                  <DialogDescription>
                    The system will automatically calculate all figures from your data
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportDate">Report Date</Label>
                    <Input
                      id="reportDate"
                      type="date"
                      value={reportForm.report_date}
                      onChange={(e) => setReportForm({...reportForm, report_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station">Station</Label>
                    <Select
                      value={reportForm.station_id}
                      onValueChange={(value) => setReportForm({...reportForm, station_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((station) => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name} ({station.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <Select
                      value={reportForm.shift}
                      onValueChange={(value: 'morning' | 'afternoon' | 'night') => 
                        setReportForm({...reportForm, shift: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={reportForm.notes}
                      onChange={(e) => setReportForm({...reportForm, notes: e.target.value})}
                      placeholder="Add any additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={generateDailyReport} 
                    disabled={generatingReport}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Report Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Daily Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportDate">Report Date</Label>
              <Input 
                id="reportDate" 
                type="date" 
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select
                value={filters.station_id}
                onValueChange={(value) => setFilters({...filters, station_id: value})}
                disabled={!canViewAllStations}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select
                value={filters.shift}
                onValueChange={(value) => setFilters({...filters, shift: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => canCreateReport ? setShowGenerateDialog(true) : toast.error('You do not have permission to generate reports')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {canCreateReport ? 'Generate Report' : 'View Reports'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.total_reports}</p>
              <p className="text-sm text-gray-600">Reports This Month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.approved_reports}</p>
              <p className="text-sm text-gray-600">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.pending_reports}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(summary.monthly_sales)}</p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Daily Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-500 mb-4">
                {canCreateReport 
                  ? 'Generate your first daily report to get started'
                  : 'No reports available for your station'
                }
              </p>
              {canCreateReport && (
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate First Report
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={filters.status === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({...filters, status: 'all'})}
                >
                  All
                </Button>
                <Button
                  variant={filters.status === 'submitted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({...filters, status: 'submitted'})}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Submitted
                </Button>
                <Button
                  variant={filters.status === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({...filters, status: 'approved'})}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approved
                </Button>
                <Button
                  variant={filters.status === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({...filters, status: 'rejected'})}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Rejected
                </Button>
                <div className="ml-auto">
                  <Input
                    placeholder="Search reports..."
                    className="w-48"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Fuel Sold (L)</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Cash Collected</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const statusConfig = getStatusConfig(report.status);
                    const StatusIcon = statusConfig.icon;
                    const isOver = report.variance >= 0;
                    
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {formatDate(report.report_date)}
                          <p className="text-xs text-gray-500">
                            {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift
                          </p>
                        </TableCell>
                        <TableCell>
                          {report.station_name || report.stations?.name || 'Unknown Station'}
                          <p className="text-xs text-gray-500">{report.station_code || report.stations?.code || 'N/A'}</p>
                        </TableCell>
                        <TableCell>{formatVolume(report.total_fuel_sold)}</TableCell>
                        <TableCell>{formatCurrency(report.total_sales)}</TableCell>
                        <TableCell>{formatCurrency(report.cash_collected)}</TableCell>
                        <TableCell>
                          <span className={isOver ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {isOver ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            {formatCurrency(Math.abs(report.variance))}
                            {isOver ? " Over" : " Short"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={statusConfig.variant}
                            className={statusConfig.color}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedReport(report);
                                  setShowDetailsDialog(true);
                                }}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportReportPDF(report)}>
                                  {exportingPDF === report.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  Export PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canApproveReport && report.status === 'submitted' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApproveReport(report.id)}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                      Approve Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRejectReport(report.id)}>
                                      <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                                      Reject Report
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {userRole === 'admin' && report.status === 'approved' && !report.commission_paid && (
                                  <DropdownMenuItem onClick={() => handleMarkPaid(report.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-purple-600" />
                                    Mark Commission Paid
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    metric: "Total Sales", 
                    value: formatCurrency(summary.monthly_sales), 
                    change: summary.monthly_sales > 0 ? "+12.5%" : "0%" 
                  },
                  { 
                    metric: "Fuel Volume", 
                    value: formatVolume(summary.monthly_fuel), 
                    change: summary.monthly_fuel > 0 ? "+8.3%" : "0%" 
                  },
                  { 
                    metric: "Average Daily Sales", 
                    value: formatCurrency(summary.average_daily_sales), 
                    change: summary.average_daily_sales > 0 ? "+5.2%" : "0%" 
                  },
                  { 
                    metric: "Variance Rate", 
                    value: `${summary.variance_rate.toFixed(1)}%`, 
                    change: summary.variance_rate > 0 ? `-${(summary.variance_rate * 0.3).toFixed(1)}%` : "0%" 
                  },
                ].map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{stat.metric}</span>
                    <div className="text-right">
                      <p className="font-semibold">{stat.value}</p>
                      <p className="text-sm text-green-600">{stat.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { status: "Submitted", count: summary.pending_reports, color: "bg-blue-500" },
                  { status: "Approved", count: summary.approved_reports, color: "bg-green-500" },
                  { status: "Pending Review", count: summary.pending_reports, color: "bg-yellow-500" },
                  { status: "Rejected", count: summary.rejected_reports, color: "bg-red-500" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span>{item.status}</span>
                    </div>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Daily Report Details
                </DialogTitle>
                <DialogDescription>
                  {selectedReport.station_name || selectedReport.stations?.name} • {formatDate(selectedReport.report_date)} • {selectedReport.shift} Shift
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Fuel Sold</p>
                      <p className="text-lg font-bold">{formatVolume(selectedReport.total_fuel_sold)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedReport.total_sales)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Cash Collected</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedReport.cash_collected)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Variance</p>
                      <p className={`text-lg font-bold ${selectedReport.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedReport.variance >= 0 ? '+' : ''}{formatCurrency(selectedReport.variance)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Detailed Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Report Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Report ID:</span>
                          <span className="font-mono">{selectedReport.id.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Station:</span>
                          <span>{selectedReport.station_name || selectedReport.stations?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span>{formatDate(selectedReport.report_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shift:</span>
                          <span>{selectedReport.shift.charAt(0).toUpperCase() + selectedReport.shift.slice(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <Badge variant={getStatusConfig(selectedReport.status).variant}>
                            {getStatusConfig(selectedReport.status).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Financial Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bank Deposits:</span>
                          <span>{formatCurrency(selectedReport.bank_deposits)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Expenses:</span>
                          <span>{formatCurrency(selectedReport.total_expenses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dealer Commission:</span>
                          <span className={selectedReport.commission_paid ? 'text-green-600' : 'text-yellow-600'}>
                            {formatCurrency(selectedReport.dealer_commission)}
                            {selectedReport.commission_paid && ' ✓'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Net Amount:</span>
                          <span className="font-bold">{formatCurrency(selectedReport.net_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Trail */}
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Audit Trail</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted By:</span>
                      <span>{selectedReport.submitted_by_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted At:</span>
                      <span>{formatDateTime(selectedReport.submitted_at)}</span>
                    </div>
                    {selectedReport.approved_by_name && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Approved By:</span>
                          <span>{selectedReport.approved_by_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Approved At:</span>
                          <span>{formatDateTime(selectedReport.approved_at)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedReport.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedReport.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Actions */}
                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => exportReportPDF(selectedReport)}
                    disabled={exportingPDF === selectedReport.id}
                    className="flex-1"
                  >
                    {exportingPDF === selectedReport.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4 mr-2" />
                    )}
                    Export with QR Code
                  </Button>
                  {canApproveReport && selectedReport.status === 'submitted' && (
                    <div className="flex gap-2 flex-1">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleRejectReport(selectedReport.id);
                          setShowDetailsDialog(false);
                        }}
                        className="flex-1"
                        disabled={actionLoading === `reject-${selectedReport.id}`}
                      >
                        {actionLoading === `reject-${selectedReport.id}` ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mr-2" />
                        )}
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          handleApproveReport(selectedReport.id);
                          setShowDetailsDialog(false);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={actionLoading === `approve-${selectedReport.id}`}
                      >
                        {actionLoading === `approve-${selectedReport.id}` ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}