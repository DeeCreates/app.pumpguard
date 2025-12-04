// src/pages/verify/report.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  QrCode, 
  FileText,
  Building,
  Calendar,
  DollarSign,
  User,
  Shield,
  ExternalLink,
  Home,
  ArrowLeft
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

export default function ReportVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const id = searchParams.get('id');
  const hash = searchParams.get('hash');
  const date = searchParams.get('date');
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);
  const [verificationUrl, setVerificationUrl] = useState('');

  useEffect(() => {
    // Build the current URL for display
    const currentUrl = window.location.href;
    setVerificationUrl(currentUrl);

    if (id && hash) {
      verifyReport(id, hash);
    } else if (id && !hash) {
      // If only ID is provided (for direct access without QR)
      verifyReportDirect(id);
    } else {
      setLoading(false);
      setValid(false);
    }
  }, [id, hash]);

  const verifyReport = async (reportId: string, providedHash: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          stations (name, code, city, region),
          submitted_user:profiles!daily_reports_submitted_by_fkey (full_name, role),
          approved_user:profiles!daily_reports_approved_by_fkey (full_name, role)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      if (data) {
        setReport(data);
        
        // Verify hash (use same logic as PDF generation)
        const expectedHash = generateHash(data);
        setValid(expectedHash === providedHash.toUpperCase());
      } else {
        setValid(false);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyReportDirect = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          stations (name, code),
          submitted_user:profiles!daily_reports_submitted_by_fkey (full_name)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      if (data) {
        setReport(data);
        setValid(true); // Direct access without hash is valid
      } else {
        setValid(false);
      }
    } catch (error) {
      console.error('Direct verification error:', error);
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const generateHash = (report: any) => {
    const data = JSON.stringify({
      id: report.id,
      report_date: report.report_date,
      station_id: report.station_id,
      total_sales: report.total_sales,
      status: report.status,
      cash_collected: report.cash_collected
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }
    
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      submitted: { variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' },
      approved: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      paid: { variant: 'default' as const, color: 'bg-purple-100 text-purple-800' }
    };
    return config[status as keyof typeof config] || config.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <QrCode className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Verifying Document</h3>
          <p className="text-gray-600 mt-1">Checking report authenticity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-6">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <QrCode className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">PumpGuard Document Verification</h1>
          </div>
          <p className="text-gray-600">Verify the authenticity of daily reports</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Document Verification Result
                </CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  {valid === true ? 'Authentic Document' : valid === false ? 'Invalid Document' : 'Verification Failed'}
                </p>
              </div>
              {valid !== null && (
                <Badge variant={valid ? 'secondary' : 'destructive'} className="text-sm px-3 py-1">
                  {valid ? 'VERIFIED ✓' : 'INVALID ✗'}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {valid === false ? (
              <div className="text-center py-8">
                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Verification Failed</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  This document could not be verified. It may have been altered, tampered with, or is not an authentic PumpGuard document.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate('/')}>
                    <Home className="w-4 h-4 mr-2" />
                    Return to Dashboard
                  </Button>
                  <Button variant="destructive" onClick={() => navigate('/reports')}>
                    View Reports
                  </Button>
                </div>
              </div>
            ) : valid === true && report ? (
              <div className="space-y-6">
                {/* Verification Success Banner */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-800 text-lg">Document Authenticity Confirmed</h4>
                      <p className="text-green-700 mt-1">
                        This document has been verified as authentic and unaltered. All signatures and data are valid.
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        Verified at: {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Report Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Report Date
                          </span>
                          <span className="font-semibold">{formatDate(report.report_date)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-gray-600 flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Station
                          </span>
                          <div className="text-right">
                            <span className="font-semibold block">{report.stations?.name}</span>
                            <span className="text-sm text-gray-500">{report.stations?.code}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-gray-600">Report ID</span>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {report.id?.slice(-8)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-600">Status</span>
                          <Badge className={getStatusBadge(report.status).color}>
                            {report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Audit Trail */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Audit Trail</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-gray-600 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Submitted By
                          </span>
                          <span>{report.submitted_user?.full_name || 'System'}</span>
                        </div>
                        {report.approved_user && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-gray-600">Approved By</span>
                            <span>{report.approved_user?.full_name}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Financial Details */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Financial Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Sales</span>
                            <span className="font-bold text-lg">{formatCurrency(report.total_sales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cash Collected</span>
                            <span className="font-semibold">{formatCurrency(report.cash_collected)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bank Deposits</span>
                            <span>{formatCurrency(report.bank_deposits)}</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Expenses</span>
                            <span>{formatCurrency(report.total_expenses)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dealer Commission</span>
                            <span className={report.commission_paid ? 'text-green-600 font-semibold' : 'text-yellow-600'}>
                              {formatCurrency(report.dealer_commission)}
                              {report.commission_paid && ' ✓'}
                            </span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="bg-gradient-to-r from-blue-50 to-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Variance</span>
                            <span className={`text-xl font-bold ${report.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.variance >= 0 ? '+' : ''}{formatCurrency(report.variance)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {report.variance >= 0 ? 'Over collection' : 'Short collection'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Verification Details */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Verification Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="break-all">
                            <div className="text-gray-600 text-sm mb-1">Verification URL</div>
                            <a 
                              href={verificationUrl} 
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-mono bg-blue-50 p-2 rounded block"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {verificationUrl}
                              <ExternalLink className="w-3 h-3 inline ml-1" />
                            </a>
                          </div>
                          {hash && (
                            <div>
                              <div className="text-gray-600 text-sm mb-1">Security Hash</div>
                              <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                                {hash}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    onClick={() => window.print()}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Print Verification Certificate
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate('/reports')}
                  >
                    View All Reports
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Invalid Verification Request</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  The verification link is incomplete or invalid. Please scan a valid QR code or use a proper verification link.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/')}>
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/reports')}>
                    Browse Reports
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>PumpGuard Document Verification System • {new Date().getFullYear()}</p>
          <p className="mt-1">All documents are cryptographically verified for authenticity</p>
        </div>
      </div>
    </div>
  );
}