import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import {
  Building2,
  TrendingUp,
  Fuel,
  DollarSign,
  MapPin,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  FileText,
  PieChart,
  Loader2,
  Plus,
  UserPlus,
  Eye,
  Trash2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

// Types
interface Station {
  id: string;
  name: string;
  code: string;
  location?: string;
  address?: string;
  city?: string;
  region?: string;
  status: 'active' | 'inactive' | 'maintenance';
  manager_id?: string;
  omc_id?: string;
  dealer_id?: string;
  created_at: string;
  updated_at: string;
  omcs?: {
    name: string;
    code: string;
  };
  dealers?: {
    name: string;
  };
  total_sales?: number;
  total_volume?: number;
  compliance_status?: 'compliant' | 'non_compliant' | 'under_review';
  total_violations?: number;
}

interface Dealer {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  omc_id?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  omcs?: {
    name: string;
    code: string;
  };
  stations?: Array<{ id: string; name: string }>;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  station_id?: string;
  omc_id?: string;
  dealer_id?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  stations?: {
    name: string;
    code: string;
  };
  omcs?: {
    name: string;
    code: string;
  };
  dealers?: {
    name: string;
  };
}

interface SalesData {
  period: string;
  sales: number;
  volume: number;
  transactions: number;
}

interface DashboardStats {
  total_stations: number;
  active_stations: number;
  total_sales: number;
  total_volume: number;
  total_transactions: number;
  avg_compliance: number;
  pending_violations: number;
  active_dealers: number;
  total_users: number;
  monthly_growth: number;
}

interface SalesSummary {
  total_sales: number;
  total_volume: number;
  average_transaction: number;
  growth_rate: number;
  transaction_count: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_sales: number;
    total_volume: number;
    percentage: number;
  }>;
  top_stations: Array<{
    station_id: string;
    station_name: string;
    total_sales: number;
    total_volume: number;
    percentage: number;
  }>;
  daily_trends: Array<{
    date: string;
    sales: number;
    volume: number;
    transactions: number;
  }>;
}

// Enhanced Chart Component with Real Data
const SalesChart = ({ data, loading }: { data: SalesSummary['daily_trends']; loading: boolean }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No sales data available</p>
        </div>
      </div>
    );
  }

  const maxSales = Math.max(...data.map(item => item.sales));
  const maxVolume = Math.max(...data.map(item => item.volume));

  return (
    <div className="h-64 bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Daily Sales Trend</h4>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Sales (₵)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Volume (L)</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between h-48 gap-1">
        {data.map((day, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex items-end justify-center gap-1 w-full" style={{ height: '120px' }}>
              {/* Sales Bar */}
              <div
                className="w-3 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${(day.sales / maxSales) * 100}%` }}
                title={`₵${day.sales.toLocaleString()}`}
              />
              {/* Volume Bar */}
              <div
                className="w-3 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                style={{ height: `${(day.volume / maxVolume) * 80}%` }}
                title={`${day.volume.toLocaleString()}L`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 rotate-45 origin-top-left whitespace-nowrap">
              {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function OMCDashboard() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [omcUsers, setOmcUsers] = useState<User[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDealerDialog, setShowDealerDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form data
  const [stationForm, setStationForm] = useState({
    name: '',
    code: '',
    address: '',
    location: '',
    city: '',
    region: '',
    manager_id: '',
  });

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'attendant' as const,
    phone: '',
    station_id: '',
    dealer_id: ''
  });

  const [dealerForm, setDealerForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    commission_rate: 0.08,
  });

  useEffect(() => {
    if (user?.omc_id) {
      loadOMCData();
    }
  }, [user]);

  const loadOMCData = async () => {
    if (!user?.omc_id) return;
    
    setLoading(true);
    setError(null);
    try {
      // Load all data in parallel for better performance
      const [
        stationsResponse,
        dealersResponse,
        usersResponse,
        salesSummaryResponse,
        violationsResponse
      ] = await Promise.all([
        api.getAllStations(),
        api.getDealers(),
        api.getUsers(),
        api.getSalesSummary({ omc_id: user.omc_id }),
        api.getViolations({ omc_id: user.omc_id, status: 'open' })
      ]);

      // Handle API responses
      if (!stationsResponse.success) throw new Error(stationsResponse.error);
      if (!dealersResponse.success) throw new Error(dealersResponse.error);
      if (!usersResponse.success) throw new Error(usersResponse.error);

      // Filter data by the logged-in OMC's ID
      const omcStations = (stationsResponse.data || []).filter((station: Station) => station.omc_id === user.omc_id);
      const omcDealers = (dealersResponse.data || []).filter((dealer: Dealer) => dealer.omc_id === user.omc_id);
      const omcUsersData = (usersResponse.data?.users || []).filter((userData: User) => userData.omc_id === user.omc_id);

      setStations(omcStations);
      setDealers(omcDealers);
      setOmcUsers(omcUsersData);

      // Set sales summary if available
      if (salesSummaryResponse.success) {
        setSalesSummary(salesSummaryResponse.data);
      }

      // Calculate comprehensive stats
      calculateStats(
        omcStations, 
        omcDealers, 
        omcUsersData, 
        salesSummaryResponse.success ? salesSummaryResponse.data : null,
        violationsResponse.success ? violationsResponse.data : []
      );

    } catch (error) {
      console.error('Failed to load OMC data:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while loading data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    omcStations: Station[], 
    omcDealers: Dealer[], 
    omcUsers: User[], 
    salesData: SalesSummary | null,
    violations: any[]
  ) => {
    const activeStations = omcStations.filter(s => s.status === 'active').length;
    const totalSales = salesData?.total_sales || 0;
    const totalVolume = salesData?.total_volume || 0;
    const totalTransactions = salesData?.transaction_count || 0;
    
    // Calculate compliance rate based on station compliance status
    const compliantStations = omcStations.filter(s => s.compliance_status === 'compliant').length;
    const avgCompliance = omcStations.length > 0 ? (compliantStations / omcStations.length) * 100 : 0;
    
    const activeDealers = omcDealers.filter(d => d.is_active).length;
    const pendingViolations = violations.length;

    const stats: DashboardStats = {
      total_stations: omcStations.length,
      active_stations: activeStations,
      total_sales: totalSales,
      total_volume: totalVolume,
      total_transactions: totalTransactions,
      avg_compliance: Math.round(avgCompliance),
      pending_violations: pendingViolations,
      active_dealers: activeDealers,
      total_users: omcUsers.length,
      monthly_growth: salesData?.growth_rate || 0
    };

    setStats(stats);
  };

  // Form handlers with proper error handling
  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const stationData = {
        ...stationForm,
        omc_id: user?.omc_id
      };

      const result = await api.createStation(stationData);
      
      if (result.success) {
        toast.success('Station created successfully!');
        await loadOMCData();
        setShowStationDialog(false);
        setStationForm({
          name: '', code: '', address: '', location: '', city: '', region: '', manager_id: ''
        });
      } else {
        toast.error(`Failed to create station: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create station:', error);
      toast.error("Failed to create station. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const userData = {
        email: userForm.email,
        password: userForm.password,
        fullName: userForm.full_name,
        phone: userForm.phone || undefined,
        role: userForm.role,
        station_id: userForm.station_id || undefined,
        omc_id: user?.omc_id,
        dealer_id: userForm.dealer_id || undefined
      };

      const result = await api.signup(userData);

      if (result.success) {
        toast.success('User created successfully!');
        await loadOMCData();
        setShowUserDialog(false);
        setUserForm({ 
          email: '', password: '', full_name: '', role: 'attendant', phone: '',
          station_id: '', dealer_id: ''
        });
      } else {
        toast.error(`Failed to create user: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error("Failed to create user. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const dealerData = {
        ...dealerForm,
        omc_id: user?.omc_id
      };

      const result = await api.createDealer(dealerData);
      
      if (result.success) {
        toast.success('Dealer created successfully!');
        await loadOMCData();
        setShowDealerDialog(false);
        setDealerForm({
          name: '', contact_person: '', email: '', phone: '', address: '', 
          city: '', region: '', commission_rate: 0.08
        });
      } else {
        toast.error(`Failed to create dealer: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create dealer:', error);
      toast.error("Failed to create dealer. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await api.deleteUser(userId);
      
      if (result.success) {
        toast.success('User deleted successfully');
        await loadOMCData();
      } else {
        toast.error(`Failed to delete user: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error("Failed to delete user. Please try again.");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadOMCData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Helper functions for user creation form
  const getRoleIcon = (role: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      dealer: <Users className="w-4 h-4" />,
      station_manager: <Building2 className="w-4 h-4" />,
      attendant: <UserPlus className="w-4 h-4" />,
    };
    return icons[role] || <Users className="w-4 h-4" />;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: { [key: string]: string } = {
      dealer: "Manage dealer operations and commission tracking",
      station_manager: "Manage station operations, shifts, and attendants",
      attendant: "Record sales and manage daily station operations",
    };
    return descriptions[role] || "System user with role-based permissions";
  };

  const shouldShowStationField = () => {
    return ['station_manager', 'attendant'].includes(userForm.role);
  };

  const shouldShowDealerField = () => {
    return userForm.role === 'dealer';
  };

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 bg-white rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );

  const ChartSkeleton = () => (
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );

  const StationCardSkeleton = () => (
    <Card className="p-5 bg-gray-50 rounded-2xl">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </Card>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={refreshData} className="bg-blue-900 hover:bg-blue-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl text-black mb-2">OMC Dashboard</h1>
            <p className="text-gray-600">
              {user?.full_name || user?.email} - Multi-Station Network Management & Brand Oversight
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-900 hover:bg-blue-800">
                  <Plus className="w-4 h-4 mr-2" />
                  New Station
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg mx-2 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Create Station</DialogTitle>
                  <DialogDescription>
                    Add a new fuel station to your OMC network
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStation} className="space-y-4">
                  <div>
                    <Label>Station Name *</Label>
                    <Input
                      value={stationForm.name}
                      onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={stationForm.city}
                        onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Region</Label>
                      <Input
                        value={stationForm.region}
                        onChange={(e) => setStationForm({ ...stationForm, region: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={stationForm.address}
                      onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Code</Label>
                    <Input
                      value={stationForm.code}
                      onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-900 hover:bg-blue-800"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Station"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-900 hover:bg-blue-800">
                  <UserPlus className="w-4 h-4 mr-2" />
                  New User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg mx-2 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Create User Account</DialogTitle>
                  <DialogDescription>
                    Create system users with role-based permissions for your OMC network
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select 
                      value={userForm.role} 
                      onValueChange={(value: any) => setUserForm({ ...userForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {['dealer', 'station_manager', 'attendant'].map(role => (
                          <SelectItem key={role} value={role} className="flex items-center gap-2">
                            <span className="flex items-center gap-2">
                              {getRoleIcon(role)}
                              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {getRoleDescription(userForm.role)}
                    </p>
                  </div>

                  {shouldShowStationField() && (
                    <div>
                      <Label>Station *</Label>
                      <Select 
                        value={userForm.station_id} 
                        onValueChange={(value) => setUserForm({ ...userForm, station_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Station" />
                        </SelectTrigger>
                        <SelectContent>
                          {stations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name}
                            </SelectItem>
                          ))}
                          {stations.length === 0 && (
                            <SelectItem value="no-stations" disabled>
                              No stations available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {shouldShowDealerField() && (
                    <div>
                      <Label>Dealer</Label>
                      <Select 
                        value={userForm.dealer_id} 
                        onValueChange={(value) => setUserForm({ ...userForm, dealer_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Dealer (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {dealers.map((dealer) => (
                            <SelectItem key={dealer.id} value={dealer.id}>
                              {dealer.name}
                            </SelectItem>
                          ))}
                          {dealers.length === 0 && (
                            <SelectItem value="no-dealers" disabled>
                              No dealers available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-900 hover:bg-blue-800"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showDealerDialog} onOpenChange={setShowDealerDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-900 hover:bg-blue-800">
                  <Users className="w-4 h-4 mr-2" />
                  New Dealer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg mx-2 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Create Dealer</DialogTitle>
                  <DialogDescription>
                    Add a new dealer to your OMC network
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDealer} className="space-y-4">
                  <div>
                    <Label>Dealer Name *</Label>
                    <Input
                      value={dealerForm.name}
                      onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Contact Person</Label>
                    <Input
                      value={dealerForm.contact_person}
                      onChange={(e) => setDealerForm({ ...dealerForm, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={dealerForm.email}
                        onChange={(e) => setDealerForm({ ...dealerForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={dealerForm.phone}
                        onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={dealerForm.city}
                        onChange={(e) => setDealerForm({ ...dealerForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Region</Label>
                      <Input
                        value={dealerForm.region}
                        onChange={(e) => setDealerForm({ ...dealerForm, region: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={dealerForm.address}
                      onChange={(e) => setDealerForm({ ...dealerForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Commission Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={dealerForm.commission_rate * 100}
                      onChange={(e) => setDealerForm({ ...dealerForm, commission_rate: parseFloat(e.target.value) / 100 })}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-900 hover:bg-blue-800"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Dealer"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={refreshData}
              disabled={loading || refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Active Stations</p>
                  <p className="text-3xl text-black">{stats?.active_stations || 0}</p>
                  <p className="text-sm text-green-600">
                    of {stats?.total_stations || 0} total
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Sales</p>
                  <p className="text-3xl text-black">₵{(stats?.total_sales || 0).toLocaleString()}</p>
                  <p className={`text-sm ${(stats?.monthly_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats?.monthly_growth ? `${stats.monthly_growth > 0 ? '+' : ''}${stats.monthly_growth.toFixed(1)}%` : 'No data'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Volume Sold</p>
                  <p className="text-3xl text-black">{(stats?.total_volume || 0).toLocaleString()}L</p>
                  <p className="text-sm text-gray-600">
                    {stats?.total_transactions || 0} transactions
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Network Health</p>
                  <p className="text-3xl text-black">{stats?.avg_compliance || 0}%</p>
                  <p className="text-sm text-gray-600">
                    {stats?.pending_violations || 0} pending issues
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl w-full grid grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="stations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Stations</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="dealers" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Dealers</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>Sales Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesChart 
                    data={salesSummary?.daily_trends || []} 
                    loading={loading}
                  />
                </CardContent>
              </Card>

              <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                      <span className="text-gray-600">Station Utilization</span>
                      <span className="text-black font-semibold">
                        {stats ? Math.round((stats.active_stations / stats.total_stations) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
                      <span className="text-gray-600">Active Dealers</span>
                      <span className="text-black font-semibold">{stats?.active_dealers || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
                      <span className="text-gray-600">Network Users</span>
                      <span className="text-black font-semibold">{stats?.total_users || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                      <span className="text-gray-600">Pending Issues</span>
                      <span className="text-black font-semibold">{stats?.pending_violations || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Network Insights */}
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Network Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                        <Skeleton className="h-8 w-8 mx-auto mb-2" />
                        <Skeleton className="h-4 w-24 mx-auto mb-1" />
                        <Skeleton className="h-5 w-20 mx-auto mb-1" />
                        <Skeleton className="h-3 w-16 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stations.length > 0 && salesSummary?.top_stations?.[0] && (
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Top Performing Station</p>
                        <p className="text-lg text-black font-semibold truncate">
                          {salesSummary.top_stations[0].station_name}
                        </p>
                        <p className="text-xs text-green-600">
                          ₵{salesSummary.top_stations[0].total_sales.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {stations.length > 0 && (
                      <div className="text-center p-4 bg-orange-50 rounded-xl">
                        <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Needs Attention</p>
                        <p className="text-lg text-black font-semibold">
                          {stations.filter(s => s.status !== 'active').length > 0 
                            ? stations.find(s => s.status !== 'active')?.name
                            : 'All stations active'
                          }
                        </p>
                        <p className="text-xs text-orange-600">
                          {stations.filter(s => s.status !== 'active').length} inactive
                        </p>
                      </div>
                    )}
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <Settings className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Network Health</p>
                      <p className="text-lg text-black font-semibold">
                        {stats ? Math.round((stats.active_stations / stats.total_stations) * 100) : 0}%
                      </p>
                      <p className="text-xs text-blue-600">Operational efficiency</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stations">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Station Network Management</span>
                  <Button 
                    size="sm" 
                    onClick={() => setShowStationDialog(true)}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Performance tracking and operational oversight across {stations.length} stations
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <StationCardSkeleton key={i} />
                    ))
                  ) : stations.length > 0 ? (
                    stations.map((station) => (
                      <div
                        key={station.id}
                        className="p-5 bg-gray-50 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200"
                        onClick={() => setSelectedStation(station)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg text-black mb-1">{station.name}</h4>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{station.location || station.address || 'Location not specified'}</span>
                            </div>
                          </div>
                          <Badge variant={
                            station.status === 'active' ? 'default' :
                            station.status === 'maintenance' ? 'secondary' : 'outline'
                          }>
                            {station.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Region:</span>
                            <span className="text-black">{station.region || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Compliance:</span>
                            <span className={
                              station.compliance_status === 'compliant' 
                                ? 'text-green-600' 
                                : station.compliance_status === 'under_review'
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }>
                              {station.compliance_status?.replace('_', ' ') || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-gray-600 mb-1">Station Code</p>
                            <p className="text-black font-mono">{station.code}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Violations</p>
                            <p className="text-black">{station.total_violations || 0}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stations Found</h3>
                      <p className="text-gray-600">No stations are currently assigned to your OMC.</p>
                      <Button 
                        onClick={() => setShowStationDialog(true)}
                        className="mt-4 bg-blue-900 hover:bg-blue-800"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Station
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>User Management</span>
                  <Button 
                    size="sm" 
                    onClick={() => setShowUserDialog(true)}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Manage users across your OMC network - dealers, station managers, and attendants
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-5 bg-gray-50 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <Skeleton className="h-12 rounded-lg" />
                          <Skeleton className="h-12 rounded-lg" />
                          <Skeleton className="h-12 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : omcUsers.length > 0 ? (
                  <div className="space-y-4">
                    {omcUsers.map((userData) => (
                      <div key={userData.id} className="p-5 bg-gray-50 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-lg text-black mb-1">{userData.full_name}</h4>
                            <p className="text-sm text-gray-600">
                              {userData.email} • {userData.role.replace('_', ' ')}
                              {userData.stations?.name && ` • ${userData.stations.name}`}
                              {userData.dealers?.name && ` • ${userData.dealers.name}`}
                            </p>
                          </div>
                          <Badge variant={userData.status === 'active' ? 'default' : 'outline'}>
                            {userData.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Created: {new Date(userData.created_at).toLocaleDateString()}
                            {userData.last_login_at && ` • Last login: ${new Date(userData.last_login_at).toLocaleDateString()}`}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteUser(userData.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                    <p className="text-gray-600">No users are currently assigned to your OMC.</p>
                    <Button 
                      onClick={() => setShowUserDialog(true)}
                      className="mt-4 bg-blue-900 hover:bg-blue-800"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Your First User
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

<TabsContent value="dealers">
  <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>Dealer Network Management</span>
        <Button 
          size="sm" 
          onClick={() => setShowDealerDialog(true)}
          className="bg-blue-900 hover:bg-blue-800"
        >
          <Users className="w-4 h-4 mr-2" />
          Add Dealer
        </Button>
      </CardTitle>
      <p className="text-sm text-gray-600">
        Monitor dealer performance and commission structures
      </p>
    </CardHeader> {/* This closing tag was missing */}
    <CardContent>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : dealers.length > 0 ? (
        <div className="space-y-4">
          {dealers.map((dealer) => (
            <div key={dealer.id} className="p-5 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-lg text-black mb-1">{dealer.name}</h4>
                  <p className="text-sm text-gray-600">
                    {dealer.contact_person && `${dealer.contact_person} • `}
                    {dealer.email} • {dealer.phone}
                  </p>
                </div>
                <Badge variant={dealer.is_active ? 'default' : 'outline'}>
                  {dealer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Commission: {(dealer.commission_rate || 0) * 100}% • 
                  {dealer.region && ` ${dealer.region} •`}
                  Created: {new Date(dealer.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dealers Found</h3>
          <p className="text-gray-600">No dealers are currently assigned to your OMC.</p>
          <Button 
            onClick={() => setShowDealerDialog(true)}
            className="mt-4 bg-blue-900 hover:bg-blue-800"
          >
            <Users className="w-4 h-4 mr-2" />
            Create Your First Dealer
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>         

          <TabsContent value="reports">
            <Card className="p-6 bg-white rounded-2xl shadow-sm border-0">
              <CardHeader>
                <CardTitle>Business Intelligence Reports</CardTitle>
                <p className="text-sm text-gray-600">
                  Export comprehensive reports for analysis and decision making
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 justify-start p-4">
                    <div className="text-left">
                      <p className="text-black font-semibold">Monthly Financial Report</p>
                      <p className="text-sm text-gray-600">Sales, expenses, and profit analysis</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-20 justify-start p-4">
                    <div className="text-left">
                      <p className="text-black font-semibold">Station Performance Report</p>
                      <p className="text-sm text-gray-600">Comparative analysis across network</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-20 justify-start p-4">
                    <div className="text-left">
                      <p className="text-black font-semibold">Inventory Intelligence</p>
                      <p className="text-sm text-gray-600">Stock levels and demand forecasting</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-20 justify-start p-4">
                    <div className="text-left">
                      <p className="text-black font-semibold">Dealer Commission Report</p>
                      <p className="text-sm text-gray-600">Earnings breakdown and payout status</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default OMCDashboard;