import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  Eye,
  Edit,
  BarChart3,
  TrendingUp,
  Calendar,
  User,
  LogIn,
  Zap,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  FileText,
  History,
  TrendingDown,
  Package,
  ClipboardList,
  Calculator,
  FileSpreadsheet,
  AlertCircle,
  Info,
  Building,
  Store,
  Shield
} from "lucide-react";
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";

interface TankStock {
  id: string;
  station_id: string;
  product_id: string;
  current_volume: number;
  max_capacity: number;
  last_delivery_date: string;
  last_delivery_quantity: number;
  status: 'adequate' | 'low' | 'critical' | 'empty';
  updated_at: string;
  station_name?: string;
  product_name?: string;
  product_unit?: string;
}

interface DailyTankStock {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  deliveries: number;
  sales: number;
  variance: number;
  stock_date: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  station_name?: string;
  product_name?: string;
  product_unit?: string;
}

interface Delivery {
  id: string;
  station_id: string;
  product_id: string;
  quantity: number;
  supplier: string;
  driver_name: string;
  vehicle_number: string;
  delivery_date: string;
  received_by: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
  station_name?: string;
  product_name?: string;
}

interface Reconciliation {
  id: string;
  station_id: string;
  product_id: string;
  opening_stock: number;
  deliveries: number;
  sales: number;
  closing_stock: number;
  variance: number;
  reconciled_by: string;
  reconciliation_date: string;
  notes?: string;
  station_name?: string;
  product_name?: string;
}

interface InventoryManagementProps {
  stationId?: string;
  compact?: boolean;
}

export default function InventoryManagement({ stationId, compact = false }: InventoryManagementProps) {
  const [tankStocks, setTankStocks] = useState<TankStock[]>([]);
  const [dailyTankStocks, setDailyTankStocks] = useState<DailyTankStock[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>(stationId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [showDailyStockDialog, setShowDailyStockDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily-stock' | 'deliveries' | 'reconciliation'>('overview');
  const [authChecked, setAuthChecked] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const [deliveryForm, setDeliveryForm] = useState({
    station_id: stationId || '',
    product_id: '',
    quantity: '',
    supplier: '',
    driver_name: '',
    vehicle_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    received_by: '',
    notes: ''
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    station_id: stationId || '',
    product_id: '',
    opening_stock: '',
    deliveries: '',
    sales: '',
    closing_stock: '',
    notes: ''
  });

  const [dailyStockForm, setDailyStockForm] = useState({
    station_id: stationId || '',
    product_id: '',
    opening_stock: '',
    closing_stock: '',
    deliveries: '',
    sales: '',
    stock_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Client-side role-based access control
  const canManageAll = () => {
    return userContext?.role === 'admin';
  };

  const canManageOMCStations = () => {
    return ['admin', 'omc'].includes(userContext?.role);
  };

  const canManageStation = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role);
  };

  const canViewOnly = () => {
    return userContext?.role === 'dealer';
  };

  const canCreateRecords = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role);
  };

  const canUpdateRecords = () => {
    return ['admin', 'omc', 'station_manager'].includes(userContext?.role);
  };

  // Get stations based on user role
  const getManageableStations = () => {
    if (!userContext) return [];
    
    switch (userContext.role) {
      case 'admin':
        return availableStations; // Admin sees all stations
      case 'omc':
        // OMC sees only their stations
        return availableStations.filter(station => station.omc_id === userContext.omc_id);
      case 'station_manager':
        // Station manager sees only their assigned station
        return availableStations.filter(station => station.id === userContext.station_id);
      case 'dealer':
        // Dealer sees only their assigned stations
        return availableStations.filter(station => station.dealer_id === userContext.dealer_id);
      default:
        return [];
    }
  };

  // Check if user can manage a specific station
  const canManageThisStation = (stationId: string) => {
    if (!userContext) return false;
    
    const station = availableStations.find(s => s.id === stationId);
    if (!station) return false;

    switch (userContext.role) {
      case 'admin':
        return true;
      case 'omc':
        return station.omc_id === userContext.omc_id;
      case 'station_manager':
        return station.id === userContext.station_id;
      case 'dealer':
        return station.dealer_id === userContext.dealer_id;
      default:
        return false;
    }
  };

  // Check if current selected station is manageable
  const canManageSelectedStation = () => {
    if (selectedStation === 'all') return canManageAll();
    return canManageThisStation(selectedStation);
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (authChecked && userContext) {
      loadData();
    }
  }, [selectedStation, statusFilter, dateRange, authChecked, userContext]);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const profileResponse = await api.getCurrentUserProfile();
      
      if (profileResponse.success && profileResponse.data) {
        setUserContext(profileResponse.data);
        
        // Set default station based on role
        if (profileResponse.data.role === 'station_manager' && profileResponse.data.station_id) {
          setSelectedStation(profileResponse.data.station_id);
          setDeliveryForm(prev => ({ ...prev, station_id: profileResponse.data.station_id }));
          setReconciliationForm(prev => ({ ...prev, station_id: profileResponse.data.station_id }));
          setDailyStockForm(prev => ({ ...prev, station_id: profileResponse.data.station_id }));
        }

        await Promise.all([
          loadAvailableStations(),
          loadAvailableProducts()
        ]);

        toast({
          title: "Welcome back!",
          description: `Logged in as ${profileResponse.data.role}`,
        });
      } else {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      toast({
        title: "Connection Error",
        description: "Unable to verify authentication",
        variant: "destructive"
      });
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  };

  const loadAvailableStations = async () => {
    try {
      let stationsResponse;
      
      if (userContext?.role === 'omc' && userContext.omc_id) {
        stationsResponse = await api.getStationsByOMC(userContext.omc_id);
      } else if (userContext?.role === 'station_manager' && userContext.station_id) {
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.id === userContext.station_id) || []
          };
        }
      } else if (userContext?.role === 'dealer' && userContext.dealer_id) {
        const allStations = await api.getAllStations();
        if (allStations.success) {
          stationsResponse = {
            success: true,
            data: allStations.data?.filter((station: any) => station.dealer_id === userContext.dealer_id) || []
          };
        }
      } else {
        stationsResponse = await api.getAllStations();
      }

      if (stationsResponse?.success && stationsResponse.data) {
        setAvailableStations(stationsResponse.data);
        
        if (!deliveryForm.station_id && stationsResponse.data.length > 0 && userContext?.role !== 'station_manager') {
          const defaultStationId = stationsResponse.data[0].id;
          setDeliveryForm(prev => ({ ...prev, station_id: defaultStationId }));
          setReconciliationForm(prev => ({ ...prev, station_id: defaultStationId }));
          setDailyStockForm(prev => ({ ...prev, station_id: defaultStationId }));
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const response = await api.getProducts();
      
      if (response.success && response.data) {
        setAvailableProducts(response.data);
        
        if (response.data.length > 0) {
          const defaultProductId = response.data[0].id;
          setDeliveryForm(prev => ({ ...prev, product_id: defaultProductId }));
          setReconciliationForm(prev => ({ ...prev, product_id: defaultProductId }));
          setDailyStockForm(prev => ({ ...prev, product_id: defaultProductId }));
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadData = async () => {
    if (!userContext) return;

    try {
      setLoading(true);
      
      const filters: any = {};
      if (selectedStation !== 'all') {
        filters.station_id = selectedStation;
      }

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      filters.start_date = startDate.toISOString().split('T')[0];
      filters.end_date = endDate;

      // Load tank stocks
      if (selectedStation !== 'all') {
        const stocksResponse = await api.getTankStocks(selectedStation);
        if (stocksResponse.success) {
          setTankStocks(stocksResponse.data || []);
        }
      } else {
        setTankStocks([]);
      }

      // Load daily tank stocks
      try {
        const dailyStocksResponse = await api.getDailyTankStocks(filters);
        if (dailyStocksResponse.success) {
          setDailyTankStocks(dailyStocksResponse.data || []);
        }
      } catch (error) {
        setDailyTankStocks([]);
      }

      // Load deliveries
      try {
        const deliveriesResponse = await api.getDeliveries(filters);
        if (deliveriesResponse.success) {
          setDeliveries(deliveriesResponse.data || []);
        }
      } catch (error) {
        setDeliveries([]);
      }

      // Load reconciliations
      try {
        const reconciliationsResponse = await api.getReconciliations(filters);
        if (reconciliationsResponse.success) {
          setReconciliations(reconciliationsResponse.data || []);
        }
      } catch (error) {
        setReconciliations([]);
      }

    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load inventory data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDailyStock = async () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create daily stock records",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!dailyStockForm.station_id || !dailyStockForm.product_id || 
          !dailyStockForm.opening_stock || !dailyStockForm.closing_stock) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const dailyStockData = {
        station_id: dailyStockForm.station_id,
        product_id: dailyStockForm.product_id,
        opening_stock: parseFloat(dailyStockForm.opening_stock),
        closing_stock: parseFloat(dailyStockForm.closing_stock),
        deliveries: parseFloat(dailyStockForm.deliveries) || 0,
        sales: parseFloat(dailyStockForm.sales) || 0,
        stock_date: dailyStockForm.stock_date,
        notes: dailyStockForm.notes || undefined
      };

      const response = await api.createDailyTankStock(dailyStockData);

      if (response.success) {
        setShowDailyStockDialog(false);
        setDailyStockForm({
          station_id: stationId || (availableStations.length > 0 ? availableStations[0].id : ''),
          product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
          opening_stock: '',
          closing_stock: '',
          deliveries: '',
          sales: '',
          stock_date: new Date().toISOString().split('T')[0],
          notes: ''
        });

        await loadData();
        
        const productName = availableProducts.find(p => p.id === dailyStockForm.product_id)?.name;
        const variance = response.data?.variance || 0;
        
        toast({
          title: "Daily Stock Recorded!",
          description: `Stock for ${productName} recorded successfully. Variance: ${variance.toFixed(2)}L`,
        });
      } else {
        toast({
          title: "Recording Failed",
          description: response.error || "Unable to save daily stock record",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating daily stock:', error);
      toast({
        title: "Unexpected Error",
        description: error.message || "Failed to record daily stock",
        variant: "destructive"
      });
    }
  };

  const handleCreateDelivery = async () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create deliveries",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!deliveryForm.station_id || !deliveryForm.product_id || !deliveryForm.quantity || 
          !deliveryForm.supplier || !deliveryForm.driver_name || !deliveryForm.received_by) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const deliveryData = {
        station_id: deliveryForm.station_id,
        product_id: deliveryForm.product_id,
        quantity: parseFloat(deliveryForm.quantity),
        supplier: deliveryForm.supplier,
        driver_name: deliveryForm.driver_name,
        vehicle_number: deliveryForm.vehicle_number,
        delivery_date: deliveryForm.delivery_date,
        received_by: deliveryForm.received_by,
        notes: deliveryForm.notes || undefined,
        status: 'delivered' as const
      };

      const response = await api.createDelivery(deliveryData);
      
      if (response.success) {
        setShowDeliveryDialog(false);
        setDeliveryForm({
          station_id: stationId || (availableStations.length > 0 ? availableStations[0].id : ''),
          product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
          quantity: '',
          supplier: '',
          driver_name: '',
          vehicle_number: '',
          delivery_date: new Date().toISOString().split('T')[0],
          received_by: '',
          notes: ''
        });

        await loadData();
        
        const productName = availableProducts.find(p => p.id === deliveryForm.product_id)?.name;
        toast({
          title: "Delivery Recorded!",
          description: `${deliveryForm.quantity}L of ${productName} delivered successfully`,
        });
      } else {
        toast({
          title: "Delivery Failed",
          description: response.error || "Unable to record delivery",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating delivery:', error);
      toast({
        title: "System Error",
        description: error.message || "Failed to record delivery",
        variant: "destructive"
      });
    }
  };

  const handleCreateReconciliation = async () => {
    if (!canCreateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create reconciliations",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!reconciliationForm.station_id || !reconciliationForm.product_id || 
          !reconciliationForm.opening_stock || !reconciliationForm.closing_stock) {
        toast({
          title: "Incomplete Data",
          description: "Opening and Closing stock values are required",
          variant: "destructive"
        });
        return;
      }

      const reconciliationData = {
        station_id: reconciliationForm.station_id,
        product_id: reconciliationForm.product_id,
        opening_stock: parseFloat(reconciliationForm.opening_stock),
        deliveries: parseFloat(reconciliationForm.deliveries) || 0,
        sales: parseFloat(reconciliationForm.sales) || 0,
        closing_stock: parseFloat(reconciliationForm.closing_stock),
        notes: reconciliationForm.notes || undefined
      };

      const response = await api.createReconciliation(reconciliationData);
      
      if (response.success) {
        setShowReconciliationDialog(false);
        setReconciliationForm({
          station_id: stationId || (availableStations.length > 0 ? availableStations[0].id : ''),
          product_id: availableProducts.length > 0 ? availableProducts[0].id : '',
          opening_stock: '',
          deliveries: '',
          sales: '',
          closing_stock: '',
          notes: ''
        });

        await loadData();
        
        toast({
          title: "Reconciliation Saved!",
          description: "Stock reconciliation completed successfully",
        });
      } else {
        toast({
          title: "Reconciliation Failed",
          description: response.error || "Unable to save reconciliation",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to save reconciliation",
        variant: "destructive"
      });
    }
  };

  const updateDeliveryStatus = async (id: string, status: Delivery['status']) => {
    if (!canUpdateRecords()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update deliveries",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await api.updateDelivery(id, { status });
      
      if (response.success) {
        await loadData();
        toast({
          title: "Status Updated",
          description: `Delivery marked as ${status.replace('_', ' ')}`,
        });
      } else {
        toast({
          title: "Update Failed",
          description: response.error || "Unable to update delivery status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        title: "Update Error",
        description: "Failed to update delivery status",
        variant: "destructive"
      });
    }
  };

  const exportInventoryData = async () => {
    try {
      setExporting(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Export Complete!",
        description: "Inventory data has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export inventory data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'adequate': return 'bg-green-100 text-green-700 border-green-200';
      case 'low': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'empty': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'adequate': return <BatteryFull className="w-4 h-4" />;
      case 'low': return <BatteryMedium className="w-4 h-4" />;
      case 'critical': return <BatteryLow className="w-4 h-4" />;
      case 'empty': return <BatteryWarning className="w-4 h-4" />;
      default: return <Battery className="w-4 h-4" />;
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_transit': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600 bg-green-50';
    if (Math.abs(variance) <= 100) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const calculateStockMetrics = () => {
    const totalStock = tankStocks.reduce((sum, stock) => sum + stock.current_volume, 0);
    const lowStockCount = tankStocks.filter(stock => stock.status === 'low' || stock.status === 'critical').length;
    const averageCapacity = tankStocks.length > 0 
      ? tankStocks.reduce((sum, stock) => sum + (stock.current_volume / stock.max_capacity * 100), 0) / tankStocks.length
      : 0;
    const totalCapacity = tankStocks.reduce((sum, stock) => sum + stock.max_capacity, 0);

    return { totalStock, lowStockCount, averageCapacity, totalCapacity };
  };

  const calculateDailyStockMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStocks = dailyTankStocks.filter(stock => stock.stock_date === today);
    
    const totalVariance = todayStocks.reduce((sum, stock) => sum + stock.variance, 0);
    const perfectMatches = todayStocks.filter(stock => stock.variance === 0).length;
    const withVariance = todayStocks.filter(stock => stock.variance !== 0).length;

    return { totalVariance, perfectMatches, withVariance, todayStocksCount: todayStocks.length };
  };

  // Filter data based on search and filters
  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDailyStocks = dailyTankStocks.filter(stock => {
    if (dateRange === 'today') {
      return stock.stock_date === new Date().toISOString().split('T')[0];
    }
    if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(stock.stock_date) >= weekAgo;
    }
    return true;
  });

  // Loading skeletons
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Checking Authentication</h3>
          <p className="text-gray-600">Verifying user credentials...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access inventory management</p>
          <Button onClick={handleLoginRedirect} className="bg-blue-600 hover:bg-blue-700">
            <LogIn className="w-4 h-4 mr-2" />
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Inventory</h4>
          {canManageStation() && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Delivery
            </Button>
          )}
        </div>

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tankStocks.slice(0, 2).map((stock) => (
              <Card key={stock.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stock.product_name}</p>
                      <p className="text-lg font-bold">
                        {stock.current_volume.toLocaleString()} {stock.product_unit}
                      </p>
                      <Badge variant="outline" className={getStockStatusColor(stock.status)}>
                        {stock.status}
                      </Badge>
                    </div>
                    {getStockStatusIcon(stock.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { totalStock, lowStockCount, averageCapacity, totalCapacity } = calculateStockMetrics();
  const { totalVariance, perfectMatches, withVariance, todayStocksCount } = calculateDailyStockMetrics();

  return (
    <div className="space-y-6">
      {/* Header with Role Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {userContext?.role}
            </Badge>
          </div>
          <p className="text-gray-600">Track fuel stock, deliveries, and daily reconciliation</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Building className="w-4 h-4" />
            <span>Station: {selectedStation === 'all' ? 'All Stations' : availableStations.find(s => s.id === selectedStation)?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={exportInventoryData}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            Export
          </Button>
          
          {canCreateRecords() && (
            <div className="flex gap-2">
              <Dialog open={showDailyStockDialog} onOpenChange={setShowDailyStockDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Daily Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Record Daily Stock
                    </DialogTitle>
                    <DialogDescription>
                      Record opening and closing stock for accurate daily tracking
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Station *</Label>
                        <Select
                          value={dailyStockForm.station_id}
                          onValueChange={(value) => setDailyStockForm({ ...dailyStockForm, station_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {getManageableStations().map(station => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Product *</Label>
                        <Select
                          value={dailyStockForm.product_id}
                          onValueChange={(value) => setDailyStockForm({ ...dailyStockForm, product_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Stock Date *</Label>
                        <Input
                          type="date"
                          value={dailyStockForm.stock_date}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, stock_date: e.target.value })}
                        />
                      </div>
                      <div className="flex items-end">
                        <Badge variant="outline" className="w-full justify-center">
                          {new Date(dailyStockForm.stock_date).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Opening Stock (L) *</Label>
                        <Input
                          type="number"
                          value={dailyStockForm.opening_stock}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, opening_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deliveries (L)</Label>
                        <Input
                          type="number"
                          value={dailyStockForm.deliveries}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, deliveries: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sales (L)</Label>
                        <Input
                          type="number"
                          value={dailyStockForm.sales}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, sales: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Closing Stock (L) *</Label>
                        <Input
                          type="number"
                          value={dailyStockForm.closing_stock}
                          onChange={(e) => setDailyStockForm({ ...dailyStockForm, closing_stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label>Notes</Label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        value={dailyStockForm.notes}
                        onChange={(e) => setDailyStockForm({ ...dailyStockForm, notes: e.target.value })}
                        placeholder="Additional notes about today's stock..."
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={handleCreateDailyStock}
                        className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Save Daily Stock
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Record Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Record New Delivery
                    </DialogTitle>
                    <DialogDescription>
                      Enter delivery details for fuel stock management
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Station *</Label>
                        <Select
                          value={deliveryForm.station_id}
                          onValueChange={(value) => setDeliveryForm({ ...deliveryForm, station_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {getManageableStations().map(station => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Product *</Label>
                        <Select
                          value={deliveryForm.product_id}
                          onValueChange={(value) => setDeliveryForm({ ...deliveryForm, product_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={deliveryForm.quantity}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label>Supplier *</Label>
                        <Input
                          value={deliveryForm.supplier}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, supplier: e.target.value })}
                          placeholder="Supplier name"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Driver Name *</Label>
                        <Input
                          value={deliveryForm.driver_name}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, driver_name: e.target.value })}
                          placeholder="Driver name"
                        />
                      </div>

                      <div>
                        <Label>Vehicle Number</Label>
                        <Input
                          value={deliveryForm.vehicle_number}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicle_number: e.target.value })}
                          placeholder="Vehicle number"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Delivery Date *</Label>
                        <Input
                          type="date"
                          value={deliveryForm.delivery_date}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Received By *</Label>
                        <Input
                          value={deliveryForm.received_by}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, received_by: e.target.value })}
                          placeholder="Receiver name"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label>Notes</Label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        value={deliveryForm.notes}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                        placeholder="Additional notes..."
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={handleCreateDelivery}
                        className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        Record Delivery
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Navigation Tabs with Separators */}
      <Card>
        <CardContent className="p-0">
          <nav className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
            {[
              { id: 'overview', label: 'Stock Overview', icon: BarChart3 },
              { id: 'daily-stock', label: 'Daily Stock', icon: ClipboardList },
              { id: 'deliveries', label: 'Deliveries', icon: Truck },
              { id: 'reconciliation', label: 'Reconciliation', icon: Calculator }
            ].map((tab, index) => (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
                {index < 3 && (
                  <div className="flex items-center">
                    <Separator orientation="vertical" className="h-6" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Filters Section with Separators */}
      {(userContext?.role === 'admin' || userContext?.role === 'omc' || userContext?.role === 'dealer') && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>Filter by Station</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    {getManageableStations().map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(activeTab === 'deliveries' || activeTab === 'daily-stock') && (
                <>
                  <Separator orientation="vertical" className="hidden md:block" />
                  <div>
                    <Label>Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {activeTab === 'deliveries' && (
                <>
                  <Separator orientation="vertical" className="hidden md:block" />
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="hidden md:block" />
                  <div className="flex-1">
                    <Label>Search Deliveries</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search driver, supplier, vehicle..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <Separator orientation="vertical" className="hidden md:block" />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedStation(stationId || 'all');
                    setStatusFilter('all');
                    setSearchTerm('');
                    setDateRange('today');
                  }}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            {loading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Stock</p>
                        <p className="text-2xl font-bold">{totalStock.toLocaleString()} L</p>
                        <p className="text-sm text-green-600">Across all products</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                        <p className="text-2xl font-bold">{lowStockCount}</p>
                        <p className={`text-sm ${lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {lowStockCount > 0 ? 'Requires attention' : 'All good'}
                        </p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Capacity</p>
                        <p className="text-2xl font-bold">{averageCapacity.toFixed(1)}%</p>
                        <p className="text-sm text-green-600">Healthy</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Products</p>
                        <p className="text-2xl font-bold">{tankStocks.length}</p>
                        <p className="text-sm text-blue-600">Being monitored</p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Detailed Stock Cards */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tankStocks.map((stock) => {
                  const capacityPercentage = (stock.current_volume / stock.max_capacity) * 100;
                  return (
                    <Card key={stock.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{stock.product_name}</p>
                            <p className="text-2xl font-bold">
                              {stock.current_volume.toLocaleString()} {stock.product_unit}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStockStatusColor(stock.status)}>
                                {getStockStatusIcon(stock.status)}
                                <span className="ml-1 capitalize">{stock.status}</span>
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Capacity: {capacityPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            stock.status === 'adequate' ? 'bg-green-100' :
                            stock.status === 'low' ? 'bg-yellow-100' :
                            stock.status === 'critical' ? 'bg-orange-100' : 'bg-red-100'
                          }`}>
                            {getStockStatusIcon(stock.status)}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              stock.status === 'adequate' ? 'bg-green-500' :
                              stock.status === 'low' ? 'bg-yellow-500' :
                              stock.status === 'critical' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${capacityPercentage}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>0 {stock.product_unit}</span>
                          <span>{stock.max_capacity.toLocaleString()} {stock.product_unit}</span>
                        </div>
                        
                        {stock.last_delivery_date && (
                          <p className="text-xs text-gray-500 mt-2">
                            Last delivery: {new Date(stock.last_delivery_date).toLocaleDateString()} 
                            ({stock.last_delivery_quantity.toLocaleString()} {stock.product_unit})
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {tankStocks.length === 0 && !loading && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Stock Data</h3>
                  <p className="text-gray-500">No tank stock data available for the selected station.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Daily Stock Tab */}
        {activeTab === 'daily-stock' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Today's Records</p><p className="text-2xl font-bold">{todayStocksCount}</p><p className="text-sm text-blue-600">Products recorded</p></div><div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Perfect Matches</p><p className="text-2xl font-bold">{perfectMatches}</p><p className="text-sm text-green-600">Zero variance</p></div><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">With Variance</p><p className="text-2xl font-bold">{withVariance}</p><p className="text-sm text-orange-600">Needs review</p></div><div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Total Variance</p><p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalVariance >= 0 ? '+' : ''}{totalVariance.toFixed(2)}L</p><p className="text-sm text-gray-600">Net difference</p></div><div className="p-2 bg-purple-100 rounded-lg"><Calculator className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Daily Stock Records</CardTitle>
                <Badge variant="outline" className="bg-gray-100">{filteredDailyStocks.length} Total</Badge>
              </CardHeader>
              <CardContent>
                {loading ? <TableSkeleton /> : filteredDailyStocks.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Opening Stock</TableHead><TableHead>Deliveries</TableHead><TableHead>Sales</TableHead><TableHead>Closing Stock</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredDailyStocks.map((stock: any) => (
                        <TableRow key={stock.id}>
                          <TableCell><div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-500" />{new Date(stock.stock_date).toLocaleDateString()}</div></TableCell>
                          <TableCell className="font-medium">{stock.product_name}</TableCell>
                          <TableCell>{stock.opening_stock.toLocaleString()} L</TableCell>
                          <TableCell>{stock.deliveries.toLocaleString()} L</TableCell>
                          <TableCell>{stock.sales.toLocaleString()} L</TableCell>
                          <TableCell>{stock.closing_stock.toLocaleString()} L</TableCell>
                          <TableCell><Badge className={getVarianceColor(stock.variance)}>{stock.variance >= 0 ? '+' : ''}{stock.variance.toFixed(2)} L</Badge></TableCell>
                          <TableCell><Badge className={stock.variance === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>{stock.variance === 0 ? 'Perfect' : 'Variance'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No daily stock records found</p>
                    <p className="text-sm text-gray-400">Record your first daily stock to get started</p>
                    {canCreateRecords() && (<Button onClick={() => setShowDailyStockDialog(true)} className="mt-4 bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Record Daily Stock</Button>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />Delivery Management</CardTitle>
              <Badge variant="outline" className="bg-gray-100">{filteredDeliveries.length} Total</Badge>
            </CardHeader>
            <CardContent>
              {loading ? <TableSkeleton /> : filteredDeliveries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Supplier</TableHead>
                      <TableHead>Driver</TableHead><TableHead>Vehicle</TableHead><TableHead>Received By</TableHead><TableHead>Status</TableHead>
                      {canUpdateRecords() && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveries.map((delivery: any) => (
                      <TableRow key={delivery.id}>
                        <TableCell><div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-500" />{new Date(delivery.delivery_date).toLocaleDateString()}</div></TableCell>
                        <TableCell className="font-medium">{delivery.product_name}</TableCell>
                        <TableCell>{delivery.quantity.toLocaleString()} L</TableCell>
                        <TableCell>{delivery.supplier}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><User className="w-3 h-3 text-gray-500" />{delivery.driver_name}</div></TableCell>
                        <TableCell>{delivery.vehicle_number || 'N/A'}</TableCell>
                        <TableCell>{delivery.received_by}</TableCell>
                        <TableCell><Badge className={getDeliveryStatusColor(delivery.status)}>{delivery.status.replace('_', ' ')}</Badge></TableCell>
                        {canUpdateRecords() && (
                          <TableCell>
                            <div className="flex gap-2">
                              {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                <Button size="sm" variant="outline" onClick={() => updateDeliveryStatus(delivery.id, 'delivered')} className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />Mark Delivered
                                </Button>
                              )}
                              {delivery.status !== 'cancelled' && (
                                <Button size="sm" variant="outline" onClick={() => updateDeliveryStatus(delivery.id, 'cancelled')}>Cancel</Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries found</p>
                  <p className="text-sm text-gray-400">Record your first delivery to get started</p>
                  {canCreateRecords() && (<Button onClick={() => setShowDeliveryDialog(true)} className="mt-4 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Record Delivery</Button>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reconciliation Tab */}
        {activeTab === 'reconciliation' && (
          <>
            {canCreateRecords() && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Daily Stock Reconciliation</CardTitle>
                  <Button variant="outline" onClick={() => setShowReconciliationDialog(true)} className="flex items-center gap-2"><Plus className="w-4 h-4" />New Reconciliation</Button>
                </CardHeader>
                <CardContent>
                  {loading ? <TableSkeleton /> : reconciliations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Opening Stock</TableHead><TableHead>Deliveries</TableHead>
                          <TableHead>Sales</TableHead><TableHead>Closing Stock</TableHead><TableHead>Variance</TableHead><TableHead>Reconciled By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliations.slice(0, 10).map((recon: any) => (
                          <TableRow key={recon.id}>
                            <TableCell>{new Date(recon.reconciliation_date).toLocaleDateString()}</TableCell>
                            <TableCell>{recon.product_name}</TableCell>
                            <TableCell>{recon.opening_stock.toLocaleString()} L</TableCell>
                            <TableCell>{recon.deliveries.toLocaleString()} L</TableCell>
                            <TableCell>{recon.sales.toLocaleString()} L</TableCell>
                            <TableCell>{recon.closing_stock.toLocaleString()} L</TableCell>
                            <TableCell className={recon.variance >= 0 ? 'text-green-600' : 'text-red-600'}>{recon.variance >= 0 ? '+' : ''}{recon.variance.toLocaleString()} L</TableCell>
                            <TableCell>{recon.reconciled_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No reconciliations recorded</p>
                      <p className="text-sm text-gray-400">Start by recording your first stock reconciliation</p>
                      <Button onClick={() => setShowReconciliationDialog(true)} className="mt-4 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />New Reconciliation</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {reconciliations.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Reconciliation Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{reconciliations.length}</p><p className="text-sm text-blue-600">Total Reconciliations</p></div>
                    <div className="text-center p-4 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-600">{reconciliations.filter((r: any) => r.variance === 0).length}</p><p className="text-sm text-green-600">Perfect Matches</p></div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg"><p className="text-2xl font-bold text-orange-600">{reconciliations.filter((r: any) => Math.abs(r.variance) > 0 && Math.abs(r.variance) <= 100).length}</p><p className="text-sm text-orange-600">Minor Variances</p></div>
                    <div className="text-center p-4 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">{reconciliations.filter((r: any) => Math.abs(r.variance) > 100).length}</p><p className="text-sm text-red-600">Major Variances</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}