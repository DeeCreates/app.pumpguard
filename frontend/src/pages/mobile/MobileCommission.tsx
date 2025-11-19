// src/pages/financial/Commission.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  Building, 
  Fuel, 
  Store, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calculator,
  Target,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  BarChart3,
  CreditCard,
  PieChart
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Types for commission data
interface Commission {
  id: string;
  station_id: string;
  dealer_id?: string;
  omc_id: string;
  period: string;
  total_sales: number;
  total_volume: number;
  base_commission_rate: number;
  base_commission_amount: number;
  windfall_amount: number;
  shortfall_amount: number;
  bonus_amount: number;
  total_commission: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculated_at: string;
  paid_at?: string;
  approved_by?: string;
  paid_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Related data
  station?: {
    name: string;
    code: string;
  };
  dealer?: {
    name: string;
  };
  omc?: {
    name: string;
  };
}

interface CommissionStats {
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

interface CommissionFilters {
  period?: string;
  status?: string;
  station_id?: string;
}

export default function Commission() {
  const [activeTab, setActiveTab] = useState("overview");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<CommissionFilters>({
    period: new Date().toISOString().slice(0, 7),
  });
  
  const [commissionStats, setCommissionStats] = useState<CommissionStats>({
    total_commissions: 0,
    pending_commissions: 0,
    paid_commissions: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCommissions();
  }, [filters]);

  useEffect(() => {
    calculateCommissionStats();
  }, [commissions]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const response = await api.getCommissions(filters);
      
      if (response.success && response.data) {
        setCommissions(response.data.commissions || []);
      } else {
        setCommissions([]);
      }
    } catch (error) {
      console.error('Error loading commissions:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCommissions();
      toast({
        title: "Refreshed",
        description: "Commission data updated",
      });
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const calculateCommissionStats = () => {
    const stats: CommissionStats = {
      total_commissions: commissions.length,
      pending_commissions: commissions.filter(c => c.status === 'pending' || c.status === 'calculated').length,
      paid_commissions: commissions.filter(c => c.status === 'paid').length,
      total_amount: commissions.reduce((sum, c) => sum + c.total_commission, 0),
      paid_amount: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.total_commission, 0),
      pending_amount: commissions.filter(c => c.status === 'pending' || c.status === 'calculated').reduce((sum, c) => sum + c.total_commission, 0),
    };
    setCommissionStats(stats);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GH').format(num);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'approved': return 'secondary';
      case 'calculated': return 'outline';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'calculated': return <Calculator className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getRoleBasedTitle = () => {
    switch (user?.role) {
      case 'admin': return "Commission Management";
      case 'omc': return "My OMC Commissions";
      case 'dealer': return "Dealer Commissions";
      case 'station_manager': return "Station Commissions";
      case 'attendant': return "My Earnings";
      default: return "Commissions";
    }
  };

  const getRoleBasedDescription = () => {
    switch (user?.role) {
      case 'admin': return "Manage all commission calculations and payments";
      case 'omc': return "View and manage OMC commission earnings";
      case 'dealer': return "Track dealer commission payments and history";
      case 'station_manager': return "Monitor station commission earnings and targets";
      case 'attendant': return "View your commission earnings and performance";
      default: return "Commission and earnings overview";
    }
  };

  // Mobile-optimized commission card
  const CommissionCard = ({ commission }: { commission: Commission }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{commission.station?.name || 'Unknown Station'}</h3>
            <p className="text-sm text-gray-600">{commission.period}</p>
          </div>
          <Badge variant={getStatusVariant(commission.status)} className="flex items-center text-xs">
            {getStatusIcon(commission.status)}
            <span className="ml-1 capitalize">{commission.status}</span>
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Sales</p>
            <p className="font-semibold">{formatCurrency(commission.total_sales)}</p>
          </div>
          <div>
            <p className="text-gray-600">Volume</p>
            <p className="font-semibold">{formatNumber(commission.total_volume)} L</p>
          </div>
          <div>
            <p className="text-gray-600">Base Rate</p>
            <p className="font-semibold">{(commission.base_commission_rate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-600">Total</p>
            <p className="font-bold text-green-600 text-base">
              {formatCurrency(commission.total_commission)}
            </p>
          </div>
        </div>

        {(commission.windfall_amount > 0 || commission.shortfall_amount > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              {commission.windfall_amount > 0 && (
                <span className="text-green-600">
                  +{formatCurrency(commission.windfall_amount)} windfall
                </span>
              )}
              {commission.shortfall_amount > 0 && (
                <span className="text-red-600">
                  -{formatCurrency(commission.shortfall_amount)} shortfall
                </span>
              )}
              {commission.bonus_amount > 0 && (
                <span className="text-blue-600">
                  +{formatCurrency(commission.bonus_amount)} bonus
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-20"></div>
            ))}
          </div>
          
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{getRoleBasedTitle()}</h1>
              <p className="text-sm text-gray-600">{getRoleBasedDescription()}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {commissionStats.total_commissions}
              </p>
              <p className="text-xs text-blue-600">Total</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {commissionStats.paid_commissions}
              </p>
              <p className="text-xs text-green-600">Paid</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {commissionStats.pending_commissions}
              </p>
              <p className="text-xs text-orange-600">Pending</p>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
            <Select 
              value={filters.period} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}
            >
              <SelectTrigger className="w-32 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-01">Jan 2024</SelectItem>
                <SelectItem value="2024-02">Feb 2024</SelectItem>
                <SelectItem value="2024-03">Mar 2024</SelectItem>
                <SelectItem value="2024-04">Apr 2024</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-28 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="calculated">Calculated</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  More
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-4/5">
                <SheetHeader>
                  <SheetTitle>Filter Commissions</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Input 
                      type="month" 
                      value={filters.period}
                      onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="calculated">Calculated</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs">
              <CreditCard className="w-3 h-3 mr-1" />
              Commissions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">
              <PieChart className="w-3 h-3 mr-1" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Total Earnings Card */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatCurrency(commissionStats.total_amount)}
                    </p>
                    <p className="text-blue-100 text-xs mt-1">
                      {commissionStats.total_commissions} commission records
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Paid</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(commissionStats.paid_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pending</p>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(commissionStats.pending_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No commission records found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.slice(0, 3).map((commission) => (
                      <div key={commission.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{commission.station?.name}</p>
                          <p className="text-xs text-gray-600">{commission.period}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">
                            {formatCurrency(commission.total_commission)}
                          </p>
                          <Badge variant={getStatusVariant(commission.status)} className="text-xs">
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {commissions.length > 3 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs"
                        onClick={() => setActiveTab("commissions")}
                      >
                        View All Commissions
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {(user?.role === 'admin' || user?.role === 'omc') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Commissions
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <div className="space-y-3">
              {commissions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No commissions found</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Try adjusting your filters or check back later for new commission records.
                    </p>
                    <Button onClick={handleRefresh} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Showing {commissions.length} commission{commissions.length !== 1 ? 's' : ''}
                    </p>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>

                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3">
                      {commissions.map((commission) => (
                        <CommissionCard key={commission.id} commission={commission} />
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Average Commission</span>
                    <span className="font-semibold">
                      {commissionStats.total_commissions > 0 
                        ? formatCurrency(commissionStats.total_amount / commissionStats.total_commissions)
                        : formatCurrency(0)
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">Paid Amount</span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(commissionStats.paid_amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm text-orange-700">Pending Amount</span>
                    <span className="font-semibold text-orange-700">
                      {formatCurrency(commissionStats.pending_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Paid</span>
                      </div>
                      <span className="font-semibold">{commissionStats.paid_commissions}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">Pending</span>
                      </div>
                      <span className="font-semibold">{commissionStats.pending_commissions}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Calculated</span>
                      </div>
                      <span className="font-semibold">
                        {commissions.filter(c => c.status === 'calculated').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Period Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Period Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2 border-b">
                      <span>Current Period</span>
                      <span className="font-semibold">
                        {formatCurrency(commissionStats.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 border-b">
                      <span>Previous Period</span>
                      <span className="font-semibold text-gray-500">--</span>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <span>Growth</span>
                      <span className="font-semibold text-green-600">+0%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button for Mobile */}
      {(user?.role === 'admin' || user?.role === 'omc') && (
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
              size="icon"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Commission Actions</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 p-4">
              <Button variant="outline" className="w-full justify-start">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Commissions
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export Commission Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Generate Statements
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}